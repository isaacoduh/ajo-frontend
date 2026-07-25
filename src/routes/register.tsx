import { createFileRoute } from '@tanstack/react-router'

import coverImage from '../../docs/assets/ajo-app-cover.png'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
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

          <form className="auth-form">
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
                required
              />
            </div>

            <p className="auth-terms">
              By creating an account, you agree to use Àjọ for real savings
              groups you are part of.
            </p>

            <button className="button button-primary auth-submit" type="submit">
              Create account
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
