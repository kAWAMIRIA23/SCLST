/**
 * Auth Service — credential verification and JWT issuance.
 *
 * Responsibility: admin login flow (lookup, bcrypt compare, role check, token sign)
 * and shared token signing for driver sessions. Does not parse HTTP — controllers
 * supply validated email/password pairs.
 *
 * Architecture: services layer → config/env (JWT_SECRET), config/database.
 * Consumed by auth.controller and driver.service (signDriverToken).
 *
 * @module services/auth.service
 */

import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import { query } from '../config/database.js'
import { AppError } from '../models/api.model.js'
import type { AuthUserRow, LoginResponseData } from '../models/user.model.js'

/**
 * @param email - Admin login email address.
 * @returns User row or null if not found.
 */
export async function findUserByEmail(email: string): Promise<AuthUserRow | null> {
  const result = await query<AuthUserRow>(
    `SELECT id, full_name, email, password_hash, role
     FROM users
     WHERE email = $1`,
    [email],
  )
  return result.rows[0] ?? null
}

/**
 * @param plain - Raw password from login form.
 * @param hash - bcrypt hash stored in users.password_hash.
 * @returns True when credentials match.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Issues a JWT for admin console access. Payload carries userId and role for requireAdmin.
 *
 * @param userId - users.id UUID.
 * @param role - Must be ADMIN for middleware to authorize.
 * @returns Bearer token and expiry string for client storage.
 */
export function signAdminToken(
  userId: string,
  role: string,
): { token: string; expiresIn: string } {
  const { JWT_SECRET: secret, JWT_EXPIRES_IN: expiresIn } = getEnv()

  const token = jwt.sign({ userId, role }, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  })

  return { token, expiresIn }
}

/**
 * Issues a JWT for driver mobile/API access. Embeds driverId for booking authorization.
 *
 * @param userId - users.id UUID linked to the driver.
 * @param driverId - drivers.id UUID used in booking and dispatch queries.
 */
export function signDriverToken(
  userId: string,
  driverId: string,
): { token: string; expiresIn: string } {
  const { JWT_SECRET: secret, JWT_EXPIRES_IN: expiresIn } = getEnv()

  const token = jwt.sign({ userId, role: 'DRIVER', driverId }, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  })

  return { token, expiresIn }
}

/**
 * Authenticates an admin user and returns session material for the Admin Console.
 *
 * @param email - Login email (validated by controller Zod schema).
 * @param password - Plain-text password (min 8 chars at HTTP layer).
 * @returns JWT, expiry, and admin profile summary.
 * @throws {AppError} 401 invalid credentials (generic message to avoid user enumeration).
 * @throws {AppError} 403 when user exists but role is not ADMIN.
 */
export async function loginAdmin(
  email: string,
  password: string,
): Promise<LoginResponseData> {
  const user = await findUserByEmail(email)

  if (!user || !user.password_hash) {
    throw new AppError(401, 'Invalid credentials')
  }

  const passwordValid = await verifyPassword(password, user.password_hash)
  if (!passwordValid) {
    throw new AppError(401, 'Invalid credentials')
  }

  if (user.role !== 'ADMIN') {
    throw new AppError(403, 'Insufficient permissions')
  }

  const { token, expiresIn } = signAdminToken(user.id, user.role)

  return {
    token,
    expiresIn,
    admin: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
  }
}
