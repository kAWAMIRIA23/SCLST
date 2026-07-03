/**
 * Ledger Controller — HTTP adapter for transactions and escrow management.
 *
 * Responsibility: thin handlers for the financial ledger domain. Mounted under
 * /api/admin alongside admin routes but separated for single-responsibility.
 *
 * Routes: /api/admin/transactions (see routes/ledger.routes.ts).
 *
 * @module controllers/ledger.controller
 */

import type { Request, Response } from 'express'
import type { ApiResponse } from '../models/api.model.js'
import type { TransactionRecord } from '../models/transaction.model.js'
import { parseUuidParam } from '../middlewares/requestHelpers.js'
import {
  getTransactions,
  releaseEscrow as releaseEscrowService,
} from '../services/ledger.service.js'

/** GET /api/admin/transactions */
export async function getTransactionsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  const data = await getTransactions()
  const response: ApiResponse<TransactionRecord[]> = {
    success: true,
    data,
  }
  res.json(response)
}

/**
 * PATCH /api/admin/transactions/:id/release-escrow
 * @param req.params.id - Transaction ledger UUID.
 */
export async function releaseEscrow(req: Request, res: Response): Promise<void> {
  const transactionId = parseUuidParam(req.params.id, 'transaction ID')
  const data = await releaseEscrowService(transactionId)

  const response: ApiResponse<TransactionRecord> = {
    success: true,
    data,
  }
  res.json(response)
}
