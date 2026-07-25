import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { clearMockSession, readMockSession } from '../mock-auth'

export const Route = createFileRoute('/home')({ component: HomePage })

interface SessionUser {
  email: string
  fullName: string
}

function HomePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const session = readMockSession()

    if (!session) {
      void navigate({ to: '/login' })
      return
    }

    setUser(session)
  }, [navigate])

  function handleLogout() {
    clearMockSession()
    void navigate({ to: '/login' })
  }

  if (!user) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Opening your Àjọ dashboard...</p>
      </main>
    )
  }

  const firstName = user.fullName.split(' ')[0]

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <a className="brand-mark" href="/">
          Àjọ
        </a>
        <button className="dashboard-logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <p className="eyebrow">Your savings space</p>
        <h1 id="dashboard-title">Welcome, {firstName}</h1>
        <p>
          This is the start of your member dashboard. Soon you will see your
          circles, contributions, wallet balance, and upcoming payout turns here.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard summary">
        <article className="dashboard-card">
          <span>Demo account</span>
          <strong>{user.fullName}</strong>
          <p>{user.email}</p>
        </article>

        <article className="dashboard-card">
          <span>Active circles</span>
          <strong>0</strong>
          <p>Create or join a group to start tracking contributions.</p>
        </article>

        <article className="dashboard-card">
          <span>Next step</span>
          <strong>Set up your first group</strong>
          <p>Invite people, agree the amount, and keep everyone on the same page.</p>
        </article>
      </section>
    </main>
  )
}
