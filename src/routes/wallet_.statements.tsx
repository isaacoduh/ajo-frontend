import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { AppShell } from '../app-shell'
import { requireAuth } from '../auth-guard'
import { type StatementResponse, getStatement, readSession } from '../api'
import { currentPeriod, formatMinor } from '../format'
import { useToasts } from '../toasts'

export const Route = createFileRoute('/wallet_/statements')({ beforeLoad: requireAuth, component: WalletStatementsPage })

function WalletStatementsPage() {
  const navigate = useNavigate()
  const { showToast } = useToasts()
  const [statement, setStatement] = useState<StatementResponse | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!readSession()) {
      void navigate({ to: '/login' })
    }
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    try {
      const nextStatement = await getStatement(period)
      setStatement(nextStatement)
      showToast('Statement loaded.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load statement.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppShell title="Wallet statements" eyebrow="Monthly statement">
      <section className="dashboard-section statement-panel">
        <form className="statement-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="wallet-statement-period">Month</label>
            <input id="wallet-statement-period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} required />
          </div>
          <button className="button button-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load statement'}
          </button>
        </form>

        {statement ? (
          <div className="statement-summary">
            <div>
              <span>Opening</span>
              <strong>{formatMinor(statement.opening_balance_minor, statement.currency)}</strong>
            </div>
            <div>
              <span>Movement</span>
              <strong>{formatMinor(statement.movement_minor, statement.currency)}</strong>
            </div>
            <div>
              <span>Closing</span>
              <strong>{formatMinor(statement.closing_balance_minor, statement.currency)}</strong>
            </div>
            <div>
              <span>Entries</span>
              <strong>{statement.journal_entry_ids.length}</strong>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  )
}
