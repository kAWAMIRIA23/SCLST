/**
 * Ledger Routes — transaction list and escrow release endpoints.
 *
 * Separated from admin.routes for single-responsibility. Same /api/admin prefix
 * and requireAdmin guard. Handlers in ledger.controller.
 *
 * @module routes/ledger.routes
 */

import { Router } from 'express'
import {
  getTransactionsHandler,
  releaseEscrow,
} from '../controllers/ledger.controller.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { requireAdmin } from '../middlewares/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/transactions', asyncHandler(getTransactionsHandler))
router.patch('/transactions/:id/release-escrow', asyncHandler(releaseEscrow))

export default router
