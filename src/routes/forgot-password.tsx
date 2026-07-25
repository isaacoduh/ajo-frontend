import { createFileRoute } from '@tanstack/react-router'

import coverImage from '../../docs/assets/ajo-app-cover.png'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
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
          <p className="eyebrow">Reset access</p>
          <h1>Get back into your group.</h1>
          <p>
            Enter your email and we will help you return to your savings circle.
          </p>
        </div>
      </section>

      <section className="auth-panel-wrap" aria-labelledby="forgot-title">
        <div className="auth-panel">
          <p className="auth-kicker">Forgot password</p>
          <h2 id="forgot-title">Reset your password</h2>
          <p className="auth-intro">
            We will send reset instructions if the email is connected to an Àjọ
            account.
          </p>

          <form className="auth-form">
            <div className="field-group">
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <button className="button button-primary auth-submit" type="submit">
              Send reset link
            </button>
          </form>

          <p className="auth-footnote">
            Remembered it?{' '}
            <a className="auth-link" href="/login">
              Back to login
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
