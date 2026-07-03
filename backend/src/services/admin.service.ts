/**
 * Admin Service — dashboard metrics, driver verification, and booking listings.
 *
 * Responsibility: read/write operations for the Admin Console domain. Aggregates
 * revenue and transit KPIs via SQL CTEs, paginates pending driver verifications,
 * and enforces the PENDING → APPROVED|REJECTED state machine.
 *
 * Architecture: services layer → config/database, models (row mappers).
 * Called exclusively by admin.controller — no HTTP awareness.
 *
 * @module services/admin.service
 */

import { query } from '../config/database.js'
import { AppError } from '../models/api.model.js'
import type { BookingRecord, BookingRow } from '../models/booking.model.js'
import { mapBookingRow } from '../models/booking.model.js'
import type {
  DashboardStats,
  DashboardStatsRow,
  DriverProfile,
  DriverRow,
  PaginatedDriversResponse,
} from '../models/driver.model.js'
import { mapDriverRow } from '../models/driver.model.js'

const DRIVER_SELECT = `
  SELECT
    d.id,
    u.full_name,
    u.phone,
    d.license_plate,
    d.permit_number,
    d.tier_class,
    d.max_capacity_kg,
    d.verification_status,
    d.created_at
  FROM drivers d
  INNER JOIN users u ON u.id = d.user_id
`

/**
 * Computes real-time KPIs for the admin dashboard in a single round-trip.
 * Commission totals reflect the 15% platform rate stored on transaction_ledger.
 *
 * @returns Aggregated active transits, today's revenue/commission, pending verifications.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await query<DashboardStatsRow>(`
    WITH active_transits AS (
      SELECT COUNT(*)::int AS cnt
      FROM bookings
      WHERE trip_status = 'EN_ROUTE'
    ),
    today_gross AS (
      SELECT COALESCE(SUM(tl.total_amount_gross_ugx), 0)::numeric AS sum
      FROM transaction_ledger tl
      INNER JOIN bookings b ON b.id = tl.booking_id
      WHERE b.created_at::date = CURRENT_DATE
    ),
    today_commission AS (
      SELECT COALESCE(SUM(tl.platform_commission_ugx), 0)::numeric AS sum
      FROM transaction_ledger tl
      INNER JOIN bookings b ON b.id = tl.booking_id
      WHERE b.created_at::date = CURRENT_DATE
    ),
    pending_verifications AS (
      SELECT COUNT(*)::int AS cnt
      FROM drivers
      WHERE verification_status = 'PENDING'
    )
    SELECT
      at.cnt AS active_transits,
      tg.sum AS today_gross_revenue_ugx,
      tc.sum AS today_platform_commission_ugx,
      pv.cnt AS pending_driver_verifications
    FROM active_transits at, today_gross tg, today_commission tc, pending_verifications pv
  `)

  const row = result.rows[0]
  return {
    activeTransits: row.active_transits,
    todayGrossRevenueUGX: Number(row.today_gross_revenue_ugx),
    todayPlatformCommissionUGX: Number(row.today_platform_commission_ugx),
    pendingDriverVerifications: row.pending_driver_verifications,
  }
}

/**
 * @param page - 1-based page number from query string.
 * @param limit - Page size (capped by middleware parsePagination).
 * @param offset - SQL OFFSET derived from page and limit.
 */
export async function getPendingDrivers(
  page: number,
  limit: number,
  offset: number,
): Promise<PaginatedDriversResponse> {
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM drivers WHERE verification_status = 'PENDING'`,
  )
  const total = Number(countResult.rows[0].count)

  const dataResult = await query<DriverRow>(
    `${DRIVER_SELECT}
     WHERE d.verification_status = 'PENDING'
     ORDER BY d.created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )

  return {
    data: dataResult.rows.map(mapDriverRow),
    total,
    page,
    limit,
  }
}

/** Returns the 50 most recent bookings for admin oversight. */
export async function getBookings(): Promise<BookingRecord[]> {
  const result = await query<BookingRow>(
    `SELECT
       b.id,
       u.full_name AS shipper,
       b.origin,
       b.destination,
       b.cargo_type,
       b.trip_status,
       b.final_fare_ugx,
       b.created_at
     FROM bookings b
     INNER JOIN users u ON u.id = b.shipper_user_id
     ORDER BY b.created_at DESC
     LIMIT 50`,
  )

  return result.rows.map(mapBookingRow)
}

/** Lists all registered drivers ordered by onboarding date. */
export async function getDrivers(): Promise<DriverProfile[]> {
  const result = await query<DriverRow>(
    `${DRIVER_SELECT}
     ORDER BY d.created_at ASC`,
  )

  return result.rows.map(mapDriverRow)
}

/**
 * Transitions a driver from PENDING to APPROVED or REJECTED.
 *
 * @param driverId - UUID path parameter.
 * @param status - APPROVED sets verified_at; REJECTED leaves it unchanged.
 * @returns Updated driver profile.
 * @throws {AppError} 404 driver not found.
 * @throws {AppError} 409 driver already past PENDING state.
 */
export async function verifyDriver(
  driverId: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<DriverProfile> {
  const existing = await query<{ verification_status: string }>(
    `SELECT verification_status FROM drivers WHERE id = $1`,
    [driverId],
  )

  if (existing.rowCount === 0) {
    throw new AppError(404, 'Driver not found')
  }

  if (existing.rows[0].verification_status !== 'PENDING') {
    throw new AppError(409, 'Driver already verified')
  }

  await query(
    `UPDATE drivers
     SET verification_status = $2,
         verified_at = CASE WHEN $2 = 'APPROVED' THEN NOW() ELSE verified_at END
     WHERE id = $1`,
    [driverId, status],
  )

  const updated = await query<DriverRow>(
    `${DRIVER_SELECT} WHERE d.id = $1`,
    [driverId],
  )

  return mapDriverRow(updated.rows[0])
}
