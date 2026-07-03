/**
 * Domain Enums — PostgreSQL enum mirrors for TypeScript type safety.
 * Values must stay aligned with CREATE TYPE statements in sql/schema.sql.
 *
 * @module models/enums
 */

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type TierClass = 'SMALL' | 'MEDIUM' | 'LARGE'
export type TripStatus = 'REQUESTED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED'
export type EscrowState = 'HELD' | 'RELEASED'
export type UserRole = 'ADMIN' | 'SHIPPER' | 'DRIVER'
