/**
 * Transaction Models — ledger entries and escrow state mappers.
 * @module models/transaction.model
 */

import type { EscrowState } from './enums.js'

export interface TransactionRecord {
  id: string
  bookingId: string
  cargoType: string
  payloadWeightKg: number
  totalAmountGrossUGX: number
  platformCommissionUGX: number
  driverNetPayoutUGX: number
  escrowState: EscrowState
  createdAt: string
}

export interface TransactionRow {
  id: string
  booking_id: string
  cargo_type: string
  payload_weight_kg: string
  total_amount_gross_ugx: string
  platform_commission_ugx: string
  driver_net_payout_ugx: string
  escrow_state: EscrowState
  created_at: Date
}

export function mapTransactionRow(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    cargoType: row.cargo_type,
    payloadWeightKg: Number(row.payload_weight_kg),
    totalAmountGrossUGX: Number(row.total_amount_gross_ugx),
    platformCommissionUGX: Number(row.platform_commission_ugx),
    driverNetPayoutUGX: Number(row.driver_net_payout_ugx),
    escrowState: row.escrow_state,
    createdAt: row.created_at.toISOString(),
  }
}
