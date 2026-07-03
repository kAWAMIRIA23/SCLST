/**
 * requireDriver — JWT role gate for Driver API routes.
 *
 * Responsibility: verifies driver-issued JWTs (must include driverId claim),
 * attaches decoded payload to req.driver, and blocks non-DRIVER roles. Stricter
 * than requireAdmin because booking mutations require a valid driverId binding.
 *
 * Architecture: middlewares layer → config/env (JWT_SECRET).
 *
 * @module middlewares/requireDriver
 */

import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import type { DriverAuthenticatedRequest } from '../models/api.model.js'
import type { DriverJwtPayload } from '../models/user.model.js'

/**
 * Express middleware — applied after public routes (e.g. onboarding) on driver router.
 */
export function requireDriver(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  const token = authHeader.slice('Bearer '.length)
  const { JWT_SECRET: secret } = getEnv()

  try {
    const decoded = jwt.verify(token, secret) as DriverJwtPayload

    if (decoded.role !== 'DRIVER') {
      res.status(403).json({ success: false, error: 'Driver access required' })
      return
    }

    if (!decoded.driverId) {
      res.status(403).json({ success: false, error: 'Invalid driver token' })
      return
    }

    ;(req as DriverAuthenticatedRequest).driver = decoded
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' })
      return
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' })
      return
    }
    next(err)
  }
}
