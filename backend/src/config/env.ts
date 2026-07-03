/**
 * Environment Configuration — Zod-validated process.env.
 *
 * Responsibility: fail fast at startup if required secrets (DATABASE_URL, JWT_SECRET)
 * are missing or malformed. Optional vars get safe defaults (PORT=3001, WS_PORT=4000).
 *
 * Architecture: config layer — validateEnv() called once in server.ts; getEnv() used
 * by auth.service and JWT middlewares after validation.
 *
 * @module config/env
 */

import { z } from 'zod'

/** Treats empty strings as undefined so Zod defaults apply (common .env mistake). */
function optionalCoercedNumber(defaultValue: number) {
  return z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.coerce.number().int().positive().default(defaultValue),
  )
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  PORT: optionalCoercedNumber(3001),
  WS_PORT: optionalCoercedNumber(4000),
  JWT_EXPIRES_IN: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string().default('8h'),
  ),
  BCRYPT_SALT_ROUNDS: optionalCoercedNumber(12),
  NODE_ENV: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z.enum(['development', 'production', 'test']).default('development'),
    ),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

/**
 * Parses and caches environment on first call. Throws if validation fails.
 *
 * @returns Typed, validated environment object.
 * @throws Error with field details when required vars are missing.
 */
export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
  }

  cachedEnv = parsed.data
  return cachedEnv
}

/** Returns cached env or validates first — safe after server.ts bootstrap. */
export function getEnv(): Env {
  return cachedEnv ?? validateEnv()
}
