/**
 * Dispatch Gateway — real-time booking offer delivery and tier-based matching.
 *
 * Responsibility: pushes booking offers to connected driver WebSocket clients and
 * selects the oldest eligible REQUESTED booking when a driver goes online. Matching
 * filters by payload_weight_tonnes against the vehicle's min/max capacity — not GPS
 * proximity (spatial routing is a future enhancement).
 *
 * Architecture: webSockets layer → telemetry.gateway (connection registry, broadcast).
 * Called by driver.service (go-online) and dispatch.service (demo push).
 *
 * @module webSockets/dispatch.gateway
 */

import { query } from '../config/database.js'
import type { BookingOffer } from '../models/booking.model.js'
import { broadcast, getDriverConnections } from './telemetry.gateway.js'

export type BookingOfferPayload = BookingOffer

/**
 * Delivers a booking offer to a specific driver's open WebSocket sessions.
 * Falls back to global broadcast when the driver has no active connection
 * (e.g. admin demo viewing all telemetry clients).
 *
 * @param driverId - Target driver UUID from query param or JWT.
 * @param offer - Serialized booking offer payload.
 */
export function dispatchOfferToDriver(
  driverId: string,
  offer: BookingOfferPayload,
): void {
  const connections = getDriverConnections(driverId)
  const message = JSON.stringify(offer)

  if (connections && connections.size > 0) {
    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message)
      }
    }
    return
  }

  broadcast(offer as unknown as Record<string, unknown>)
}

/**
 * Finds the oldest unassigned booking whose cargo weight fits the driver's vehicle
 * tier and pushes it over WebSocket. Invoked when a driver toggles is_online = true.
 *
 * @param driverId - Driver who just came online.
 */
export async function dispatchPendingBookingsForDriver(driverId: string): Promise<void> {
  const result = await query<{
    id: string
    pickup_address: string
    dropoff_address: string
    cargo_type: string
    payload_weight_tonnes: string
    final_fare_ugx: string | null
    calculated_distance_km: string | null
  }>(
    `SELECT b.id, b.pickup_address, b.dropoff_address, b.cargo_type,
            b.payload_weight_tonnes, b.final_fare_ugx, b.calculated_distance_km
     FROM bookings b
     JOIN vehicles v ON v.driver_id = $1
     WHERE b.trip_status = 'REQUESTED'
       AND b.driver_id IS NULL
       AND b.payload_weight_tonnes <= v.max_weight_tonnes
       AND b.payload_weight_tonnes >= v.min_weight_tonnes
     ORDER BY b.requested_at ASC
     LIMIT 1`,
    [driverId],
  )

  const booking = result.rows[0]
  if (!booking) return

  dispatchOfferToDriver(driverId, {
    booking_id: booking.id,
    pickup_address: booking.pickup_address,
    dropoff_address: booking.dropoff_address,
    cargo_type: booking.cargo_type,
    payload_weight_tonnes: Number(booking.payload_weight_tonnes),
    fare_ugx: Number(booking.final_fare_ugx ?? 0),
    distance_km: Number(booking.calculated_distance_km ?? 0),
  })
}
