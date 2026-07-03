/**
 * Async Handler — wraps async Express handlers so rejected Promises reach errorHandler.
 *
 * Express 4 does not catch async throws automatically; this wrapper forwards
 * rejections to next(err) for centralized error handling.
 *
 * @module middlewares/asyncHandler
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>

/**
 * @param fn - Async controller function.
 * @returns Express middleware that catches Promise rejections.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
