import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import coverImage from '../../docs/assets/ajo-app-cover.png'
import { login, saveSession } from '../api'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email')).trim().toLowerCase()
    const password = String(formData.get('password'))

    try {
      const tokenPair = await login(email, password)
      saveSession(tokenPair)
      void navigate({ to: '/home' })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not log in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section
        className="auth-story"
        style={{ backgroundImage: `url(${coverImage})` }}
        aria-label="Àjọ savings circle preview"
      >
        <a className="brand-mark" href="/">
          Àjọ
        </a>
        <div className="auth-story-copy">
          <p className="eyebrow">Welcome back</p>
          <h1>Keep your group moving.</h1>
          <p>
            Sign in to check contributions, see what is due, and follow whose
            turn is coming up next.
          </p>
        </div>
      </section>

      <section className="auth-panel-wrap" aria-labelledby="login-title">
        <div className="auth-panel">
          <p className="auth-kicker">Sign in</p>
          <h2 id="login-title">Log in to Àjọ</h2>
          <p className="auth-intro">
            Use the email and password connected to your savings group.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="login-password">Password</label>
                <a className="auth-link" href="/forgot-password">
                  Forgot?
                </a>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                required
              />
            </div>

            {errorMessage ? (
              <p className="auth-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="auth-footnote">
            New to Àjọ?{' '}
            <a className="auth-link" href="/register">
              Create an account
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
