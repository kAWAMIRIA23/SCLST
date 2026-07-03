/**
 * requireAdmin — JWT role gate for Admin Console API routes.
 *
 * Responsibility: intercepts Authorization: Bearer tokens, verifies signature and
 * expiry, enforces role === ADMIN, and attaches decoded claims to req.admin for
 * downstream handlers. Responds directly with 401/403 on failure (does not call next).
 *
 * Architecture: middlewares layer → config/env (JWT_SECRET), models/user (JwtPayload).
 *
 * @module middlewares/requireAdmin
 */

import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import type { AuthenticatedRequest } from '../models/api.model.js'
import type { JwtPayload } from '../models/user.model.js'

/**
 * Express middleware — must be applied before admin controller handlers.
 *
 * @throws Never — errors are converted to JSON responses; unexpected errors pass to next().
 */
export function requireAdmin(
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
    const decoded = jwt.verify(token, secret) as JwtPayload

    if (decoded.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' })
      return
    }

    ;(req as AuthenticatedRequest).admin = decoded
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
