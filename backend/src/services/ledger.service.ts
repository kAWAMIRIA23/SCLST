/**
 * Ledger Service — transaction history and escrow release.
 *
 * Responsibility: surfaces financial records from transaction_ledger joined with
 * booking cargo metadata, and transitions escrow_state from HELD → RELEASED when
 * an admin authorizes driver payout. Platform commission is DB-generated (15%).
 *
 * Architecture: services layer → config/database. Consumed by ledger.controller.
 *
 * @module services/ledger.service
 */

import { query } from '../config/database.js'
import { AppError } from '../models/api.model.js'
import type { TransactionRecord, TransactionRow } from '../models/transaction.model.js'
import { mapTransactionRow } from '../models/transaction.model.js'

/** Returns all ledger entries newest-first for the admin transactions table. */
export async function getTransactions(): Promise<TransactionRecord[]> {
  const result = await query<TransactionRow>(
    `SELECT
       tl.id,
       tl.booking_id,
       b.cargo_type,
       b.payload_weight_kg,
       tl.total_amount_gross_ugx,
       tl.platform_commission_ugx,
       tl.driver_net_payout_ugx,
       tl.escrow_state,
       tl.created_at
     FROM transaction_ledger tl
     INNER JOIN bookings b ON b.id = tl.booking_id
     ORDER BY tl.created_at DESC`,
  )

  return result.rows.map(mapTransactionRow)
}

/**
 * Releases held escrow funds to the driver after trip completion verification.
 * Uses optimistic locking (WHERE escrow_state = 'HELD') to prevent double-release.
 *
 * @param transactionId - UUID of the transaction_ledger row.
 * @returns Updated transaction with RELEASED escrow_state.
 * @throws {AppError} 404 transaction not found.
 * @throws {AppError} 409 escrow already released or concurrent update lost the race.
 */
export async function releaseEscrow(transactionId: string): Promise<TransactionRecord> {
  const existing = await query<{ escrow_state: string }>(
    `SELECT escrow_state FROM transaction_ledger WHERE id = $1`,
    [transactionId],
  )

  if (existing.rowCount === 0) {
    throw new AppError(404, 'Transaction not found')
  }

  if (existing.rows[0].escrow_state !== 'HELD') {
    throw new AppError(409, 'Escrow already released')
  }

  const updated = await query<TransactionRow>(
    `UPDATE transaction_ledger
     SET escrow_state = 'RELEASED', released_at = NOW()
     WHERE id = $1 AND escrow_state = 'HELD'
     RETURNING
       id,
       booking_id,
       total_amount_gross_ugx,
       platform_commission_ugx,
       driver_net_payout_ugx,
       escrow_state,
       created_at,
       (SELECT cargo_type FROM bookings WHERE id = transaction_ledger.booking_id) AS cargo_type,
       (SELECT payload_weight_kg FROM bookings WHERE id = transaction_ledger.booking_id) AS payload_weight_kg`,
    [transactionId],
  )

  if (updated.rowCount === 0) {
    throw new AppError(409, 'Escrow already released')
  }

  return mapTransactionRow(updated.rows[0])
}
