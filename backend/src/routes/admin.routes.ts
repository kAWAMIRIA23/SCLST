/**
 * Admin Routes — thin wiring for Admin Console API (dashboard, drivers, bookings).
 *
 * All routes require requireAdmin JWT middleware. Handlers delegate to admin.controller.
 * Mounted at /api/admin in app.ts.
 *
 * @module routes/admin.routes
 */

import { Router } from 'express'
import {
  getBookingsHandler,
  getDashboardStatsHandler,
  getDriversHandler,
  getPendingDriversHandler,
  verifyDriver,
} from '../controllers/admin.controller.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { requireAdmin } from '../middlewares/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/dashboard/stats', asyncHandler(getDashboardStatsHandler))
router.get('/bookings', asyncHandler(getBookingsHandler))
router.get('/drivers', asyncHandler(getDriversHandler))
router.get('/drivers/pending', asyncHandler(getPendingDriversHandler))
router.patch('/drivers/:id/verify', asyncHandler(verifyDriver))

export default router
