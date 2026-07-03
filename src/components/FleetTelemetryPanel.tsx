import { useRef } from 'react'
import { MapPin } from 'lucide-react'
import FleetMap, { type FleetMapHandle } from './FleetMap'
import { useTelemetrySocket } from '../hooks/useTelemetrySocket'
import type { DriverTelemetry, WebSocketStatus } from '../types'

const WS_URL =
  import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000/telemetry'

const TIER_BADGE: Record<DriverTelemetry['vehicle_tier'], string> = {
  SMALL: 'bg-indigo-100 text-indigo-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LARGE: 'bg-emerald-100 text-emerald-700',
}

function StatusBadge({ status }: { status: WebSocketStatus }) {
  const styles: Record<WebSocketStatus, { dot: string; label: string; text: string }> = {
    CONNECTED: { dot: 'bg-emerald-500', label: 'Connected', text: 'text-emerald-700' },
    CONNECTING: { dot: 'bg-amber-500', label: 'Connecting', text: 'text-amber-700' },
    DISCONNECTED: { dot: 'bg-red-500', label: 'Disconnected', text: 'text-red-700' },
    ERROR: { dot: 'bg-red-500', label: 'Error', text: 'text-red-700' },
  }

  const { dot, label, text } = styles[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium ${text}`}
    >
      <span className={`h-2 w-2 animate-pulse rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export default function FleetTelemetryPanel() {
  const { drivers, status } = useTelemetrySocket(WS_URL)
  const mapRef = useRef<FleetMapHandle>(null)
  const driverList = Object.values(drivers)
  const showReconnectBanner = status === 'ERROR' || status === 'DISCONNECTED'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-indigo-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-800">Fleet Telemetry Panel</h2>
            <p className="text-sm text-slate-500">
              {Object.keys(drivers).length} active drivers
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {showReconnectBanner && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Live feed disconnected — attempting to reconnect...
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="h-[480px] w-full overflow-hidden rounded-xl border border-slate-200 lg:flex-1">
          <FleetMap ref={mapRef} drivers={drivers} />
        </div>

        <div className="max-h-[480px] w-full overflow-y-auto lg:w-72 lg:shrink-0">
          {driverList.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Waiting for driver telemetry…</p>
          ) : (
            <ul className="space-y-2">
              {driverList.map((driver) => (
                <li key={driver.driver_id}>
                  <button
                    type="button"
                    onClick={() =>
                      mapRef.current?.panTo(driver.latitude, driver.longitude)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {driver.driver_name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_BADGE[driver.vehicle_tier]}`}
                      >
                        {driver.vehicle_tier}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {driver.license_plate}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {driver.speed_kmh} km/h ·{' '}
                      {driver.booking_id ? `Booking ${driver.booking_id.slice(0, 8)}` : 'Idle'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
