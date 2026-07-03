import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Truck,
  Wallet,
  TrendingUp,
  Percent,
  ShieldAlert,
  Navigation,
  Search,
  User,
  RefreshCw,
  LogOut,
} from 'lucide-react'
import FleetTelemetryPanel from './components/FleetTelemetryPanel'
import {
  fetchBookings,
  fetchDashboardStats,
  fetchDrivers,
  fetchTransactions,
  releaseEscrow as apiReleaseEscrow,
  verifyDriver as apiVerifyDriver,
  type ApiBooking,
  type ApiDriver,
  type ApiTransaction,
  type DashboardStats,
} from './api/admin'
import type { AdminUser } from './api/auth'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Driver {
  id: string
  name: string
  phone: string
  licensePlate: string
  tier: 'SMALL' | 'MEDIUM' | 'LARGE'
  maxCapacityTonnes: number
  permitStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface Booking {
  id: string
  shipper: string
  origin: string
  destination: string
  cargoType: string
  status: 'REQUESTED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED'
  fareUGX: number
  timestamp: string
}

interface Transaction {
  id: string
  bookingId: string
  cargoType: string
  payloadKg: number
  grossFareUGX: number
  platformFeeUGX: number
  driverNetUGX: number
  escrowStatus: 'HELD' | 'RELEASED'
}

type ViewId = 'dashboard' | 'fleet' | 'ledger'
type TierFilter = 'ALL' | 'SMALL' | 'MEDIUM' | 'LARGE'

interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
}

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  colorClass: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatUGX = (n: number) => `UGX ${n.toLocaleString('en-UG')}`

function mapApiDriver(d: ApiDriver): Driver {
  return {
    id: d.id,
    name: d.fullName,
    phone: d.phone,
    licensePlate: d.licensePlate,
    tier: d.tierClass,
    maxCapacityTonnes: d.maxCapacityKg / 1000,
    permitStatus: d.verificationStatus,
  }
}

function mapApiBooking(b: ApiBooking): Booking {
  return {
    id: b.id.slice(0, 8),
    shipper: b.shipper,
    origin: b.origin,
    destination: b.destination,
    cargoType: b.cargoType,
    status: b.tripStatus,
    fareUGX: b.finalFareUGX ?? 0,
    timestamp: b.createdAt,
  }
}

function mapApiTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.id.slice(0, 8),
    bookingId: t.bookingId.slice(0, 8),
    cargoType: t.cargoType,
    payloadKg: t.payloadWeightKg,
    grossFareUGX: t.totalAmountGrossUGX,
    platformFeeUGX: t.platformCommissionUGX,
    driverNetUGX: t.driverNetPayoutUGX,
    escrowStatus: t.escrowState,
  }
}

// Raw IDs kept for API mutations (slice is display-only)
interface DriverRow extends Driver {
  rawId: string
}

interface TransactionRow extends Transaction {
  rawId: string
}

function mapApiDriverRow(d: ApiDriver): DriverRow {
  return { ...mapApiDriver(d), rawId: d.id }
}

function mapApiTransactionRow(t: ApiTransaction): TransactionRow {
  return { ...mapApiTransaction(t), rawId: t.id }
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fleet', label: 'Fleet Matrix', icon: Truck },
  { id: 'ledger', label: 'Financial Ledger', icon: Wallet },
]

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={18} className={colorClass} />
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  )
}

function BookingStatusBadge({ status }: { status: Booking['status'] }) {
  const styles: Record<Booking['status'], string> = {
    REQUESTED: 'bg-amber-100 text-amber-700',
    EN_ROUTE: 'bg-indigo-100 text-indigo-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function PermitStatusBadge({ status }: { status: Driver['permitStatus'] }) {
  const styles: Record<Driver['permitStatus'], string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function EscrowStatusBadge({ status }: { status: Transaction['escrowStatus'] }) {
  const styles: Record<Transaction['escrowStatus'], string> = {
    HELD: 'bg-amber-100 text-amber-700',
    RELEASED: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function TierBadge({ tier }: { tier: Driver['tier'] }) {
  const styles: Record<Driver['tier'], string> = {
    SMALL: 'bg-sky-100 text-sky-700',
    MEDIUM: 'bg-violet-100 text-violet-700',
    LARGE: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[tier]}`}>
      {tier}
    </span>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  activeView,
  onNavigate,
  admin,
  onLogout,
}: {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  admin: AdminUser
  onLogout: () => void
}) {
  return (
    <aside className="fixed flex h-screen w-[240px] flex-col bg-slate-900">
      <div className="border-b border-slate-700 px-5 py-6">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-indigo-400" />
          <div>
            <p className="text-sm font-bold text-white">SLCTS</p>
            <p className="text-xs text-slate-400">Admin Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600">
            <User size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{admin.fullName}</p>
            <p className="truncate text-xs text-slate-400">{admin.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ─── Dashboard Components ──────────────────────────────────────────────────────

function BookingTable({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">Recent Bookings</h2>
      </div>
      <div className="overflow-x-auto">
        {bookings.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No bookings in the database yet.</p>
        ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">ID</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Shipper</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Origin</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Destination</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Cargo</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Fare (UGX)</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{booking.id}</td>
                <td className="px-4 py-3 text-slate-600">{booking.shipper}</td>
                <td className="px-4 py-3 text-slate-600">{booking.origin}</td>
                <td className="px-4 py-3 text-slate-600">{booking.destination}</td>
                <td className="px-4 py-3 text-slate-600">{booking.cargoType}</td>
                <td className="px-4 py-3">
                  <BookingStatusBadge status={booking.status} />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {formatUGX(booking.fareUGX)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  )
}

function DashboardView({
  stats,
  bookings,
  loading,
}: {
  stats: DashboardStats | null
  bookings: Booking[]
  loading: boolean
}) {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Smart Logistics &amp; Commodity Transportation System — Uganda
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Transits"
          value={loading || !stats ? '…' : String(stats.activeTransits)}
          icon={Navigation}
          colorClass="text-indigo-600"
        />
        <StatCard
          label="Today's Revenue UGX"
          value={loading || !stats ? '…' : formatUGX(stats.todayGrossRevenueUGX)}
          icon={TrendingUp}
          colorClass="text-emerald-600"
        />
        <StatCard
          label="Platform Commissions 15%"
          value={loading || !stats ? '…' : formatUGX(stats.todayPlatformCommissionUGX)}
          icon={Percent}
          colorClass="text-amber-600"
        />
        <StatCard
          label="Pending Verifications"
          value={loading || !stats ? '…' : String(stats.pendingDriverVerifications)}
          icon={ShieldAlert}
          colorClass="text-red-600"
        />
      </div>

      <FleetTelemetryPanel />
      <BookingTable bookings={bookings} />
    </div>
  )
}

// ─── Fleet Matrix Components ───────────────────────────────────────────────────

function DriverTable({
  drivers,
  onApprove,
  onReject,
  actionLoading,
}: {
  drivers: DriverRow[]
  onApprove: (rawId: string) => void
  onReject: (rawId: string) => void
  actionLoading: string | null
}) {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL')

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()
    return drivers.filter((driver) => {
      const matchesSearch =
        !query ||
        driver.name.toLowerCase().includes(query) ||
        driver.licensePlate.toLowerCase().includes(query)
      const matchesTier = tierFilter === 'ALL' || driver.tier === tierFilter
      return matchesSearch && matchesTier
    })
  }, [drivers, search, tierFilter])

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-800">Fleet &amp; Driver Vetting Matrix</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as TierFilter)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">ALL</option>
            <option value="SMALL">SMALL</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LARGE">LARGE</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Driver Name</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Phone</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">License Plate</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Tier</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Max Capacity</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Permit Status</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((driver) => (
              <tr key={driver.rawId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{driver.name}</td>
                <td className="px-4 py-3 text-slate-600">{driver.phone}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{driver.licensePlate}</td>
                <td className="px-4 py-3">
                  <TierBadge tier={driver.tier} />
                </td>
                <td className="px-4 py-3 text-slate-600">{driver.maxCapacityTonnes} t</td>
                <td className="px-4 py-3">
                  <PermitStatusBadge status={driver.permitStatus} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove(driver.rawId)}
                      disabled={driver.permitStatus !== 'PENDING' || actionLoading === driver.rawId}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Approve Permit
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(driver.rawId)}
                      disabled={driver.permitStatus !== 'PENDING' || actionLoading === driver.rawId}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Reject Profile
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No drivers match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FleetMatrixView({
  drivers,
  loading,
  onApprove,
  onReject,
  actionLoading,
}: {
  drivers: DriverRow[]
  loading: boolean
  onApprove: (rawId: string) => void
  onReject: (rawId: string) => void
  actionLoading: string | null
}) {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fleet Matrix</h1>
        <p className="mt-1 text-sm text-slate-500">Driver vetting and permit management</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading drivers…</p>
      ) : (
        <DriverTable
          drivers={drivers}
          onApprove={onApprove}
          onReject={onReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}

// ─── Financial Ledger Components ───────────────────────────────────────────────

function LedgerTable({
  transactions,
  onReleaseEscrow,
  actionLoading,
}: {
  transactions: TransactionRow[]
  onReleaseEscrow: (rawId: string) => void
  actionLoading: string | null
}) {
  const totals = useMemo(
    () => ({
      gross: transactions.reduce((sum, t) => sum + t.grossFareUGX, 0),
      fees: transactions.reduce((sum, t) => sum + t.platformFeeUGX, 0),
      driverNet: transactions.reduce((sum, t) => sum + t.driverNetUGX, 0),
    }),
    [transactions],
  )

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">Financial Ledger &amp; Escrow Oversight</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Booking ID</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Cargo Type</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Payload (kg)</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Gross Fare (UGX)</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Platform Fee 15% (UGX)</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Driver Net 85% (UGX)</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Escrow Status</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No transactions in the database yet.
                </td>
              </tr>
            ) : (
            transactions.map((tx) => (
              <tr key={tx.rawId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{tx.bookingId}</td>
                <td className="px-4 py-3 text-slate-600">{tx.cargoType}</td>
                <td className="px-4 py-3 text-slate-600">{tx.payloadKg.toLocaleString('en-UG')}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{formatUGX(tx.grossFareUGX)}</td>
                <td className="px-4 py-3 text-amber-700">{formatUGX(tx.platformFeeUGX)}</td>
                <td className="px-4 py-3 text-emerald-700">{formatUGX(tx.driverNetUGX)}</td>
                <td className="px-4 py-3">
                  <EscrowStatusBadge status={tx.escrowStatus} />
                </td>
                <td className="px-4 py-3">
                  {tx.escrowStatus === 'HELD' && (
                    <button
                      type="button"
                      onClick={() => onReleaseEscrow(tx.rawId)}
                      disabled={actionLoading === tx.rawId}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Release Escrow
                    </button>
                  )}
                </td>
              </tr>
            ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="px-4 py-4 text-slate-800" colSpan={3}>
                Totals
              </td>
              <td className="px-4 py-4 text-slate-800">{formatUGX(totals.gross)}</td>
              <td className="px-4 py-4 text-amber-700">{formatUGX(totals.fees)}</td>
              <td className="px-4 py-4 text-emerald-700">{formatUGX(totals.driverNet)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function FinancialLedgerView({
  transactions,
  loading,
  onReleaseEscrow,
  actionLoading,
}: {
  transactions: TransactionRow[]
  loading: boolean
  onReleaseEscrow: (rawId: string) => void
  actionLoading: string | null
}) {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Ledger</h1>
        <p className="mt-1 text-sm text-slate-500">Escrow oversight and payout reconciliation</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading transactions…</p>
      ) : (
        <LedgerTable
          transactions={transactions}
          onReleaseEscrow={onReleaseEscrow}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export default function AdminConsole({
  admin,
  onLogout,
}: {
  admin: AdminUser
  onLogout: () => void
}) {
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, bookingsData, driversData, transactionsData] = await Promise.all([
        fetchDashboardStats(),
        fetchBookings(),
        fetchDrivers(),
        fetchTransactions(),
      ])
      setStats(statsData)
      setBookings(bookingsData.map(mapApiBooking))
      setDrivers(driversData.map(mapApiDriverRow))
      setTransactions(transactionsData.map(mapApiTransactionRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (rawId: string) => {
    setActionLoading(rawId)
    setError(null)
    try {
      const updated = await apiVerifyDriver(rawId, 'APPROVED')
      setDrivers((prev) =>
        prev.map((d) => (d.rawId === rawId ? mapApiDriverRow(updated) : d)),
      )
      const freshStats = await fetchDashboardStats()
      setStats(freshStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve driver')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (rawId: string) => {
    setActionLoading(rawId)
    setError(null)
    try {
      const updated = await apiVerifyDriver(rawId, 'REJECTED')
      setDrivers((prev) =>
        prev.map((d) => (d.rawId === rawId ? mapApiDriverRow(updated) : d)),
      )
      const freshStats = await fetchDashboardStats()
      setStats(freshStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject driver')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReleaseEscrow = async (rawId: string) => {
    setActionLoading(rawId)
    setError(null)
    try {
      const updated = await apiReleaseEscrow(rawId)
      setTransactions((prev) =>
        prev.map((t) => (t.rawId === rawId ? mapApiTransactionRow(updated) : t)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release escrow')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        admin={admin}
        onLogout={onLogout}
      />
      <main className="ml-[240px] min-h-screen flex-1 overflow-y-auto bg-slate-50">
        {(error || loading) && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-3">
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <p className="text-sm text-slate-500">Loading live data from API…</p>
            )}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        )}
        {activeView === 'dashboard' && (
          <DashboardView stats={stats} bookings={bookings} loading={loading} />
        )}
        {activeView === 'fleet' && (
          <FleetMatrixView
            drivers={drivers}
            loading={loading}
            onApprove={handleApprove}
            onReject={handleReject}
            actionLoading={actionLoading}
          />
        )}
        {activeView === 'ledger' && (
          <FinancialLedgerView
            transactions={transactions}
            loading={loading}
            onReleaseEscrow={handleReleaseEscrow}
            actionLoading={actionLoading}
          />
        )}
      </main>
    </div>
  )
}
