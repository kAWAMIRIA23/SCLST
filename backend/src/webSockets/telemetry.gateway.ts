/**
 * Telemetry Gateway — WebSocket server for driver connections and GPS relay.
 *
 * Responsibility: manages the standalone WS server on /telemetry, indexes connections
 * by driver_id query param, and relays latitude/longitude payloads to all other clients
 * (admin map tracking). Runs on WS_PORT alongside the HTTP API on PORT.
 *
 * Architecture: webSockets layer — started from server.ts, shared with dispatch.gateway
 * via getDriverConnections() and broadcast().
 *
 * @module webSockets/telemetry.gateway
 */

import { WebSocketServer, type WebSocket } from 'ws'
import type { IncomingMessage } from 'http'

/** driverId → set of open sockets (supports multiple tabs/devices per driver). */
const driverConnections = new Map<string, Set<WebSocket>>()
let wss: WebSocketServer | null = null

/** Extracts driver_id from ws://host:port/telemetry?driver_id=<uuid> */
function parseDriverId(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, 'http://localhost')
    return parsed.searchParams.get('driver_id')
  } catch {
    return null
  }
}

function addConnection(driverId: string, ws: WebSocket): void {
  let set = driverConnections.get(driverId)
  if (!set) {
    set = new Set()
    driverConnections.set(driverId, set)
  }
  set.add(ws)
}

function removeConnection(driverId: string, ws: WebSocket): void {
  const set = driverConnections.get(driverId)
  if (!set) return
  set.delete(ws)
  if (set.size === 0) {
    driverConnections.delete(driverId)
  }
}

/**
 * Sends a JSON payload to every connected client except an optional sender.
 * Used for GPS telemetry fan-out and dispatch fallback broadcast.
 */
export function broadcast(payload: Record<string, unknown>, exclude?: WebSocket): void {
  if (!wss) return
  const message = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN && client !== exclude) {
      client.send(message)
    }
  }
}

/** Exposed for dispatch.gateway to target driver-specific offer delivery. */
export function getDriverConnections(driverId: string): Set<WebSocket> | undefined {
  return driverConnections.get(driverId)
}

/**
 * Starts the telemetry WebSocket server on the given port.
 *
 * @param port - Typically env.WS_PORT (default 4000).
 * @returns The WebSocketServer instance for testing/shutdown hooks.
 */
export function startTelemetryServer(port: number): WebSocketServer {
  wss = new WebSocketServer({ port, path: '/telemetry' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const driverId = parseDriverId(req.url)

    if (driverId) {
      addConnection(driverId, ws)
    }

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(String(data)) as Record<string, unknown>
        // Only relay well-formed GPS updates to avoid polluting the admin map stream
        if (payload.driver_id && payload.latitude != null && payload.longitude != null) {
          broadcast(payload, ws)
        }
      } catch {
        // Malformed frames are dropped silently — drivers may send heartbeat noise
      }
    })

    ws.on('close', () => {
      if (driverId) {
        removeConnection(driverId, ws)
      }
    })
  })

  console.log(`Telemetry WebSocket listening on ws://localhost:${port}/telemetry`)
  return wss
}

/** Graceful shutdown: closes server and clears the connection registry. */
export function stopTelemetryServer(): void {
  wss?.close()
  wss = null
  driverConnections.clear()
}
