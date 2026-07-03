import { getToken, handleUnauthorized } from './auth'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface DashboardStats {
  activeTransits: number
  todayGrossRevenueUGX: number
  todayPlatformCommissionUGX: number
  pendingDriverVerifications: number
}

export interface ApiDriver {
  id: string
  fullName: string
  phone: string
  licensePlate: string
  permitNumber: string
  tierClass: 'SMALL' | 'MEDIUM' | 'LARGE'
  maxCapacityKg: number
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface ApiBooking {
  id: string
  shipper: string
  origin: string
  destination: string
  cargoType: string
  tripStatus: 'REQUESTED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED'
  finalFareUGX: number | null
  createdAt: string
}

export interface ApiTransaction {
  id: string
  bookingId: string
  cargoType: string
  payloadWeightKg: number
  totalAmountGrossUGX: number
  platformCommissionUGX: number
  driverNetPayoutUGX: number
  escrowState: 'HELD' | 'RELEASED'
  createdAt: string
}

const BASE = '/api/admin'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()

  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  const body = (await res.json()) as ApiResponse<T>

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error(body.error ?? 'Session expired — please sign in again')
  }

  if (!res.ok || !body.success || body.data === undefined) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }

  return body.data
}

export function fetchDashboardStats() {
  return request<DashboardStats>('/dashboard/stats')
}

export function fetchBookings() {
  return request<ApiBooking[]>('/bookings')
}

export function fetchDrivers() {
  return request<ApiDriver[]>('/drivers')
}

export function fetchTransactions() {
  return request<ApiTransaction[]>('/transactions')
}

export function verifyDriver(id: string, status: 'APPROVED' | 'REJECTED') {
  return request<ApiDriver>(`/drivers/${id}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function releaseEscrow(id: string) {
  return request<ApiTransaction>(`/transactions/${id}/release-escrow`, {
    method: 'PATCH',
  })
}
