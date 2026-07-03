/**
 * Pricing Constants — platform revenue rules.
 *
 * Responsibility: documents the 15% platform commission rate applied at the database
 * level via transaction_ledger.platform_commission_ugx GENERATED column in schema.sql.
 * Centralized here for service-layer fare calculations and documentation.
 *
 * @module constants/pricing
 */

/** Matches `ROUND(total_amount_gross_ugx * 0.15, 2)` in sql/schema.sql */
export const PLATFORM_COMMISSION_RATE = 0.15
