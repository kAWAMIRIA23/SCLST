/**
 * API Models — shared HTTP response envelope and error types.
 *
 * ApiResponse<T> is the standard JSON shape for all endpoints.
 * AppError carries HTTP status codes thrown by services/controllers.
 * AuthenticatedRequest / DriverAuthenticatedRequest extend Express Request
 * after JWT middleware attaches decoded claims.
 *
 * @module models/api.model
 */

import type { Request } from 'express'
import type { DriverJwtPayload, JwtPayload } from './user.model.js'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export interface AuthenticatedRequest extends Request {
  admin: JwtPayload
}

export interface DriverAuthenticatedRequest extends Request {
  driver: DriverJwtPayload
}
