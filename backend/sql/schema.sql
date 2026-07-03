-- SLCTS Production Schema
-- Run: psql -U postgres -d slcts -f backend/sql/schema.sql
-- Idempotent: safe to re-run on the same database.

BEGIN;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role_enum AS ENUM (
  'CUSTOMER',
  'DRIVER',
  'ADMIN'
) IF NOT EXISTS;

CREATE TYPE verification_status_enum AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
) IF NOT EXISTS;

CREATE TYPE vehicle_tier_enum AS ENUM (
  'SMALL',
  'MEDIUM',
  'LARGE'
) IF NOT EXISTS;

CREATE TYPE cargo_type_enum AS ENUM (
  'BULK',
  'GENERAL',
  'HEAVY_MACHINERY',
  'PERISHABLE',
  'HIGH_VALUE'
) IF NOT EXISTS;

CREATE TYPE trip_status_enum AS ENUM (
  'REQUESTED',
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'COMPLETED',
  'CANCELLED'
) IF NOT EXISTS;

CREATE TYPE escrow_state_enum AS ENUM (
  'HELD',
  'RELEASED',
  'REFUNDED'
) IF NOT EXISTS;

-- =============================================================================
-- TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permit_number VARCHAR(60) NOT NULL UNIQUE,
  verification_status verification_status_enum NOT NULL DEFAULT 'PENDING',
  verified_at TIMESTAMPTZ,
  gateway_subaccount_id VARCHAR(120),
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_drivers
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  tier_class vehicle_tier_enum NOT NULL,
  min_weight_tonnes NUMERIC(6,2) NOT NULL CHECK (min_weight_tonnes > 0),
  max_weight_tonnes NUMERIC(6,2) NOT NULL CHECK (max_weight_tonnes > 0),
  CONSTRAINT chk_weight_range CHECK (max_weight_tonnes > min_weight_tonnes),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_vehicles
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  cargo_type cargo_type_enum NOT NULL,
  payload_weight_tonnes NUMERIC(6,2) NOT NULL CHECK (payload_weight_tonnes > 0),
  calculated_distance_km NUMERIC(6,2) CHECK (calculated_distance_km > 0),
  final_fare_ugx NUMERIC(12,2) CHECK (final_fare_ugx > 0),
  trip_status trip_status_enum NOT NULL DEFAULT 'REQUESTED',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS transaction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  transaction_reference VARCHAR(80) NOT NULL UNIQUE,
  total_amount_gross_ugx NUMERIC(12,2) NOT NULL CHECK (total_amount_gross_ugx > 0),
  platform_commission_ugx NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(total_amount_gross_ugx * 0.15, 2)) STORED,
  driver_net_payout_ugx NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(total_amount_gross_ugx * 0.85, 2)) STORED,
  escrow_state escrow_state_enum NOT NULL DEFAULT 'HELD',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_commission_and_payout CHECK (
    ROUND(platform_commission_ugx + driver_net_payout_ugx, 2) = total_amount_gross_ugx
  )
);

CREATE OR REPLACE TRIGGER set_updated_at_transaction_ledger
  BEFORE UPDATE ON transaction_ledger
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_verification_status ON drivers(verification_status);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers(is_online);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tier_class ON vehicles(tier_class);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_status ON bookings(trip_status);
CREATE INDEX IF NOT EXISTS idx_bookings_cargo_type ON bookings(cargo_type);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_booking_id ON transaction_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_escrow_state ON transaction_ledger(escrow_state);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_created_at ON transaction_ledger(created_at DESC);

COMMIT;
