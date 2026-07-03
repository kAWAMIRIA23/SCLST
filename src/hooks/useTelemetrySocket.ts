import { useEffect, useState } from 'react'
import type { DriverTelemetry, TelemetryMap, WebSocketStatus } from '../types'

export function useTelemetrySocket(wsUrl: string) {
  const [drivers, setDrivers] = useState<TelemetryMap>({})
  const [status, setStatus] = useState<WebSocketStatus>('CONNECTING')

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let unmounted = false

    function connect() {
      if (unmounted) return

      setStatus('CONNECTING')
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (!unmounted) setStatus('CONNECTED')
      }

      ws.onmessage = (event) => {
        try {
          const telemetry = JSON.parse(event.data as string) as DriverTelemetry
          setDrivers((prev) => ({
            ...prev,
            [telemetry.driver_id]: telemetry,
          }))
        } catch {
          // ignore malformed payloads
        }
      }

      ws.onerror = () => {
        if (!unmounted) setStatus('ERROR')
      }

      ws.onclose = () => {
        if (!unmounted) {
          setStatus('DISCONNECTED')
          reconnectTimeout = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      unmounted = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      ws?.close()
    }
  }, [wsUrl])

  return { drivers, status }
}
