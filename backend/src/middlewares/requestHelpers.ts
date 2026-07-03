/**
 * Request Helpers — shared HTTP input parsing utilities.
 *
 * Responsibility: validates UUID path parameters and normalizes pagination query
 * strings before controllers pass values to services.
 *
 * @module middlewares/requestHelpers
 */

import type { Request } from 'express'
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../constants/pagination.js'
import { AppError } from '../models/api.model.js'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * @param value - Express req.params value (may be string or string[]).
 * @param label - Human-readable name for error messages (e.g. "booking ID").
 * @returns Valid UUID string.
 * @throws {AppError} 400 when format is invalid.
 */
export function parseUuidParam(
  value: string | string[] | undefined,
  label = 'ID',
): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(400, `Invalid ${label}`)
  }
  return id
}

/**
 * @param query - Express req.query from list endpoints.
 * @returns Sanitized page, limit, and computed SQL offset.
 */
export function parsePagination(query: Request['query']): {
  page: number
  limit: number
  offset: number
} {
  const page = Math.max(DEFAULT_PAGE, parseInt(String(query.page ?? String(DEFAULT_PAGE)), 10) || DEFAULT_PAGE)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT),
  )
  const offset = (page - 1) * limit
  return { page, limit, offset }
}
