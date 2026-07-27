import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import {
  type AuthMeResponse,
  type WalletActivityResponse,
  type WalletBalanceResponse,
  getMe,
  getWalletActivity,
  getWalletBalance,
  logout,
  readSession,
} from '../api'

export const Route = createFileRoute('/home')({ component: HomePage })

interface HomeData {
  me: AuthMeResponse
  balance: WalletBalanceResponse
  activity: WalletActivityResponse
}

function HomePage() {
  const navigate = useNavigate()
  const [homeData, setHomeData] = useState<HomeData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    if (!readSession()) {
      void navigate({ to: '/login' })
      return
    }

    async function loadHome() {
      try {
        const [me, balance, activity] = await Promise.all([
          getMe(),
          getWalletBalance(),
          getWalletActivity(),
        ])

        if (isCurrent) {
          setHomeData({ me, balance, activity })
        }
      } catch (error) {
        if (!isCurrent) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : 'Could not load dashboard.')
        void navigate({ to: '/login' })
      }
    }

    void loadHome()

    return () => {
      isCurrent = false
    }
  }, [navigate])

  async function handleLogout() {
    await logout()
    void navigate({ to: '/login' })
  }

  if (!homeData) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">
          {errorMessage || 'Opening your Àjọ dashboard...'}
        </p>
      </main>
    )
  }

  const displayName = homeData.me.display_name ?? homeData.me.email
  const firstName = displayName.split(' ')[0]

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
          Track your member profile, screening status, wallet balance, and recent
          movement from one place.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard summary">
        <article className="dashboard-card">
          <span>Member profile</span>
          <strong>{displayName}</strong>
          <p>{homeData.me.email}</p>
          <p className="dashboard-meta">Member ID {homeData.me.member_id}</p>
        </article>

        <article className="dashboard-card">
          <span>Screening</span>
          <strong>{screeningLabel(homeData.me.screening_state)}</strong>
          <p>{screeningCopy(homeData.me.screening_state)}</p>
        </article>

        <article className="dashboard-card">
          <span>Wallet</span>
          <strong>{formatMinor(homeData.balance.available_minor, homeData.balance.currency)}</strong>
          <p>
            Pending {formatMinor(homeData.balance.pending_minor, homeData.balance.currency)}
          </p>
        </article>
      </section>

      <section className="dashboard-section" aria-labelledby="activity-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Recent movement</p>
            <h2 id="activity-title">Wallet activity</h2>
          </div>
        </div>

        {homeData.activity.items.length ? (
          <div className="activity-list">
            {homeData.activity.items.map((item) => (
              <article className="activity-row" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <span>{formatDate(item.created_at)}</span>
                </div>
                <p className={item.amount_minor < 0 ? 'amount-negative' : 'amount-positive'}>
                  {formatSignedMinor(item.amount_minor, item.currency)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <strong>No wallet activity yet</strong>
            <p>Your top ups, withdrawals, and contribution movements will appear here.</p>
          </div>
        )}
      </section>
    </main>
  )
}

function screeningLabel(screeningState: AuthMeResponse['screening_state']) {
  if (screeningState === 'clear') {
    return 'Cleared'
  }

  if (screeningState === 'review') {
    return 'In review'
  }

  return 'Pending'
}

function screeningCopy(screeningState: AuthMeResponse['screening_state']) {
  if (screeningState === 'clear') {
    return 'Your member profile is ready for wallet and circle activity.'
  }

  if (screeningState === 'review') {
    return 'Your profile needs a review before all actions are available.'
  }

  return 'Your profile is being checked before all actions are available.'
}

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amountMinor / 100)
}

function formatSignedMinor(amountMinor: number, currency: string) {
  const sign = amountMinor > 0 ? '+' : ''
  return `${sign}${formatMinor(amountMinor, currency)}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
