import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { createCircle, readSession } from '../api'

export const Route = createFileRoute('/circles/new')({ component: NewCirclePage })

function NewCirclePage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!readSession()) {
    void navigate({ to: '/login' })
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const amountMajor = Number(formData.get('contribution_amount'))
    const memberCount = Number(formData.get('member_count_target'))

    try {
      const circle = await createCircle({
        name: String(formData.get('name')).trim(),
        contribution_amount_minor: Math.round(amountMajor * 100),
        member_count_target: memberCount,
        cycle_count: memberCount,
        cadence: 'monthly',
        start_date: String(formData.get('start_date')),
      })
      void navigate({ to: '/circles/$circleId', params: { circleId: circle.id } })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create circle.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <a className="brand-mark" href="/home">
          Àjọ
        </a>
        <button className="dashboard-logout" type="button" onClick={() => void navigate({ to: '/home' })}>
          Back
        </button>
      </header>

      <section className="dashboard-section create-circle-section" aria-labelledby="create-circle-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">New circle</p>
            <h1 id="create-circle-title">Create a circle</h1>
          </div>
        </div>

        <form className="auth-form circle-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="circle-name">Name</label>
            <input id="circle-name" name="name" type="text" required maxLength={160} />
          </div>

          <div className="form-grid-two">
            <div className="field-group">
              <label htmlFor="circle-amount">Contribution</label>
              <input
                id="circle-amount"
                name="contribution_amount"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="circle-members">Members</label>
              <input id="circle-members" name="member_count_target" type="number" min="2" max="32" defaultValue="8" required />
            </div>
          </div>

          <div className="form-grid-two">
            <div className="field-group">
              <label htmlFor="circle-cadence">Cadence</label>
              <select id="circle-cadence" name="cadence" defaultValue="monthly" disabled>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="circle-start">Start date</label>
              <input id="circle-start" name="start_date" type="date" defaultValue={defaultStartDate()} required />
            </div>
          </div>

          {errorMessage ? (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create circle'}
          </button>
        </form>
      </section>
    </main>
  )
}

function defaultStartDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}
