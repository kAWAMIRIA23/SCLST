/**
 * Admin Controller — HTTP adapter for dashboard, drivers, and bookings.
 *
 * Responsibility: parses query/path/body parameters, calls admin.service, and
 * serializes ApiResponse JSON. Protected by requireAdmin middleware at route level.
 *
 * Routes: /api/admin/* (see routes/admin.routes.ts).
 *
 * @module controllers/admin.controller
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import type { ApiResponse } from '../models/api.model.js'
import { AppError } from '../models/api.model.js'
import type { BookingRecord } from '../models/booking.model.js'
import type {
  DashboardStats,
  DriverProfile,
  PaginatedDriversResponse,
} from '../models/driver.model.js'
import { parsePagination, parseUuidParam } from '../middlewares/requestHelpers.js'
import {
  getBookings,
  getDashboardStats,
  getDrivers,
  getPendingDrivers,
  verifyDriver as verifyDriverService,
} from '../services/admin.service.js'

const verifyDriverSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

/** GET /api/admin/dashboard/stats */
export async function getDashboardStatsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  const stats = await getDashboardStats()
  const response: ApiResponse<DashboardStats> = { success: true, data: stats }
  res.json(response)
}

/** GET /api/admin/drivers/pending?page=&limit= */
export async function getPendingDriversHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { page, limit, offset } = parsePagination(req.query)
  const payload = await getPendingDrivers(page, limit, offset)

  const response: ApiResponse<PaginatedDriversResponse> = {
    success: true,
    data: payload,
  }
  res.json(response)
}

/** GET /api/admin/bookings */
export async function getBookingsHandler(_req: Request, res: Response): Promise<void> {
  const data = await getBookings()
  const response: ApiResponse<BookingRecord[]> = {
    success: true,
    data,
  }
  res.json(response)
}

/** GET /api/admin/drivers */
export async function getDriversHandler(_req: Request, res: Response): Promise<void> {
  const data = await getDrivers()
  const response: ApiResponse<DriverProfile[]> = {
    success: true,
    data,
  }
  res.json(response)
}

/**
 * PATCH /api/admin/drivers/:id/verify
 * @param req.params.id - Driver UUID.
 * @param req.body.status - APPROVED or REJECTED.
 */
export async function verifyDriver(req: Request, res: Response): Promise<void> {
  const driverId = parseUuidParam(req.params.id, 'driver ID')

  const parsed = verifyDriverSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid request body')
  }

  const data = await verifyDriverService(driverId, parsed.data.status)

  const response: ApiResponse<DriverProfile> = {
    success: true,
    data,
  }
  res.json(response)
}
