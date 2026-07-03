/**
 * Dispatch Service — demo booking creation and tier-aware payload selection.
 *
 * Responsibility: creates synthetic REQUESTED bookings for driver-app testing and
 * immediately pushes the offer over WebSocket. Production dispatch matching logic
 * lives in webSockets/dispatch.gateway (weight-tier filter on go-online).
 *
 * Architecture: services layer → driver.service (profile), dispatch.gateway (push).
 *
 * @module services/dispatch.service
 */

import { query } from '../config/database.js'
import { AppError } from '../models/api.model.js'
import type { BookingOffer, DriverBookingRow } from '../models/booking.model.js'
import { mapBookingOffer } from '../models/booking.model.js'
import type { TierClass } from '../models/enums.js'
import { fetchDriverStats } from './driver.service.js'
import { dispatchOfferToDriver } from '../webSockets/dispatch.gateway.js'

/**
 * Inserts a demo booking and pushes it to the requesting driver's WebSocket channel.
 *
 * Uses a fixed Kampala → Entebbe route with hard-coded distance/fare for QA demos.
 * Payload weight is chosen to fall within the driver's vehicle tier capacity.
 *
 * @param driverId - Authenticated driver who triggered simulate dispatch.
 * @returns Booking offer sent to the client.
 * @throws {AppError} 500 when no admin user exists to act as customer_id, or INSERT fails.
 */
export async function createDemoBooking(driverId: string): Promise<BookingOffer> {
  const profile = await fetchDriverStats(driverId)

  const customerResult = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`,
  )
  const customerId = customerResult.rows[0]?.id

  if (!customerId) {
    throw new AppError(500, 'No customer account available for demo booking')
  }

  const payloadWeight = tierPayloadWeight(profile.tier_class)

  const bookingInsert = await query<DriverBookingRow>(
    `INSERT INTO bookings (
       customer_id, pickup_address, dropoff_address, cargo_type,
       payload_weight_tonnes, calculated_distance_km, final_fare_ugx, trip_status
     )
     VALUES ($1, $2, $3, 'GENERAL', $4, $5, $6, 'REQUESTED')
     RETURNING id, pickup_address, dropoff_address, cargo_type, payload_weight_tonnes,
               final_fare_ugx, calculated_distance_km, trip_status, driver_id`,
    [
      customerId,
      'Nakawa Industrial Area, Kampala',
      'Entebbe Airport Cargo Terminal',
      payloadWeight,
      42,
      450000,
    ],
  )

  const booking = bookingInsert.rows[0]
  if (!booking) {
    throw new AppError(500, 'Failed to create demo booking')
  }

  const offer = mapBookingOffer(booking)
  dispatchOfferToDriver(driverId, offer)
  return offer
}

/**
 * Picks a representative cargo weight (tonnes) that fits the driver's declared tier.
 * Values sit mid-range within TIER_WEIGHTS bounds so matching queries succeed.
 */
function tierPayloadWeight(tierClass: TierClass): number {
  switch (tierClass) {
    case 'SMALL':
      return 1.5
    case 'MEDIUM':
      return 5
    case 'LARGE':
      return 12
  }
}
