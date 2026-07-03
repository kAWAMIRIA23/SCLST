export interface DriverTelemetry {
  driver_id: string
  driver_name: string
  vehicle_tier: 'SMALL' | 'MEDIUM' | 'LARGE'
  license_plate: string
  latitude: number
  longitude: number
  booking_id: string | null
  speed_kmh: number
  last_updated: string
}

export type TelemetryMap = Record<string, DriverTelemetry>

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
