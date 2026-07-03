/**
 * Global Error Handler — Express terminal middleware for uncaught exceptions.
 *
 * Responsibility: converts AppError (expected business failures) into JSON responses
 * with correct HTTP status codes. Hides internal error details in production.
 *
 * Architecture: middlewares layer — registered last in app.ts after all routes.
 *
 * @module middlewares/errorHandler
 */

import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../models/api.model.js'

/**
 * @param err - Thrown AppError from services/controllers, or unexpected Error.
 * @param req - Original request for logging context.
 * @param res - Response — always returns `{ success: false, error: string }`.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const timestamp = new Date().toISOString()
  const statusCode = err instanceof AppError ? err.statusCode : 500

  // Surface safe messages to clients; hide stack traces in production
  const message =
    err instanceof AppError
      ? err.message
      : process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message

  console.error(`[${timestamp}] ${req.method} ${req.path} — ${err.message}`)

  res.status(statusCode).json({
    success: false,
    error: message,
  })
}
