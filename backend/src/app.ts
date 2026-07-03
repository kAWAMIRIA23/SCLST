/**
 * Express Application Factory — HTTP middleware stack and route mounting.
 *
 * Responsibility: configures CORS, JSON body parsing, mounts domain routers under
 * /api/admin and /api/driver prefixes, and registers the global 404 + error handlers.
 * Does not start a listener — server.ts imports this default export.
 *
 * Architecture: entry composition layer → routes/*, middlewares/errorHandler.
 * Env validation is deferred to server.ts so app.ts can be imported in tests.
 *
 * @module app
 */

import express from 'express'
import cors from 'cors'
import adminRoutes from './routes/admin.routes.js'
import authRoutes from './routes/auth.routes.js'
import driverRoutes from './routes/driver.routes.js'
import ledgerRoutes from './routes/ledger.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.use('/api/admin/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin', ledgerRoutes)
app.use('/api/driver', driverRoutes)

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

app.use(errorHandler)

export default app
