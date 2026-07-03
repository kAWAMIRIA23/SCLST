/**
 * Driver Routes — mobile driver API wiring.
 *
 * POST /onboarding is public; all other routes require requireDriver JWT.
 * Mounted at /api/driver in app.ts.
 *
 * @module routes/driver.routes
 */

import { Router } from 'express'
import {
  acceptBooking,
  completeBooking,
  getProfile,
  onboarding,
  simulateDispatch,
  toggleStatus,
} from '../controllers/driver.controller.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { requireDriver } from '../middlewares/requireDriver.js'

const router = Router()

// Registration / re-login by phone — no token yet
router.post('/onboarding', asyncHandler(onboarding))

router.use(requireDriver)

router.get('/me', asyncHandler(getProfile))
router.patch('/status', asyncHandler(toggleStatus))
router.patch('/bookings/:id/accept', asyncHandler(acceptBooking))
router.patch('/bookings/:id/complete', asyncHandler(completeBooking))
router.post('/dispatch/simulate', asyncHandler(simulateDispatch))

export default router
