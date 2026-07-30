import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import {
  type AuthMeResponse,
  type WalletActivityResponse,
  type WalletBalanceResponse,
  type WalletStatementResponse,
  createWalletTopup,
  createWalletWithdrawal,
  getMe,
  getWalletStatement,
  getWalletActivity,
  getWalletBalance,
  logout,
  logoutAll,
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
  const [walletMessage, setWalletMessage] = useState('')
  const [walletError, setWalletError] = useState('')
  const [statement, setStatement] = useState<WalletStatementResponse | null>(null)
  const [statementError, setStatementError] = useState('')
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false)
  const [isWithdrawalSubmitting, setIsWithdrawalSubmitting] = useState(false)
  const [isStatementLoading, setIsStatementLoading] = useState(false)
  const [isLogoutAllSubmitting, setIsLogoutAllSubmitting] = useState(false)

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

  async function refreshWallet() {
    const [balance, activity] = await Promise.all([
      getWalletBalance(),
      getWalletActivity(),
    ])

    setHomeData((current) => (current ? { ...current, balance, activity } : current))
  }

  async function handleWalletAction(
    event: FormEvent<HTMLFormElement>,
    action: 'topup' | 'withdrawal',
  ) {
    event.preventDefault()
    setWalletMessage('')
    setWalletError('')

    const form = event.currentTarget
    const formData = new FormData(form)
    const amountMajor = Number(formData.get('amount'))
    const currency = String(formData.get('currency') || 'GBP').trim().toUpperCase()
    const amountMinor = Math.round(amountMajor * 100)

    if (!Number.isFinite(amountMajor) || amountMinor <= 0) {
      setWalletError('Enter an amount greater than zero.')
      return
    }

    if (action === 'topup') {
      setIsTopupSubmitting(true)
    } else {
      setIsWithdrawalSubmitting(true)
    }

    try {
      const result =
        action === 'topup'
          ? await createWalletTopup(amountMinor, currency)
          : await createWalletWithdrawal(amountMinor, currency)

      await refreshWallet()
      form.reset()
      setWalletMessage(
        `${action === 'topup' ? 'Top-up' : 'Withdrawal'} ${result.state}: ${formatMinor(
          result.amount_minor,
          result.currency,
        )}.`,
      )
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Wallet action failed.')
    } finally {
      if (action === 'topup') {
        setIsTopupSubmitting(false)
      } else {
        setIsWithdrawalSubmitting(false)
      }
    }
  }

  async function handleStatementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatement(null)
    setStatementError('')
    setIsStatementLoading(true)

    const formData = new FormData(event.currentTarget)
    const period = String(formData.get('period')).trim()

    try {
      setStatement(await getWalletStatement(period))
    } catch (error) {
      setStatementError(error instanceof Error ? error.message : 'Could not load statement.')
    } finally {
      setIsStatementLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    void navigate({ to: '/login' })
  }

  async function handleLogoutAll() {
    setIsLogoutAllSubmitting(true)

    try {
      await logoutAll()
      void navigate({ to: '/login' })
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Could not log out all sessions.')
      setIsLogoutAllSubmitting(false)
    }
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

      <section className="dashboard-section" aria-labelledby="wallet-actions-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Wallet actions</p>
            <h2 id="wallet-actions-title">Move money</h2>
          </div>
        </div>

        <div className="wallet-action-grid">
          <form
            className="wallet-action-card"
            onSubmit={(event) => void handleWalletAction(event, 'topup')}
          >
            <div>
              <span>Top up</span>
              <strong>Add to wallet</strong>
              <p>Creates an initiated top-up and places the amount in pending balance.</p>
            </div>

            <WalletAmountFields idPrefix="topup" />

            <button className="button button-primary" type="submit" disabled={isTopupSubmitting}>
              {isTopupSubmitting ? 'Creating...' : 'Create top-up'}
            </button>
          </form>

          <form
            className="wallet-action-card"
            onSubmit={(event) => void handleWalletAction(event, 'withdrawal')}
          >
            <div>
              <span>Withdraw</span>
              <strong>Reserve payout</strong>
              <p>Creates an initiated withdrawal and reserves available funds as pending.</p>
            </div>

            <WalletAmountFields idPrefix="withdrawal" />

            <button
              className="button button-primary"
              type="submit"
              disabled={isWithdrawalSubmitting}
            >
              {isWithdrawalSubmitting ? 'Creating...' : 'Create withdrawal'}
            </button>
          </form>
        </div>

        {walletMessage ? (
          <p className="dashboard-success" role="status">
            {walletMessage}
          </p>
        ) : null}

        {walletError ? (
          <p className="auth-error dashboard-action-error" role="alert">
            {walletError}
          </p>
        ) : null}
      </section>

      <section className="dashboard-section" aria-labelledby="statement-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Statement</p>
            <h2 id="statement-title">View period</h2>
          </div>
        </div>

        <div className="statement-panel">
          <form className="statement-form" onSubmit={handleStatementSubmit}>
            <div className="field-group">
              <label htmlFor="statement-period">Period</label>
              <input
                id="statement-period"
                name="period"
                type="month"
                defaultValue={currentPeriod()}
                required
              />
            </div>

            <button className="button button-primary" type="submit" disabled={isStatementLoading}>
              {isStatementLoading ? 'Loading...' : 'View statement'}
            </button>
          </form>

          {statement ? (
            <div className="statement-summary">
              <div>
                <span>Opening</span>
                <strong>
                  {formatMinor(statement.opening_balance_minor, statement.currency)}
                </strong>
              </div>
              <div>
                <span>Movement</span>
                <strong>{formatSignedMinor(statement.movement_minor, statement.currency)}</strong>
              </div>
              <div>
                <span>Closing</span>
                <strong>
                  {formatMinor(statement.closing_balance_minor, statement.currency)}
                </strong>
              </div>
              <button
                className="button button-secondary statement-download"
                type="button"
                onClick={() => downloadStatement(statement)}
              >
                Download JSON
              </button>
            </div>
          ) : null}

          {statementError ? (
            <p className="auth-error dashboard-action-error" role="alert">
              {statementError}
            </p>
          ) : null}
        </div>
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

      <section className="dashboard-section account-danger" aria-labelledby="sessions-title">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2 id="sessions-title">Account access</h2>
          <p>Sign out every active session connected to this account.</p>
        </div>
        <button
          className="dashboard-logout"
          type="button"
          onClick={() => void handleLogoutAll()}
          disabled={isLogoutAllSubmitting}
        >
          {isLogoutAllSubmitting ? 'Logging out...' : 'Log out all sessions'}
        </button>
      </section>
    </main>
  )
}

function WalletAmountFields({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="wallet-fields">
      <div className="field-group">
        <label htmlFor={`${idPrefix}-amount`}>Amount</label>
        <input
          id={`${idPrefix}-amount`}
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          placeholder="25.00"
          required
        />
      </div>

      <div className="field-group">
        <label htmlFor={`${idPrefix}-currency`}>Currency</label>
        <select id={`${idPrefix}-currency`} name="currency" defaultValue="GBP">
          <option value="GBP">GBP</option>
        </select>
      </div>
    </div>
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

function currentPeriod() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function downloadStatement(statement: WalletStatementResponse) {
  const blob = new Blob([JSON.stringify(statement, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ajo-statement-${statement.period}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
