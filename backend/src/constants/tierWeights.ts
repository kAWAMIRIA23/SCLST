/**
 * Tier Weight Constants — vehicle capacity bounds per tier class (tonnes).
 *
 * Responsibility: defines min/max payload weight for SMALL, MEDIUM, and LARGE vehicles.
 * Used during driver onboarding (vehicles table INSERT) and dispatch matching
 * (dispatch.gateway filters bookings by these bounds).
 *
 * Architecture: constants layer — no runtime logic, imported by driver.service.
 *
 * @module constants/tierWeights
 */

import type { TierClass } from '../models/enums.js'

/** Cargo weight range (tonnes) each vehicle tier can legally carry. */
export const TIER_WEIGHTS: Record<TierClass, { min: number; max: number }> = {
  SMALL: { min: 0.5, max: 3 },
  MEDIUM: { min: 3, max: 10 },
  LARGE: { min: 10, max: 30 },
}
