import { createFileRoute } from '@tanstack/react-router'

import coverImage from '../../docs/assets/ajo-app-cover.png'

export const Route = createFileRoute('/')({ component: LandingPage })

const trustSignals = [
  { label: 'Everyone sees', value: 'Who has paid and who is next' },
  { label: 'No confusion', value: 'Clear updates when money is moving' },
  { label: 'Made for us', value: 'Ajo, esusu, and savings groups' },
]

const steps = [
  {
    title: 'Start your group',
    copy: 'Choose how much everyone contributes, how often you meet, and who is joining.',
  },
  {
    title: 'Pay in on time',
    copy: 'Everyone gets a simple view of what is due, what has been paid, and what is still on the way.',
  },
  {
    title: 'Know whose turn it is',
    copy: 'The payout order is shown clearly, so nobody has to argue about who receives next.',
  },
]

const productNotes = [
  'See your balance and recent activity in one place.',
  'Know when a payment is due, paid, late, or still processing.',
  'Keep a simple record of contributions and payouts for the whole group.',
]

function LandingPage() {
  return (
    <main className="site-shell">
      <section
        className="hero"
        style={{ backgroundImage: `url(${coverImage})` }}
        aria-label="Àjọ app shown on a mobile phone inside a rotating savings circle"
      >
        <header className="site-header" aria-label="Primary navigation">
          <a className="brand-mark" href="/">
            Àjọ
          </a>
          <nav className="nav-links" aria-label="Landing page">
            <a href="#how-it-works">How it works</a>
            <a href="#trust">Why it helps</a>
            <a href="#join">Join</a>
          </nav>
        </header>

        <div className="hero-content">
          <p className="eyebrow">Save together without the stress</p>
          <h1>Àjọ</h1>
          <p className="hero-copy">
            A simple way for family, friends, and community groups to save
            together, track contributions, and know whose turn is next.
          </p>
          <div className="hero-actions" aria-label="Primary actions">
            <a className="button button-primary" href="#join">
              Start your group
            </a>
            <a className="button button-secondary" href="#how-it-works">
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="signal-band" id="trust" aria-label="Trust signals">
        {trustSignals.map((signal) => (
          <div className="signal" key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
          </div>
        ))}
      </section>

      <section className="section two-column" id="how-it-works">
        <div className="section-copy">
          <p className="eyebrow">How it works</p>
          <h2>Keep your savings group on the same page.</h2>
          <p>
            Àjọ helps your group stay organised without endless messages,
            spreadsheets, or awkward reminders. Everyone can see what is
            happening and what they need to do next.
          </p>
        </div>

        <div className="step-list" aria-label="How Àjọ works">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section product-section">
        <div className="product-frame">
          <img
            src={coverImage}
            alt="Àjọ mobile app wallet and circle progress screen"
          />
        </div>

        <div className="product-copy">
          <p className="eyebrow">Simple and transparent</p>
          <h2>Less chasing. More clarity.</h2>
          <ul>
            {productNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section closing-cta" id="join">
        <p className="eyebrow">Bring your people together</p>
        <h2>Start a savings circle your group can trust.</h2>
        <p>
          Invite your people, agree the amount, and let Àjọ help everyone stay
          clear on payments, payouts, and whose turn is coming up.
        </p>
        <a className="button button-primary" href="/welcome">
          Get started
        </a>
      </section>
    </main>
  )
}
