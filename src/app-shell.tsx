import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { logout } from './api'
import { useToasts } from './toasts'

export function AppShell({
  children,
  title,
  eyebrow,
  action,
}: {
  children: ReactNode
  title?: string
  eyebrow?: string
  action?: ReactNode
}) {
  const navigate = useNavigate()
  const { showToast } = useToasts()

  async function handleLogout() {
    await logout()
    showToast('Logged out.', 'info')
    void navigate({ to: '/login' })
  }

  return (
    <main className="dashboard-shell app-shell">
      <header className="dashboard-header app-header">
        <Link className="brand-mark" to="/home">
          Àjọ
        </Link>
        <nav className="app-nav" aria-label="Primary">
          <Link to="/home" activeProps={{ className: 'app-nav-link app-nav-link-active' }} className="app-nav-link">
            Dashboard
          </Link>
          <Link to="/wallet" activeProps={{ className: 'app-nav-link app-nav-link-active' }} className="app-nav-link">
            Wallet
          </Link>
          <Link to="/profile" activeProps={{ className: 'app-nav-link app-nav-link-active' }} className="app-nav-link">
            Profile
          </Link>
        </nav>
        <button className="dashboard-logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {title ? (
        <section className="dashboard-hero dashboard-hero-compact">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <div className="page-title-row">
            <h1>{title}</h1>
            {action}
          </div>
        </section>
      ) : null}

      {children}
    </main>
  )
}
