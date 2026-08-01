import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { AppShell } from '../app-shell'
import { requireAuth } from '../auth-guard'
import {
  type WalletActivityItemResponse,
  type WalletProviderActionResponse,
} from '../api'
import { formatDate, formatMinor, formatSignedMinor, majorToMinor } from '../format'
import { useTopupMutation, useWalletActivityQuery, useWalletBalanceQuery, useWithdrawalMutation } from '../queries'
import { useToasts } from '../toasts'

export const Route = createFileRoute('/wallet')({ beforeLoad: requireAuth, component: WalletPage })

function WalletPage() {
  const navigate = useNavigate()
  const { showToast } = useToasts()
  const balanceQuery = useWalletBalanceQuery()
  const activityQuery = useWalletActivityQuery()
  const topupMutation = useTopupMutation()
  const withdrawalMutation = useWithdrawalMutation()
  const [providerAction, setProviderAction] = useState<WalletProviderActionResponse | null>(null)

  async function handleTopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProviderAction(null)
    const formData = new FormData(event.currentTarget)

    try {
      const topup = await topupMutation.mutateAsync({
        amount_minor: majorToMinor(formData.get('amount')),
        currency: String(formData.get('currency')).trim().toUpperCase(),
      })
      setProviderAction(topup.provider_action)
      showToast(`Top-up created: ${topup.state}.`, 'success')
      event.currentTarget.reset()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create top-up.', 'error')
    }
  }

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    try {
      const withdrawal = await withdrawalMutation.mutateAsync({
        amount_minor: majorToMinor(formData.get('amount')),
        currency: String(formData.get('currency')).trim().toUpperCase(),
      })
      showToast(`Withdrawal created: ${withdrawal.state}.`, 'success')
      event.currentTarget.reset()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create withdrawal.', 'error')
    }
  }

  async function loadMore() {
    if (!activityQuery.hasNextPage) {
      return
    }
    try {
      await activityQuery.fetchNextPage()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load more activity.', 'error')
    }
  }

  const balance = balanceQuery.data
  const activityItems = activityQuery.data?.pages.flatMap((page) => page.items) ?? []
  const error = balanceQuery.error ?? activityQuery.error

  if (!balance) {
    return (
      <main className="dashboard-shell">
        <p className={error ? 'auth-error dashboard-loading' : 'dashboard-loading'} role={error ? 'alert' : undefined}>
          {error instanceof Error ? error.message : 'Loading wallet...'}
        </p>
      </main>
    )
  }

  return (
    <AppShell
      title="Wallet"
      eyebrow="Money movement"
      action={
        <button className="button statement-download" type="button" onClick={() => void navigate({ to: '/wallet/statements' })}>
          Statements
        </button>
      }
    >
      <section className="dashboard-grid" aria-label="Wallet balances">
        <article className="dashboard-card">
          <span>Available</span>
          <strong>{formatMinor(balance.available_minor, balance.currency)}</strong>
          <p>Ready for contributions or withdrawal.</p>
        </article>
        <article className="dashboard-card">
          <span>Pending</span>
          <strong>{formatMinor(balance.pending_minor, balance.currency)}</strong>
          <p>Provider processing or unsettled movement.</p>
        </article>
        <article className="dashboard-card">
          <span>Currency</span>
          <strong>{balance.currency}</strong>
          <p>Wallet ledger denomination.</p>
        </article>
      </section>

      <section className="dashboard-section wallet-action-grid" aria-label="Wallet actions">
        <WalletAction title="Top up" description="Create a provider-backed wallet top-up." onSubmit={handleTopup} disabled={topupMutation.isPending} />
        <WalletAction title="Withdraw" description="Move available balance out of the wallet." onSubmit={handleWithdrawal} disabled={withdrawalMutation.isPending} />
      </section>

      {providerAction ? (
        <section className="dashboard-section">
          <ProviderAction action={providerAction} />
        </section>
      ) : null}

      <section className="dashboard-section" aria-labelledby="wallet-activity-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2 id="wallet-activity-title">Activity</h2>
          </div>
        </div>
        <ActivityList items={activityItems} />
        {activityQuery.hasNextPage ? (
          <button className="button statement-download load-more" type="button" disabled={activityQuery.isFetchingNextPage} onClick={() => void loadMore()}>
            {activityQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        ) : null}
      </section>
    </AppShell>
  )
}

function ProviderAction({ action }: { action: WalletProviderActionResponse }) {
  if (action.redirect_url) {
    return (
      <div className="dashboard-success provider-action">
        <span>Provider handoff</span>
        <a className="auth-link copy-value" href={action.redirect_url} rel="noreferrer" target="_blank">
          Open payment provider
        </a>
      </div>
    )
  }

  if (action.client_secret) {
    return (
      <div className="dashboard-success provider-action">
        <span>Provider client secret</span>
        <button className="copy-button" type="button" onClick={() => void navigator.clipboard?.writeText(action.client_secret ?? '')}>
          {action.client_secret}
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-success provider-action">
      <span>Provider action</span>
      <p>{action.type}</p>
    </div>
  )
}

function WalletAction({
  title,
  description,
  onSubmit,
  disabled,
}: {
  title: string
  description: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  disabled: boolean
}) {
  return (
    <article className="wallet-action-card">
      <div>
        <span>{title}</span>
        <strong>{description}</strong>
      </div>
      <form className="wallet-fields" onSubmit={onSubmit}>
        <div className="field-group">
          <label htmlFor={`${title}-amount`}>Amount</label>
          <input id={`${title}-amount`} name="amount" type="number" min="1" step="0.01" inputMode="decimal" required />
        </div>
        <div className="field-group">
          <label htmlFor={`${title}-currency`}>Currency</label>
          <input id={`${title}-currency`} name="currency" type="text" defaultValue="GBP" maxLength={3} required />
        </div>
        <button className="button button-primary" type="submit" disabled={disabled}>
          {disabled ? 'Working...' : title}
        </button>
      </form>
    </article>
  )
}

function ActivityList({ items }: { items: WalletActivityItemResponse[] }) {
  if (!items.length) {
    return (
      <div className="dashboard-empty">
        <strong>No wallet activity</strong>
        <p>Wallet movements will appear here after top-ups, withdrawals, and circle activity.</p>
      </div>
    )
  }

  return (
    <div className="activity-list">
      {items.map((item) => (
        <article className="activity-row" key={item.id}>
          <div>
            <strong>{item.description}</strong>
            <span>
              {formatDate(item.created_at)} · {item.wallet_balance_bucket}
            </span>
          </div>
          <p className={item.amount_minor < 0 ? 'amount-negative' : 'amount-positive'}>
            {formatSignedMinor(item.amount_minor, item.currency)}
          </p>
        </article>
      ))}
    </div>
  )
}
