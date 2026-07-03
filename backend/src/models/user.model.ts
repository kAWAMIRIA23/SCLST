/**
 * User Models — JWT payloads, auth rows, and login response shapes.
 * @module models/user.model
 */

import type { UserRole } from './enums.js'

export interface JwtPayload {
  userId: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface DriverJwtPayload extends JwtPayload {
  driverId: string
  role: 'DRIVER'
}

export interface LoginRequestBody {
  email: string
  password: string
}

export interface AuthUserRow {
  id: string
  full_name: string
  email: string
  password_hash: string | null
  role: string
}

export interface LoginResponseData {
  token: string
  expiresIn: string
  admin: {
    id: string
    fullName: string
    email: string
    role: string
  }
}
