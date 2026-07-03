export interface AdminUser {
  id: string
  fullName: string
  email: string
  role: string
}

export interface AuthSession {
  token: string
  expiresIn: string
  admin: AdminUser
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const SESSION_KEY = 'slcts_admin_session'

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function handleUnauthorized(): void {
  clearSession()
  unauthorizedHandler?.()
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const body = (await res.json()) as ApiResponse<AuthSession>

  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error ?? 'Login failed')
  }

  saveSession(body.data)
  return body.data
}
