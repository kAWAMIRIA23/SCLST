/**
 * Admin Seed Script — creates the default SLCTS admin user.
 *
 * Responsibility: one-off CLI utility (`npm run seed:admin`) that inserts
 * admin@slcts.ug with a bcrypt-hashed password. Uses ON CONFLICT DO NOTHING
 * so re-runs are safe.
 *
 * Architecture: scripts layer — runs outside the HTTP server; imports config/database.
 *
 * @module scripts/seedAdmin
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool, query } from '../config/database.js'
import { getEnv } from '../config/env.js'

/**
 * Inserts admin@slcts.ug if not already present.
 * Default password: AdminSecure@2025 (change after first login in production).
 */
async function seedAdmin(): Promise<void> {
  validateEnvForSeed()
  const { BCRYPT_SALT_ROUNDS: saltRounds } = getEnv()
  const passwordHash = await bcrypt.hash('AdminSecure@2025', saltRounds)

  await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'ADMIN')
     ON CONFLICT (email) DO NOTHING`,
    ['SLCTS Admin', '+256700000000', 'admin@slcts.ug', passwordHash],
  )

  console.log('Admin seed complete (admin@slcts.ug)')
}

function validateEnvForSeed(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
}

seedAdmin()
  .catch((err) => {
    console.error('Admin seed failed:', err.message)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
