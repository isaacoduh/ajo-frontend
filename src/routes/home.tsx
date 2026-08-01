import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { AppShell } from '../app-shell'
import { requireAuth } from '../auth-guard'
import {
  type AuthMeResponse,
  type CircleListResponse,
  type WalletActivityResponse,
  type WalletBalanceResponse,
  getMe,
  getWalletActivity,
  getWalletBalance,
  listCircles,
  readSession,
} from '../api'
import { formatDate, formatMinor, formatSignedMinor, statusLabel } from '../format'

export const Route = createFileRoute('/home')({ beforeLoad: requireAuth, component: HomePage })

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

  if (!homeData) {
    return <LoadingState message={errorMessage || 'Loading dashboard...'} isError={Boolean(errorMessage)} />
  }

  const displayName = homeData.me.member.display_name ?? homeData.me.user.email
  const firstName = displayName.split(' ')[0]

  return (
    <AppShell title={`Welcome, ${firstName}`} eyebrow="Dashboard">
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
                <p>{statusLabel(circle.state)}</p>
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
    </AppShell>
  )
}

function LoadingState({ message, isError }: { message: string; isError: boolean }) {
  return (
    <main className="dashboard-shell">
      <p className={isError ? 'auth-error dashboard-loading' : 'dashboard-loading'} role={isError ? 'alert' : undefined}>
        {message}
      </p>
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
