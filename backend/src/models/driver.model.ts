/**
 * Driver Models — DB row types, API DTOs, and snake_case → camelCase mappers.
 * @module models/driver.model
 */

import type { TierClass, VerificationStatus } from './enums.js'

export interface DashboardStats {
  activeTransits: number
  todayGrossRevenueUGX: number
  todayPlatformCommissionUGX: number
  pendingDriverVerifications: number
}

export interface DashboardStatsRow {
  active_transits: number
  today_gross_revenue_ugx: string
  today_platform_commission_ugx: string
  pending_driver_verifications: number
}

export interface DriverProfile {
  id: string
  fullName: string
  phone: string
  licensePlate: string
  permitNumber: string
  tierClass: TierClass
  maxCapacityKg: number
  verificationStatus: VerificationStatus
  createdAt: string
}

export interface DriverRow {
  id: string
  full_name: string
  phone: string
  license_plate: string
  permit_number: string
  tier_class: TierClass
  max_capacity_kg: string
  verification_status: VerificationStatus
  created_at: Date
}

export interface PaginatedDriversResponse {
  data: DriverProfile[]
  total: number
  page: number
  limit: number
}

export interface DriverStatsRow {
  id: string
  name: string
  phone: string
  license_plate: string
  tier_class: TierClass
  is_online: boolean
  completed_trips: string
  total_km_driven: string
  gross_earnings_ugx: string
}

export interface DriverProfileResponse {
  id: string
  name: string
  phone: string
  license_plate: string
  tier_class: TierClass
  is_online: boolean
  gross_earnings_ugx: number
  completed_trips: number
  total_km_driven: number
}

export function mapDriverRow(row: DriverRow): DriverProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    licensePlate: row.license_plate,
    permitNumber: row.permit_number,
    tierClass: row.tier_class,
    maxCapacityKg: Number(row.max_capacity_kg),
    verificationStatus: row.verification_status,
    createdAt: row.created_at.toISOString(),
  }
}

export function mapDriverStatsRow(row: DriverStatsRow): DriverProfileResponse {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    license_plate: row.license_plate,
    tier_class: row.tier_class,
    is_online: row.is_online,
    gross_earnings_ugx: Number(row.gross_earnings_ugx),
    completed_trips: Number(row.completed_trips),
    total_km_driven: Number(row.total_km_driven),
  }
}
