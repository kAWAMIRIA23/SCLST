/**
 * Booking Models — booking records, driver offer payloads, and row mappers.
 * @module models/booking.model
 */

import type { TripStatus } from './enums.js'

export interface BookingRecord {
  id: string
  shipper: string
  origin: string
  destination: string
  cargoType: string
  tripStatus: TripStatus
  finalFareUGX: number | null
  createdAt: string
}

export interface BookingRow {
  id: string
  shipper: string
  origin: string
  destination: string
  cargo_type: string
  trip_status: TripStatus
  final_fare_ugx: string | null
  created_at: Date
}

export interface DriverBookingRow {
  id: string
  pickup_address: string
  dropoff_address: string
  cargo_type: string
  payload_weight_tonnes: string
  final_fare_ugx: string | null
  calculated_distance_km: string | null
  trip_status: string
  driver_id: string | null
}

export interface BookingOffer {
  booking_id: string
  pickup_address: string
  dropoff_address: string
  cargo_type: string
  payload_weight_tonnes: number
  fare_ugx: number
  distance_km: number
}

export function mapBookingRow(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    shipper: row.shipper,
    origin: row.origin,
    destination: row.destination,
    cargoType: row.cargo_type,
    tripStatus: row.trip_status,
    finalFareUGX: row.final_fare_ugx != null ? Number(row.final_fare_ugx) : null,
    createdAt: row.created_at.toISOString(),
  }
}

export function mapBookingOffer(row: DriverBookingRow): BookingOffer {
  return {
    booking_id: row.id,
    pickup_address: row.pickup_address,
    dropoff_address: row.dropoff_address,
    cargo_type: row.cargo_type,
    payload_weight_tonnes: Number(row.payload_weight_tonnes),
    fare_ugx: Number(row.final_fare_ugx ?? 0),
    distance_km: Number(row.calculated_distance_km ?? 0),
  }
}
