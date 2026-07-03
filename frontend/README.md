# SLCTS Dual-App Portal — Frontend Workspace

**Smart Logistics & Cargo Transit System (SLCTS)** ships two client applications that share a single Core API ([`../backend/README.md`](../backend/README.md)):

| Portal | Stack | Directory | Primary users |
|--------|-------|-----------|---------------|
| **Admin Command Dashboard** | React 19 · TypeScript · Vite · Tailwind CSS 4 | Repository root (`../`) | Operations admins, fleet oversight |
| **Driver Mobile Portal** | Flutter · Dart · BLoC | [`../mobile/`](../mobile/) | Field drivers, trip execution |

Both clients authenticate against the Node.js backend, consume REST endpoints under `/api`, and connect to the telemetry WebSocket for live fleet tracking and booking dispatch.

---

## 1. Project Directory Overview

The monorepo divides client concerns into a **web command center** and a **mobile field client**. They are intentionally separate runtimes — the admin dashboard needs large-screen maps and ledger tables; the driver app needs GPS, push-style dispatch overlays, and offline-tolerant state.

```
slcts/                          ← repository root
├── frontend/
│   └── README.md               ← this document (portal guide)
├── src/                        ← Admin Web Platform (React)
│   ├── App.tsx                 ← auth gate → AdminConsole
│   ├── AdminConsole.tsx        ← dashboard, drivers, bookings, ledger
│   ├── api/                    ← REST clients (/api/admin/*)
│   ├── components/             ← FleetMap, FleetTelemetryPanel
│   └── hooks/                  ← useTelemetrySocket
├── mobile/                     ← Driver Mobile Platform (Flutter)
│   ├── lib/
│   │   ├── presentation/       ← screens, blocs, widgets
│   │   ├── data/               ← repositories, Dio HTTP
│   │   ├── domain/             ← entities, use cases
│   │   └── core/               ← AppConfig, WebSocket client
│   ├── android/ · ios/ · web/  ← platform targets
│   └── pubspec.yaml
├── backend/                    ← shared Core API (not part of this README)
├── package.json                ← Admin web dependencies & scripts
├── vite.config.ts              ← dev proxy → localhost:3001
└── .env.example                ← VITE_* keys for admin web
```

### Architectural split

| Concern | Admin Web Platform | Driver Mobile Platform |
|---------|-------------------|------------------------|
| **Auth** | Email + password → admin JWT | Phone onboarding → driver JWT |
| **HTTP** | Vite dev proxy `/api` → backend | Dio → `BASE_URL` (dart-define) |
| **Real-time** | `VITE_WS_URL` telemetry broadcast | `WS_URL` + `driver_id` query param |
| **Maps** | Google Maps (`FleetMap.tsx`) | Geolocator for GPS uplink |
| **State** | React `useState` / hooks | `flutter_bloc` |

---

## 2. Admin Command Dashboard Setup (React & TypeScript)

The admin dashboard is a **Vite-powered SPA** at the repository root. It proxies API calls to the backend during development and renders the fleet map, transaction ledger, and driver verification workflows.

### Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime for Vite and npm scripts |
| **npm** | 9+ | Package manager |
| **Tailwind CSS** | 4.x (via `@tailwindcss/vite`) | Utility-first styling — already wired in `vite.config.ts` |
| **Google Maps JavaScript API** | — | Fleet map rendering ([Maps Platform](https://console.cloud.google.com/google/maps-apis)) |
| **Backend API** | running on `:3001` | Required for login and data ([`../backend/README.md`](../backend/README.md)) |

### Environment variables

Copy the example file and set your Maps key:

```bash
cp .env.example .env
```

Edit `.env` in the **repository root**:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_WS_URL=ws://localhost:4000/telemetry
```

> **Google Maps API token (required):**  
> Replace `your_google_maps_api_key` with a valid key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis). Enable **Maps JavaScript API** for the project. Restrict the key by HTTP referrer in production.  
> Without this key, `FleetMap.tsx` displays a configuration error and the live fleet view will not render.

### Script directives

From the **repository root** (not `frontend/`):

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite dev server (default http://localhost:5173)
npm run dev
```

Additional scripts:

```bash
npm run build    # TypeScript check + production bundle → dist/
npm run preview  # Serve the production build locally
npm run lint     # Oxlint static analysis
```

### Default login

After seeding the backend (`cd backend && npm run seed:admin`):

- **Email:** `admin@slcts.ug`
- **Password:** `AdminSecure@2025`

The Vite dev server proxies `/api/*` to `http://localhost:3001` (see `vite.config.ts`), so no CORS configuration is needed during local development.

---

## 3. Driver Mobile Portal Setup (Flutter & Dart)

The driver app (`slcts_driver`) lives in [`../mobile/`](../mobile/). It handles onboarding, online/offline toggling, booking accept/complete flows, and GPS telemetry uplink over WebSocket.

### Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| **Flutter SDK** | ≥ 3.3 (Dart ≥ 3.3) | Per `pubspec.yaml` `environment.sdk` |
| **Android Studio** | latest | Android SDK, emulator, and `flutter doctor` toolchain |
| **Xcode** | latest (macOS only) | iOS Simulator and device deployment |
| **Chrome** | latest | Optional — fastest local iteration via `flutter run -d chrome` |
| **Backend API** | running on `:3001` | Driver REST endpoints |
| **WebSocket telemetry** | running on `:4000` | Booking offers + GPS relay |

Verify your toolchain:

```bash
flutter doctor
```

### API endpoint configuration

Endpoints are compiled via `--dart-define` (see [`../mobile/lib/core/constants/app_config.dart`](../mobile/lib/core/constants/app_config.dart)):

| Define | Default | Description |
|--------|---------|-------------|
| `BASE_URL` | `http://localhost:3001` | REST API base URL |
| `WS_URL` | `ws://localhost:4000/telemetry` | Telemetry WebSocket URL |

### Setup command configuration

From the `mobile/` directory:

```bash
# 1. Fetch Dart/Flutter dependencies
flutter pub get

# 2. Run on a connected device or emulator
flutter run
```

**Chrome (quick local dev)** — use the included helper or run manually:

```powershell
# Windows — from mobile/
.\run-chrome.ps1
```

```bash
# Cross-platform equivalent
flutter run -d chrome \
  --dart-define=BASE_URL=http://localhost:3001 \
  --dart-define=WS_URL=ws://localhost:4000/telemetry
```

**Android emulator:**

```bash
flutter run -d android \
  --dart-define=BASE_URL=http://10.0.2.2:3001 \
  --dart-define=WS_URL=ws://10.0.2.2:4000/telemetry
```

> `10.0.2.2` is the Android emulator's alias for the host machine's `localhost`.

**iOS Simulator (macOS):**

```bash
flutter run -d ios \
  --dart-define=BASE_URL=http://localhost:3001 \
  --dart-define=WS_URL=ws://localhost:4000/telemetry
```

### Run tests

```bash
cd mobile
flutter test
```

---

## 4. Network Bridging Notice

> ### ⚠️ Physical devices cannot reach `localhost` on your development machine
>
> When testing the **Driver Mobile Portal** on a **real phone** or a device on another network, `http://localhost:3001` points to the phone itself — not your laptop. API calls and WebSocket connections will fail unless you bridge your local backend to a publicly reachable URL.

### Recommended approach: `ngrok` (or similar)

Tools like [ngrok](https://ngrok.com/), [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/), or [localtunnel](https://localtunnel.github.io/www/) expose your local services over HTTPS/WSS with a temporary public hostname.

**Step 1 — Start the backend** (from `backend/`):

```bash
npm run dev
# HTTP  → localhost:3001
# WS    → localhost:4000
```

**Step 2 — Tunnel the HTTP API:**

```bash
ngrok http 3001
```

Note the forwarding URL, e.g. `https://abc123.ngrok-free.app`.

**Step 3 — Tunnel the WebSocket server** (separate tunnel required):

```bash
ngrok http 4000
```

Note the WSS URL, e.g. `wss://def456.ngrok-free.app/telemetry`.

**Step 4 — Run Flutter with tunnel URLs:**

```bash
cd mobile
flutter run \
  --dart-define=BASE_URL=https://abc123.ngrok-free.app \
  --dart-define=WS_URL=wss://def456.ngrok-free.app/telemetry
```

### Security practices for tunneled development

- Use ngrok **authtoken** and avoid sharing tunnel URLs publicly.
- Rotate `JWT_SECRET` and never commit `.env` files.
- Restrict Google Maps API keys by referrer/IP even during development.
- Disable tunnels when not actively testing — open tunnels expose your local API.
- For production, deploy the backend to a proper host; do not rely on ngrok in prod.

### Admin web + ngrok

The React admin app can also target a tunneled API by adjusting `vite.config.ts` proxy `target` or by serving the built `dist/` behind the same tunnel. For local admin development, the built-in Vite proxy to `localhost:3001` is sufficient.

---

## Quick start (both portals)

```bash
# Terminal 1 — Core API
cd backend && npm run dev

# Terminal 2 — Admin Dashboard
npm install && npm run dev
# → http://localhost:5173

# Terminal 3 — Driver Mobile (Chrome)
cd mobile && flutter pub get && flutter run -d chrome
```

## Related documentation

- [Backend API README](../backend/README.md) — routes, `.env`, WebSocket protocol
- [Database README](../database/README.md) — PostgreSQL schema and setup
- [Admin `.env.example`](../.env.example) — `VITE_GOOGLE_MAPS_API_KEY`, `VITE_WS_URL`
