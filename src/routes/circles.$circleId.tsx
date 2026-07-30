import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { type CircleDetailResponse, getCircle, readSession } from '../api'

export const Route = createFileRoute('/circles/$circleId')({ component: CircleDetailPage })

function CircleDetailPage() {
  const { circleId } = Route.useParams()
  const navigate = useNavigate()
  const [circle, setCircle] = useState<CircleDetailResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    if (!readSession()) {
      void navigate({ to: '/login' })
      return
    }

    async function loadCircle() {
      try {
        const detail = await getCircle(circleId)
        if (isCurrent) {
          setCircle(detail)
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load circle.')
        }
      }
    }

    void loadCircle()

    return () => {
      isCurrent = false
    }
  }, [circleId, navigate])

  if (!circle) {
    return (
      <main className="dashboard-shell">
        <p className={errorMessage ? 'auth-error dashboard-loading' : 'dashboard-loading'} role={errorMessage ? 'alert' : undefined}>
          {errorMessage || 'Loading circle...'}
        </p>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <a className="brand-mark" href="/home">
          Àjọ
        </a>
        <button className="dashboard-logout" type="button" onClick={() => void navigate({ to: '/home' })}>
          Home
        </button>
      </header>

      <section className="dashboard-hero dashboard-hero-compact" aria-labelledby="circle-title">
        <p className="eyebrow">{circle.state.replaceAll('_', ' ')}</p>
        <h1 id="circle-title">{circle.name}</h1>
      </section>

      <section className="dashboard-grid" aria-label="Circle summary">
        <article className="dashboard-card">
          <span>Contribution</span>
          <strong>{formatMinor(circle.contribution_amount_minor, circle.currency)}</strong>
          <p>{circle.cadence}</p>
        </article>

        <article className="dashboard-card">
          <span>Members</span>
          <strong>
            {circle.member_count}/{circle.member_count_target}
          </strong>
          <p>{circle.agreed_count} agreed</p>
        </article>

        <article className="dashboard-card">
          <span>Start</span>
          <strong>{formatDate(circle.start_date)}</strong>
          <p>{circle.cycle_count} cycles</p>
        </article>
      </section>

      <section className="dashboard-section" aria-labelledby="next-action-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Next action</p>
            <h2 id="next-action-title">{nextAction(circle.state)}</h2>
          </div>
        </div>
      </section>
    </main>
  )
}

function nextAction(state: string) {
  if (state === 'recruiting') {
    return 'Invite members'
  }
  if (state === 'agreement_pending') {
    return 'Agree terms'
  }
  if (state === 'draw_pending') {
    return 'Commit and reveal draw'
  }
  if (state === 'active') {
    return 'Collect contributions'
  }
  if (state === 'completed') {
    return 'Circle complete'
  }
  return 'Review circle'
}

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amountMinor / 100)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
