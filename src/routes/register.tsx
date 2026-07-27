import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import coverImage from '../../docs/assets/ajo-app-cover.png'
import { register, saveSession } from '../api'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const firstName = String(formData.get('firstName')).trim()
    const lastName = String(formData.get('lastName')).trim()
    const email = String(formData.get('email')).trim().toLowerCase()
    const password = String(formData.get('password'))
    const displayName = [firstName, lastName].filter(Boolean).join(' ')

    try {
      const tokenPair = await register(email, password, displayName)
      saveSession(tokenPair)
      void navigate({ to: '/home' })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create account.')
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
          <p className="eyebrow">Start together</p>
          <h1>Create your savings space.</h1>
          <p>
            Bring family, friends, or your community group into one clear place
            for contributions and payouts.
          </p>
        </div>
      </section>

      <section className="auth-panel-wrap" aria-labelledby="register-title">
        <div className="auth-panel">
          <p className="auth-kicker">Create account</p>
          <h2 id="register-title">Join Àjọ</h2>
          <p className="auth-intro">
            Tell us who you are. You can create or join a savings group after
            this.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="register-first-name">First name</label>
                <input
                  id="register-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Folake"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="register-last-name">Last name</label>
                <input
                  id="register-last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Adeyemi"
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password"
                minLength={12}
                required
              />
            </div>

            <p className="auth-terms">
              By creating an account, you agree to use Àjọ for real savings
              groups you are part of.
            </p>

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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-footnote">
            Already have an account?{' '}
            <a className="auth-link" href="/login">
              Log in
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
