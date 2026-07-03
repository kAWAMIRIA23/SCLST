/**
 * Driver Controller — HTTP adapter for driver mobile/API endpoints.
 *
 * Responsibility: validates driver-facing request payloads, extracts driverId from
 * JWT-attached request (via requireDriver middleware), and delegates to driver
 * and dispatch services. Onboarding is public; all other routes require a driver token.
 *
 * Routes: /api/driver/* (see routes/driver.routes.ts).
 *
 * @module controllers/driver.controller
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import type { ApiResponse, DriverAuthenticatedRequest } from '../models/api.model.js'
import { AppError } from '../models/api.model.js'
import type { BookingOffer } from '../models/booking.model.js'
import type { DriverProfileResponse } from '../models/driver.model.js'
import { parseUuidParam } from '../middlewares/requestHelpers.js'
import { createDemoBooking } from '../services/dispatch.service.js'
import {
  acceptBooking as acceptBookingService,
  completeBooking as completeBookingService,
  getDriverProfile,
  onboardDriver,
  toggleDriverStatus,
} from '../services/driver.service.js'

const onboardingSchema = z.object({
  phone: z.string().min(9).max(20),
  license_plate: z.string().min(3).max(20),
  tier_class: z.enum(['SMALL', 'MEDIUM', 'LARGE']),
})

const statusSchema = z.object({
  is_online: z.boolean(),
})

/**
 * POST /api/driver/onboarding — public registration or re-login by phone.
 * Returns 200 for returning drivers, 201 for newly created accounts.
 */
export async function onboarding(req: Request, res: Response): Promise<void> {
  const parsed = onboardingSchema.safeParse(req.body)

  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new AppError(400, details)
  }

  const { isExisting, ...data } = await onboardDriver(parsed.data)

  const response: ApiResponse<typeof data> = {
    success: true,
    data,
  }

  if (isExisting) {
    res.json(response)
    return
  }

  res.status(201).json(response)
}

/** GET /api/driver/me — requires driver JWT. */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const { driverId } = (req as DriverAuthenticatedRequest).driver
  const data = await getDriverProfile(driverId)

  const response: ApiResponse<DriverProfileResponse> = {
    success: true,
    data,
  }
  res.json(response)
}

/**
 * PATCH /api/driver/status — toggles availability; going online triggers dispatch.
 * @param req.body.is_online - Boolean availability flag.
 */
export async function toggleStatus(req: Request, res: Response): Promise<void> {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'is_online boolean is required')
  }

  const driverId = (req as DriverAuthenticatedRequest).driver.driverId
  const data = await toggleDriverStatus(driverId, parsed.data.is_online)

  const response: ApiResponse<DriverProfileResponse> = {
    success: true,
    data,
  }
  res.json(response)
}

/** PATCH /api/driver/bookings/:id/accept */
export async function acceptBooking(req: Request, res: Response): Promise<void> {
  const bookingId = parseUuidParam(req.params.id, 'booking ID')
  const driverId = (req as DriverAuthenticatedRequest).driver.driverId

  const data = await acceptBookingService(driverId, bookingId)

  const response: ApiResponse<BookingOffer> = {
    success: true,
    data,
  }
  res.json(response)
}

/** PATCH /api/driver/bookings/:id/complete */
export async function completeBooking(req: Request, res: Response): Promise<void> {
  const bookingId = parseUuidParam(req.params.id, 'booking ID')
  const driverId = (req as DriverAuthenticatedRequest).driver.driverId

  const data = await completeBookingService(driverId, bookingId)
  res.json({ success: true, data })
}

/** POST /api/driver/dispatch/simulate — creates and pushes a demo booking offer. */
export async function simulateDispatch(req: Request, res: Response): Promise<void> {
  const driverId = (req as DriverAuthenticatedRequest).driver.driverId
  const data = await createDemoBooking(driverId)

  res.status(201).json({ success: true, data })
}
