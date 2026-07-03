import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from 'react'
import { Status, Wrapper } from '@googlemaps/react-wrapper'
import type { TelemetryMap } from '../types'

const TIER_COLORS: Record<string, string> = {
  SMALL: '#6366f1',
  MEDIUM: '#f59e0b',
  LARGE: '#22c55e',
}

const KAMPALA_CENTER = { lat: 0.3476, lng: 32.5825 }

export interface FleetMapHandle {
  panTo: (lat: number, lng: number) => void
}

interface MapCanvasProps {
  drivers: TelemetryMap
  mapRef: RefObject<google.maps.Map | null>
}

function MapCanvas({ drivers, mapRef }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Record<string, google.maps.Marker>>({})
  const infoWindowsRef = useRef<Record<string, google.maps.InfoWindow>>({})

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: KAMPALA_CENTER,
      zoom: 12,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
    })
  }, [mapRef])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const driverIds = new Set(Object.keys(drivers))

    for (const driverId of driverIds) {
      const driver = drivers[driverId]
      const position = { lat: driver.latitude, lng: driver.longitude }
      const existing = markersRef.current[driverId]

      if (existing) {
        existing.setPosition(position)
        continue
      }

      const marker = new google.maps.Marker({
        map,
        position,
        title: driver.driver_name,
        label: {
          text: driver.license_plate,
          color: '#1e293b',
          fontSize: '10px',
          fontWeight: '600',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: TIER_COLORS[driver.vehicle_tier] ?? TIER_COLORS.SMALL,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 10,
        },
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;padding:4px;">
            <strong>${driver.driver_name}</strong><br/>
            Plate: ${driver.license_plate}<br/>
            Tier: ${driver.vehicle_tier}<br/>
            Speed: ${driver.speed_kmh} km/h<br/>
            Booking: ${driver.booking_id ?? 'No active booking'}
          </div>
        `,
      })

      marker.addListener('click', () => {
        Object.values(infoWindowsRef.current).forEach((iw) => iw.close())
        infoWindow.open({ map, anchor: marker })
      })

      markersRef.current[driverId] = marker
      infoWindowsRef.current[driverId] = infoWindow
    }

    for (const markerId of Object.keys(markersRef.current)) {
      if (!driverIds.has(markerId)) {
        markersRef.current[markerId].setMap(null)
        infoWindowsRef.current[markerId]?.close()
        delete markersRef.current[markerId]
        delete infoWindowsRef.current[markerId]
      }
    }
  }, [drivers, mapRef])

  const isEmpty = Object.keys(drivers).length === 0

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50/80">
          <p className="text-sm font-medium text-slate-500">No active drivers online</p>
        </div>
      )}
    </div>
  )
}

interface FleetMapProps {
  drivers: TelemetryMap
}

const FleetMap = forwardRef<FleetMapHandle, FleetMapProps>(function FleetMap(
  { drivers },
  ref,
) {
  const mapRef = useRef<google.maps.Map | null>(null)

  useImperativeHandle(ref, () => ({
    panTo(lat: number, lng: number) {
      mapRef.current?.panTo({ lat, lng })
      mapRef.current?.setZoom(14)
    },
  }))

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <p className="text-sm text-red-600">VITE_GOOGLE_MAPS_API_KEY is not configured</p>
      </div>
    )
  }

  return (
    <Wrapper
      apiKey={apiKey}
      render={(wrapperStatus) => {
        if (wrapperStatus === Status.LOADING) {
          return (
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
          )
        }
        if (wrapperStatus === Status.FAILURE) {
          return (
            <div className="flex h-full items-center justify-center bg-red-50">
              <p className="text-sm text-red-600">Failed to load Google Maps</p>
            </div>
          )
        }
        return <div className="hidden" aria-hidden="true" />
      }}
    >
      <MapCanvas drivers={drivers} mapRef={mapRef} />
    </Wrapper>
  )
})

export default FleetMap
