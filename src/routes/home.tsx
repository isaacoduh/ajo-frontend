import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import {
  type AuthMeResponse,
  type CircleListResponse,
  type WalletActivityResponse,
  type WalletBalanceResponse,
  getMe,
  getWalletActivity,
  getWalletBalance,
  listCircles,
  logout,
  readSession,
} from '../api'

export const Route = createFileRoute('/home')({ component: HomePage })

interface HomeData {
  me: AuthMeResponse
  balance: WalletBalanceResponse
  activity: WalletActivityResponse
  circles: CircleListResponse
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
        const [me, balance, activity, circles] = await Promise.all([
          getMe(),
          getWalletBalance(),
          getWalletActivity(5),
          listCircles(),
        ])

        if (isCurrent) {
          setHomeData({ me, balance, activity, circles })
        }
      } catch (error) {
        if (!isCurrent) {
          return
        }
        setErrorMessage(error instanceof Error ? error.message : 'Could not load dashboard.')
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
        <p className={errorMessage ? 'auth-error dashboard-loading' : 'dashboard-loading'} role={errorMessage ? 'alert' : undefined}>
          {errorMessage || 'Loading dashboard...'}
        </p>
      </main>
    )
  }

  const displayName = homeData.me.member.display_name ?? homeData.me.user.email
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

      <section className="dashboard-hero dashboard-hero-compact" aria-labelledby="dashboard-title">
        <p className="eyebrow">Dashboard</p>
        <h1 id="dashboard-title">Welcome, {firstName}</h1>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard summary">
        <article className="dashboard-card">
          <span>Wallet balance</span>
          <strong>{formatMinor(homeData.balance.available_minor, homeData.balance.currency)}</strong>
          <p>Pending {formatMinor(homeData.balance.pending_minor, homeData.balance.currency)}</p>
        </article>

        <article className="dashboard-card">
          <span>Member</span>
          <strong>{displayName}</strong>
          <p>{homeData.me.user.email}</p>
        </article>

        <article className="dashboard-card">
          <span>Screening</span>
          <strong>{screeningLabel(homeData.me.member.screening_state)}</strong>
          <p>{homeData.me.member.country}</p>
        </article>
      </section>

      <section className="dashboard-section" aria-labelledby="circles-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Circles</p>
            <h2 id="circles-title">Your circles</h2>
          </div>
          <button className="button button-primary" type="button" onClick={() => void navigate({ to: '/circles/new' })}>
            Create a circle
          </button>
        </div>

        {homeData.circles.items.length ? (
          <div className="activity-list">
            {homeData.circles.items.map((circle) => (
              <button
                className="activity-row activity-row-button"
                key={circle.id}
                type="button"
                onClick={() => void navigate({ to: '/circles/$circleId', params: { circleId: circle.id } })}
              >
                <div>
                  <strong>{circle.name}</strong>
                  <span>
                    {circle.member_count}/{circle.member_count_target} members
                  </span>
                </div>
                <p>{circle.state.replaceAll('_', ' ')}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <strong>No circles yet</strong>
            <p>Create a circle when you are ready to invite members and agree terms.</p>
          </div>
        )}
      </section>

      <section className="dashboard-section" aria-labelledby="activity-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Wallet</p>
            <h2 id="activity-title">Recent activity</h2>
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
            <strong>No wallet activity</strong>
          </div>
        )}
      </section>
    </main>
  )
}

function screeningLabel(screeningState: AuthMeResponse['member']['screening_state']) {
  if (screeningState === 'clear') {
    return 'Cleared'
  }
  if (screeningState === 'review') {
    return 'In review'
  }
  return 'Pending'
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
