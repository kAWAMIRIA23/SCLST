/**
 * Auth Controller — HTTP adapter for admin authentication.
 *
 * Responsibility: validates login request body (Zod), delegates credential check
 * to auth.service, and returns a standardized ApiResponse envelope. No database
 * or JWT logic here.
 *
 * Route: POST /api/admin/auth/login (wired in routes/auth.routes.ts).
 *
 * @module controllers/auth.controller
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import type { ApiResponse } from '../models/api.model.js'
import { AppError } from '../models/api.model.js'
import type { LoginResponseData } from '../models/user.model.js'
import { loginAdmin } from '../services/auth.service.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

/**
 * @param req.body.email - Admin email address.
 * @param req.body.password - Plain-text password (min 8 characters).
 * @throws {AppError} 400 validation failure; 401/403 from auth.service.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new AppError(400, details)
  }

  const { email, password } = parsed.data
  const data = await loginAdmin(email, password)

  const response: ApiResponse<LoginResponseData> = {
    success: true,
    data,
  }

  res.json(response)
}
