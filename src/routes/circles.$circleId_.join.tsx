import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { AppShell } from '../app-shell'
import { requireAuth } from '../auth-guard'
import { joinCircle, readSession } from '../api'
import { useToasts } from '../toasts'

export const Route = createFileRoute('/circles/$circleId_/join')({ beforeLoad: requireAuth, component: CircleJoinPage })

function CircleJoinPage() {
  const { circleId } = Route.useParams()
  const navigate = useNavigate()
  const { showToast } = useToasts()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialToken, setInitialToken] = useState('')

  useEffect(() => {
    if (!readSession()) {
      void navigate({ to: '/login' })
    }
    setInitialToken(new URLSearchParams(window.location.search).get('token') ?? '')
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const token = String(new FormData(event.currentTarget).get('token')).trim()

    try {
      const circle = await joinCircle(circleId, { token })
      showToast('Circle joined.', 'success')
      void navigate({ to: '/circles/$circleId', params: { circleId: circle.id } })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not join circle.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell title="Join circle" eyebrow="Invite token">
      <section className="dashboard-section create-circle-section">
        <form className="auth-form circle-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="join-token">Invite token</label>
            <input id="join-token" name="token" type="text" minLength={16} maxLength={80} defaultValue={initialToken} required />
          </div>
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Joining...' : 'Join circle'}
          </button>
        </form>
        <p className="quiet-note">
          Joining is scoped from an existing circle URL because the backend requires a circle path id while validating the invite token.
        </p>
      </section>
    </AppShell>
  )
}
