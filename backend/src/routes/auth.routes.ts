/**
 * Auth Routes — public admin login (no JWT required).
 *
 * Mounted at /api/admin/auth in app.ts. Only POST /login is exposed.
 *
 * @module routes/auth.routes
 */

import { Router } from 'express'
import { login } from '../controllers/auth.controller.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

const router = Router()

router.post('/login', asyncHandler(login))

export default router
