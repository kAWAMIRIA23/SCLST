/**
 * Database Configuration — PostgreSQL connection pool.
 *
 * Responsibility: single shared `pg` Pool used by every service for raw SQL queries.
 * Connection string comes from DATABASE_URL (set by setup-db.ps1 or .env).
 *
 * Architecture: config layer — imported by all services; closed in server.ts on shutdown.
 *
 * @module config/database
 */

import { Pool, type QueryResult, type QueryResultRow } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
})

/**
 * Parameterized query helper — all services should use this instead of pool.query directly.
 *
 * @param text - SQL with $1, $2 placeholders (prevents injection).
 * @param params - Bound values for placeholders.
 * @returns pg QueryResult with typed rows.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export { pool }
