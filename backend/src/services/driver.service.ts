/**
 * Driver Service — core business logic for driver lifecycle and booking actions.
 *
 * Responsibility: orchestrates driver onboarding, profile retrieval, online status,
 * and booking accept/complete workflows. All PostgreSQL access for the driver domain
 * lives here; controllers only validate HTTP input and shape responses.
 *
 * Architecture: services layer → config/database, constants/tierWeights, auth.service
 * (JWT), webSockets/dispatch.gateway (real-time offer push on go-online).
 *
 * @module services/driver.service
 */

import bcrypt from 'bcryptjs'
import { getEnv } from '../config/env.js'
import { query } from '../config/database.js'
import { TIER_WEIGHTS } from '../constants/tierWeights.js'
import { AppError } from '../models/api.model.js'
import type { BookingOffer, DriverBookingRow } from '../models/booking.model.js'
import { mapBookingOffer } from '../models/booking.model.js'
import type { TierClass } from '../models/enums.js'
import type { DriverProfileResponse, DriverStatsRow } from '../models/driver.model.js'
import { mapDriverStatsRow } from '../models/driver.model.js'
import { signDriverToken } from './auth.service.js'
import { dispatchPendingBookingsForDriver } from '../webSockets/dispatch.gateway.js'

/**
 * Loads a driver's operational profile with aggregated trip and earnings stats.
 *
 * @param driverId - UUID of the drivers row.
 * @returns Raw DB row joined across users, vehicles, and a lateral stats subquery.
 * @throws {AppError} 404 when no driver matches the ID.
 */
export async function fetchDriverStats(driverId: string): Promise<DriverStatsRow> {
  const result = await query<DriverStatsRow>(
    `SELECT
       d.id,
       u.name,
       u.phone_number AS phone,
       v.license_plate,
       v.tier_class,
       d.is_online,
       COALESCE(stats.completed_trips, 0)::text AS completed_trips,
       COALESCE(stats.total_km_driven, 0)::text AS total_km_driven,
       COALESCE(stats.gross_earnings_ugx, 0)::text AS gross_earnings_ugx
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     JOIN vehicles v ON v.driver_id = d.id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE b.trip_status = 'COMPLETED') AS completed_trips,
         COALESCE(SUM(b.calculated_distance_km) FILTER (WHERE b.trip_status = 'COMPLETED'), 0) AS total_km_driven,
         COALESCE(SUM(t.total_amount_gross_ugx) FILTER (WHERE b.trip_status = 'COMPLETED'), 0) AS gross_earnings_ugx
       FROM bookings b
       LEFT JOIN transaction_ledger t ON t.booking_id = b.id
       WHERE b.driver_id = d.id
     ) stats ON true
     WHERE d.id = $1`,
    [driverId],
  )

  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'Driver not found')
  }
  return row
}

/**
 * Returns the API-facing driver profile for an authenticated driver.
 *
 * @param driverId - UUID from the JWT driverId claim.
 * @returns Camel-cased profile with earnings and trip aggregates.
 */
export async function getDriverProfile(driverId: string): Promise<DriverProfileResponse> {
  const profile = await fetchDriverStats(driverId)
  return mapDriverStatsRow(profile)
}

export interface OnboardingInput {
  phone: string
  license_plate: string
  tier_class: TierClass
}

export interface OnboardingResult extends DriverProfileResponse {
  token: string
  expiresIn: string
  /** True when phone already registered — controller returns 200 instead of 201. */
  isExisting: boolean
}

/**
 * Registers a new driver or re-authenticates an existing one by phone number.
 *
 * New drivers: creates users + drivers + vehicles rows in a single flow. Vehicle
 * min/max weight tonnes are derived from tier_class via TIER_WEIGHTS so dispatch
 * matching can filter bookings by payload capacity.
 *
 * @param input - Phone, plate, and vehicle tier from the onboarding form.
 * @returns Profile, JWT, and isExisting flag for HTTP status selection.
 * @throws {AppError} 404 if an existing driver row lacks a linked user.
 * @throws {AppError} 500 if INSERT operations fail unexpectedly.
 */
export async function onboardDriver(input: OnboardingInput): Promise<OnboardingResult> {
  const { phone, license_plate, tier_class } = input
  const normalizedPlate = license_plate.trim().toUpperCase()
  const weights = TIER_WEIGHTS[tier_class]

  const existing = await query<{ driver_id: string }>(
    `SELECT d.id AS driver_id
     FROM users u
     JOIN drivers d ON d.user_id = u.id
     WHERE u.phone_number = $1`,
    [phone],
  )

  if (existing.rows[0]) {
    const driverId = existing.rows[0].driver_id
    const profile = await fetchDriverStats(driverId)
    const userResult = await query<{ user_id: string }>(
      `SELECT user_id FROM drivers WHERE id = $1`,
      [driverId],
    )
    const userId = userResult.rows[0]?.user_id
    if (!userId) {
      throw new AppError(404, 'Driver not found')
    }

    const { token, expiresIn } = signDriverToken(userId, driverId)
    return {
      ...mapDriverStatsRow(profile),
      token,
      expiresIn,
      isExisting: true,
    }
  }

  const { BCRYPT_SALT_ROUNDS: saltRounds } = getEnv()
  // Placeholder password — drivers authenticate via phone onboarding, not password login
  const passwordHash = await bcrypt.hash(`driver-${phone}-${Date.now()}`, saltRounds)
  const email = `driver+${phone.replace(/\D/g, '')}@slcts.ug`
  const permitNumber = `PERMIT-${phone.replace(/\D/g, '').slice(-8)}`

  const userInsert = await query<{ id: string }>(
    `INSERT INTO users (name, phone_number, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'DRIVER')
     RETURNING id`,
    [`SLCTS Driver`, phone, email, passwordHash],
  )

  const userId = userInsert.rows[0]?.id
  if (!userId) {
    throw new AppError(500, 'Failed to create driver account')
  }

  const driverInsert = await query<{ id: string }>(
    `INSERT INTO drivers (user_id, permit_number, verification_status, verified_at)
     VALUES ($1, $2, 'APPROVED', NOW())
     RETURNING id`,
    [userId, permitNumber],
  )

  const driverId = driverInsert.rows[0]?.id
  if (!driverId) {
    throw new AppError(500, 'Failed to create driver profile')
  }

  // Weight bounds on the vehicle row drive dispatch.gateway tier-matching queries
  await query(
    `INSERT INTO vehicles (driver_id, license_plate, tier_class, min_weight_tonnes, max_weight_tonnes)
     VALUES ($1, $2, $3, $4, $5)`,
    [driverId, normalizedPlate, tier_class, weights.min, weights.max],
  )

  const profile = await fetchDriverStats(driverId)
  const { token, expiresIn } = signDriverToken(userId, driverId)

  return {
    ...mapDriverStatsRow(profile),
    token,
    expiresIn,
    isExisting: false,
  }
}

/**
 * Updates driver availability and triggers dispatch for queued bookings when going online.
 *
 * @param driverId - Authenticated driver UUID.
 * @param isOnline - Desired availability flag.
 * @returns Updated profile after status change.
 */
export async function toggleDriverStatus(
  driverId: string,
  isOnline: boolean,
): Promise<DriverProfileResponse> {
  await query(
    `UPDATE drivers SET is_online = $1, updated_at = NOW() WHERE id = $2`,
    [isOnline, driverId],
  )

  // Push the oldest eligible REQUESTED booking to this driver's WebSocket clients
  if (isOnline) {
    await dispatchPendingBookingsForDriver(driverId)
  }

  const profile = await fetchDriverStats(driverId)
  return mapDriverStatsRow(profile)
}

/**
 * Atomically assigns a booking to the driver and transitions trip_status to ACCEPTED.
 *
 * @param driverId - Authenticated driver UUID.
 * @param bookingId - UUID of the booking to accept.
 * @returns Booking offer payload for client confirmation UI.
 * @throws {AppError} 404 booking not found.
 * @throws {AppError} 409 booking no longer in REQUESTED state.
 * @throws {AppError} 403 booking already assigned to another driver.
 */
export async function acceptBooking(
  driverId: string,
  bookingId: string,
): Promise<BookingOffer> {
  const bookingResult = await query<DriverBookingRow>(
    `SELECT id, pickup_address, dropoff_address, cargo_type, payload_weight_tonnes,
            final_fare_ugx, calculated_distance_km, trip_status, driver_id
     FROM bookings
     WHERE id = $1`,
    [bookingId],
  )

  const booking = bookingResult.rows[0]
  if (!booking) {
    throw new AppError(404, 'Booking not found')
  }

  if (booking.trip_status !== 'REQUESTED' && booking.driver_id !== driverId) {
    throw new AppError(409, 'Booking is no longer available')
  }

  if (booking.driver_id && booking.driver_id !== driverId) {
    throw new AppError(403, 'Booking assigned to another driver')
  }

  const updated = await query<DriverBookingRow>(
    `UPDATE bookings
     SET driver_id = $1, trip_status = 'ACCEPTED', updated_at = NOW()
     WHERE id = $2
     RETURNING id, pickup_address, dropoff_address, cargo_type, payload_weight_tonnes,
               final_fare_ugx, calculated_distance_km, trip_status, driver_id`,
    [driverId, bookingId],
  )

  const row = updated.rows[0]
  if (!row) {
    throw new AppError(500, 'Failed to accept booking')
  }

  return mapBookingOffer(row)
}

/**
 * Marks an in-progress booking as COMPLETED for settlement and ledger processing.
 *
 * @param driverId - Must match the booking's assigned driver.
 * @param bookingId - UUID of the active booking.
 * @returns Confirmation with booking_id and final trip_status.
 * @throws {AppError} 404 when no matching active booking exists for this driver.
 */
export async function completeBooking(
  driverId: string,
  bookingId: string,
): Promise<{ booking_id: string; trip_status: string }> {
  const updated = await query(
    `UPDATE bookings
     SET trip_status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND trip_status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED')
     RETURNING id`,
    [bookingId, driverId],
  )

  if (!updated.rows[0]) {
    throw new AppError(404, 'Active booking not found')
  }

  return { booking_id: bookingId, trip_status: 'COMPLETED' }
}
