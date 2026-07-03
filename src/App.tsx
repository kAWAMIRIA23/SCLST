import { useEffect, useState } from 'react'
import AdminConsole from './AdminConsole'
import LoginScreen from './LoginScreen'
import {
  clearSession,
  getSession,
  setUnauthorizedHandler,
  type AuthSession,
} from './api/auth'

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getSession())

  useEffect(() => {
    setUnauthorizedHandler(() => setSession(null))
  }, [])

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  if (!session) {
    return <LoginScreen onLogin={setSession} />
  }

  return (
    <AdminConsole
      admin={session.admin}
      onLogout={handleLogout}
    />
  )
}

export default App
