/**
 * Pagination Constants — default list query bounds for admin APIs.
 *
 * Used by middlewares/requestHelpers.parsePagination to cap page size and
 * prevent unbounded SELECT queries on driver lists.
 *
 * @module constants/pagination
 */

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100
