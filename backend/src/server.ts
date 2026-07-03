/**
 * Server Entry Point — process bootstrap for HTTP API and WebSocket telemetry.
 *
 * Responsibility: loads environment variables, validates config via Zod, starts
 * the Express HTTP listener on PORT, and launches the telemetry WebSocket server
 * on WS_PORT. Registers SIGTERM/SIGINT handlers for graceful pool and WS shutdown.
 *
 * Architecture: top-level runtime → app.ts, config/*, webSockets/telemetry.gateway.
 * Run via `npm run dev` (tsx) or `npm start` (compiled dist/server.js).
 *
 * @module server
 */

import 'dotenv/config'
import app from './app.js'
import { pool } from './config/database.js'
import { validateEnv } from './config/env.js'
import {
  startTelemetryServer,
  stopTelemetryServer,
} from './webSockets/telemetry.gateway.js'

validateEnv()

const env = validateEnv()
const port = env.PORT
const wsPort = env.WS_PORT

const server = app.listen(port, () => {
  console.log(`SLCTS API listening on http://localhost:${port}`)
  console.log(`Driver API: http://localhost:${port}/api/driver`)
})

startTelemetryServer(wsPort)

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`)
  stopTelemetryServer()
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
