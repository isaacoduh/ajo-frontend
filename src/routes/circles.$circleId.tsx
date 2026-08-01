import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { AppShell } from '../app-shell'
import { requireAuth } from '../auth-guard'
import {
  type CircleDetailResponse,
  type CircleInviteResponse,
  type StatementResponse,
  getCircleStatement,
} from '../api'
import { currentPeriod, formatDate, formatDateTime, formatMinor, statusLabel } from '../format'
import { useCircleActionMutations, useCircleWorkspaceQuery } from '../queries'
import { useToasts } from '../toasts'

export const Route = createFileRoute('/circles/$circleId')({ beforeLoad: requireAuth, component: CircleDetailPage })

type Tab = 'overview' | 'members' | 'agreement' | 'draw' | 'contributions' | 'ledger' | 'statements' | 'records'

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members & invites' },
  { id: 'agreement', label: 'Agreement' },
  { id: 'draw', label: 'Draw' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'statements', label: 'Statements' },
  { id: 'records', label: 'Records' },
]

function CircleDetailPage() {
  const { circleId } = Route.useParams()
  const navigate = useNavigate()
  const { showToast } = useToasts()
  const workspaceQuery = useCircleWorkspaceQuery(circleId)
  const actions = useCircleActionMutations(circleId)
  const [statement, setStatement] = useState<StatementResponse | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [invite, setInvite] = useState<CircleInviteResponse | null>(null)
  const [computedCommitment, setComputedCommitment] = useState('')
  const [computedOrder, setComputedOrder] = useState<string[]>([])
  const [busyAction, setBusyAction] = useState('')

  const circle = workspaceQuery.data?.circle
  const agreements = workspaceQuery.data?.agreements ?? { items: [] }
  const draw = workspaceQuery.data?.draw ?? null
  const contributions = workspaceQuery.data?.contributions ?? { items: [] }
  const ledger = workspaceQuery.data?.ledger ?? { items: [] }
  const records = workspaceQuery.data?.records ?? null
  const currentMemberId = workspaceQuery.data?.me.member.id ?? ''
  const isOwner = circle?.owner_member_id === currentMemberId

  const cycles = useMemo(() => Array.from(new Set(contributions.items.map((item) => item.cycle_id))), [contributions.items])

  async function runAction(label: string, action: () => Promise<void>) {
    setBusyAction(label)
    try {
      await action()
      showToast(`${label} complete.`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : `${label} failed.`, 'error')
    } finally {
      setBusyAction('')
    }
  }

  if (!circle) {
    return (
      <main className="dashboard-shell">
        <p className={workspaceQuery.error ? 'auth-error dashboard-loading' : 'dashboard-loading'} role={workspaceQuery.error ? 'alert' : undefined}>
          {workspaceQuery.error instanceof Error ? workspaceQuery.error.message : 'Loading circle...'}
        </p>
      </main>
    )
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    await runAction('Invite created', async () => {
      const nextInvite = await actions.invite.mutateAsync({
        email: String(formData.get('email')).trim() || null,
        expires_in_days: Number(formData.get('expires_in_days')),
      })
      setInvite(nextInvite)
      event.currentTarget.reset()
    })
  }

  async function handleAgreement() {
    await runAction('Agreement accepted', async () => {
      await actions.agreement.mutateAsync({
        contribution_amount_minor: circle.contribution_amount_minor,
        cadence: 'monthly',
        start_date: circle.start_date,
        payout_rules: { rule: 'commit_reveal_order' },
      })
    })
  }

  async function handleCommit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const commitmentHash = String(new FormData(event.currentTarget).get('commitment_hash')).trim()
    await runAction('Draw committed', async () => {
      await actions.commitDraw.mutateAsync(commitmentHash)
    })
  }

  async function handleReveal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const salt = String(new FormData(event.currentTarget).get('salt')).trim()
    await runAction('Draw revealed', async () => {
      await actions.revealDraw.mutateAsync(salt)
    })
  }

  async function handleDrawCompute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const salt = String(new FormData(event.currentTarget).get('salt')).trim()
    const memberIds = circle.members.map((member) => member.member_id)
    setComputedCommitment(await drawCommitmentHash(circle.id, memberIds, salt))
    setComputedOrder(await deterministicPayoutOrder(circle.id, memberIds, salt))
  }

  async function handleStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction('Statement loaded', async () => {
      setStatement(await getCircleStatement(circle.id, period))
    })
  }

  const lockGate = actionGate({
    isOwner,
    allowedState: circle.state === 'agreement_pending' || circle.state === 'recruiting',
    ready: circle.member_count >= circle.member_count_target && circle.agreed_count >= circle.member_count,
    reason: 'Lock is available after the target member count has joined and all current members have accepted terms.',
  })
  const inviteGate = actionGate({
    isOwner,
    allowedState: circle.state === 'recruiting',
    ready: circle.member_count < circle.member_count_target,
    reason: 'Invites are available while a recruiting circle still has open seats.',
  })
  const agreementGate = actionGate({
    isOwner: true,
    allowedState: circle.state === 'agreement_pending' || circle.state === 'recruiting',
    ready: !agreements.items.some((item) => item.member_id === currentMemberId),
    reason: 'You have already accepted the current terms or the circle is past agreement.',
  })
  const drawCommitGate = actionGate({
    isOwner,
    allowedState: circle.state === 'draw_pending',
    ready: !draw?.commitment_hash,
    reason: 'Draw commit is owner-only and available once the circle is locked and waiting for draw.',
  })
  const drawRevealGate = actionGate({
    isOwner,
    allowedState: circle.state === 'draw_pending',
    ready: Boolean(draw?.commitment_hash && !draw.revealed_at),
    reason: 'Reveal is available after the owner has committed a draw hash.',
  })
  const contributionGate = actionGate({
    isOwner,
    allowedState: circle.state === 'active',
    ready: true,
    reason: 'Contribution and payout operations are available to the owner while the circle is active.',
  })
  const completeGate = actionGate({
    isOwner,
    allowedState: circle.state === 'active',
    ready: contributions.items.length > 0,
    reason: 'Completion is owner-only and available after the circle has generated contribution cycles.',
  })

  return (
    <AppShell title={circle.name} eyebrow={statusLabel(circle.state)}>
      <section className="dashboard-grid" aria-label="Circle summary">
        <Summary label="Contribution" value={formatMinor(circle.contribution_amount_minor, circle.currency)} detail={circle.cadence} />
        <Summary label="Members" value={`${circle.member_count}/${circle.member_count_target}`} detail={`${circle.agreed_count} agreed`} />
        <Summary label="Start" value={formatDate(circle.start_date)} detail={`${circle.cycle_count} cycles`} />
      </section>

      <section className="dashboard-section">
        <div className="segmented-tabs" role="tablist" aria-label="Circle workspace">
          {tabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'tab-button tab-button-active' : 'tab-button'}
              key={tab.id}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' ? (
        <WorkspaceSection title="Overview" eyebrow="State">
          <div className="dashboard-empty">
            <strong>{nextAction(circle.state)}</strong>
            <p>
              Owner {shortId(circle.owner_member_id)} · Created {formatDateTime(circle.created_at)}
              {circle.locked_at ? ` · Locked ${formatDateTime(circle.locked_at)}` : ''}
              {circle.completed_at ? ` · Completed ${formatDateTime(circle.completed_at)}` : ''}
            </p>
          </div>
          {isOwner ? (
            <div className="action-row">
              <button className="button button-primary" type="button" disabled={busyAction !== '' || !lockGate.enabled} onClick={() => void runAction('Circle locked', async () => { await actions.lock.mutateAsync() })}>
                Lock circle
              </button>
              <button className="dashboard-logout danger-action" type="button" disabled={busyAction !== '' || !completeGate.enabled} onClick={() => void runAction('Circle completion', async () => { await actions.complete.mutateAsync() })}>
                Complete
              </button>
            </div>
          ) : null}
          <GateNote gate={lockGate.enabled ? completeGate : lockGate} />
        </WorkspaceSection>
      ) : null}

      {activeTab === 'members' ? (
        <WorkspaceSection title="Members & invites" eyebrow="Recruiting">
          <form className="action-panel" onSubmit={handleInvite}>
            <div className="field-group">
              <label htmlFor="invite-email">Email optional</label>
              <input id="invite-email" name="email" type="email" placeholder="member@example.com" />
            </div>
            <div className="field-group">
              <label htmlFor="invite-expiry">Expires in days</label>
              <input id="invite-expiry" name="expires_in_days" type="number" min="1" max="60" defaultValue="7" required />
            </div>
            <button className="button button-primary" type="submit" disabled={busyAction !== '' || !inviteGate.enabled}>Create invite</button>
          </form>
          {invite ? (
            <InviteResult invite={invite} />
          ) : null}
          <GateNote gate={inviteGate} />
          <MemberList circle={circle} />
          <button className="button statement-download" type="button" onClick={() => void navigate({ to: '/circles/$circleId/join', params: { circleId: circle.id } })}>
            Join with token
          </button>
        </WorkspaceSection>
      ) : null}

      {activeTab === 'agreement' ? (
        <WorkspaceSection title="Agreement" eyebrow="Terms">
          <div className="action-row">
            <button className="button button-primary" type="button" disabled={busyAction !== '' || !agreementGate.enabled} onClick={() => void handleAgreement()}>
              Accept matching terms
            </button>
          </div>
          <GateNote gate={agreementGate} />
          <Rows
            empty="No agreements yet."
            items={agreements.items.map((item) => ({
              id: item.id,
              title: shortId(item.member_id),
              meta: `${formatMinor(item.contribution_amount_minor, circle.currency)} · ${item.cadence} · ${formatDate(item.start_date)}`,
              value: formatDateTime(item.accepted_at),
            }))}
          />
        </WorkspaceSection>
      ) : null}

      {activeTab === 'draw' ? (
        <WorkspaceSection title="Draw" eyebrow="Commit reveal">
          <form className="action-panel" onSubmit={handleDrawCompute}>
            <div className="field-group">
              <label htmlFor="draw-compute-salt">Salt</label>
              <input id="draw-compute-salt" name="salt" type="text" minLength={8} required />
            </div>
            <button className="button statement-download" type="submit">Compute</button>
          </form>
          {computedCommitment ? <div className="dashboard-success">Commitment hash: <span className="copy-value">{computedCommitment}</span></div> : null}
          <form className="action-panel" onSubmit={handleCommit}>
            <div className="field-group">
              <label htmlFor="commitment-hash">Commitment hash</label>
              <input id="commitment-hash" name="commitment_hash" type="text" minLength={64} maxLength={64} defaultValue={computedCommitment} required />
            </div>
            <button className="button button-primary" type="submit" disabled={busyAction !== '' || !drawCommitGate.enabled}>Commit draw</button>
          </form>
          <form className="action-panel" onSubmit={handleReveal}>
            <div className="field-group">
              <label htmlFor="reveal-salt">Reveal salt</label>
              <input id="reveal-salt" name="salt" type="text" minLength={8} required />
            </div>
            <button className="button button-primary" type="submit" disabled={busyAction !== '' || !drawRevealGate.enabled}>Reveal draw</button>
          </form>
          <GateNote gate={drawCommitGate.enabled ? drawRevealGate : drawCommitGate} />
          <Rows
            empty="No payout order revealed."
            items={(draw?.payout_order.length ? draw.payout_order : computedOrder).map((memberId, index) => ({
              id: memberId,
              title: `${index + 1}. ${shortId(memberId)}`,
              meta: memberLabel(circle, memberId),
              value: draw?.revealed_at ? 'Revealed' : 'Preview',
            }))}
          />
        </WorkspaceSection>
      ) : null}

      {activeTab === 'contributions' ? (
        <WorkspaceSection title="Contributions" eyebrow="Obligations">
          <div className="action-row">
            <button className="button button-primary" type="button" disabled={busyAction !== '' || !contributionGate.enabled} onClick={() => void runAction('Due collection', async () => { await actions.collectDue.mutateAsync() })}>
              Collect due
            </button>
            {cycles.map((cycleId) => (
              <button className="dashboard-logout" key={cycleId} type="button" disabled={busyAction !== '' || !contributionGate.enabled} onClick={() => void runAction('Cycle payout', async () => { await actions.payout.mutateAsync(cycleId) })}>
                Payout {shortId(cycleId)}
              </button>
            ))}
          </div>
          <GateNote gate={contributionGate} />
          <Rows
            empty="No contributions generated."
            items={contributions.items.map((item) => ({
              id: item.id,
              title: `${memberLabel(circle, item.member_id)} · ${formatMinor(item.amount_minor, circle.currency)}`,
              meta: `Due ${formatDate(item.due_date)} · cycle ${shortId(item.cycle_id)}`,
              value: item.status,
              action: item.status === 'paid' ? (
                <button className="dashboard-logout danger-action" type="button" disabled={busyAction !== '' || !contributionGate.enabled} onClick={() => void runAction('Late failure', async () => { await actions.failLate.mutateAsync(item.id) })}>
                  Fail late
                </button>
              ) : null,
            }))}
          />
        </WorkspaceSection>
      ) : null}

      {activeTab === 'ledger' ? (
        <WorkspaceSection title="Ledger" eyebrow="Postings">
          <Rows
            empty="No ledger rows."
            items={ledger.items.map((item) => ({
              id: item.posting_id,
              title: item.description,
              meta: `${formatDateTime(item.created_at)} · ${item.account_code} · ${item.side}`,
              value: formatMinor(item.amount_minor, circle.currency),
            }))}
          />
        </WorkspaceSection>
      ) : null}

      {activeTab === 'statements' ? (
        <WorkspaceSection title="Statements" eyebrow="Circle month">
          <form className="statement-form" onSubmit={handleStatement}>
            <div className="field-group">
              <label htmlFor="circle-statement-period">Month</label>
              <input id="circle-statement-period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} required />
            </div>
            <button className="button button-primary" type="submit" disabled={busyAction !== ''}>Load statement</button>
          </form>
          {statement ? (
            <div className="statement-summary">
              <Summary label="Opening" value={formatMinor(statement.opening_balance_minor, statement.currency)} detail={statement.period} />
              <Summary label="Movement" value={formatMinor(statement.movement_minor, statement.currency)} detail={statement.period} />
              <Summary label="Closing" value={formatMinor(statement.closing_balance_minor, statement.currency)} detail={`${statement.journal_entry_ids.length} entries`} />
            </div>
          ) : null}
        </WorkspaceSection>
      ) : null}

      {activeTab === 'records' ? (
        <WorkspaceSection title="Records" eyebrow="Exceptions">
          <section className="dashboard-grid">
            <Summary label="Arrears count" value={String(records?.arrears_count ?? 0)} detail={formatMinor(records?.arrears_minor ?? 0, circle.currency)} />
            <Summary label="Shortfall count" value={String(records?.shortfall_count ?? 0)} detail={formatMinor(records?.shortfall_minor ?? 0, circle.currency)} />
            <Summary label="State" value={statusLabel(circle.state)} detail="Backend authoritative" />
          </section>
        </WorkspaceSection>
      ) : null}
    </AppShell>
  )
}

function WorkspaceSection({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="dashboard-section workspace-panel" aria-labelledby={`${title}-title`}>
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${title}-title`}>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="dashboard-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function GateNote({ gate }: { gate: ActionGate }) {
  if (gate.enabled) {
    return null
  }

  return <p className="quiet-note">{gate.reason}</p>
}

function InviteResult({ invite }: { invite: CircleInviteResponse }) {
  const joinPath = `/circles/${invite.circle_id}/join`
  const inviteLink = typeof window === 'undefined' ? joinPath : `${window.location.origin}${joinPath}?token=${encodeURIComponent(invite.token)}`

  return (
    <div className="dashboard-success invite-result">
      <span>Invite token</span>
      <button className="copy-button" type="button" onClick={() => void navigator.clipboard?.writeText(invite.token)}>
        {invite.token}
      </button>
      <span>Invite link</span>
      <button className="copy-button" type="button" onClick={() => void navigator.clipboard?.writeText(inviteLink)}>
        {inviteLink}
      </button>
    </div>
  )
}

function MemberList({ circle }: { circle: CircleDetailResponse }) {
  return (
    <Rows
      empty="No members."
      items={circle.members.map((member) => ({
        id: member.member_id,
        title: memberLabel(circle, member.member_id),
        meta: `${member.role} · ${member.joined_at ? formatDateTime(member.joined_at) : 'Pending'}`,
        value: member.status,
      }))}
    />
  )
}

function Rows({
  items,
  empty,
}: {
  items: { id: string; title: string; meta: string; value: string; action?: ReactNode }[]
  empty: string
}) {
  if (!items.length) {
    return (
      <div className="dashboard-empty">
        <strong>{empty}</strong>
      </div>
    )
  }
  return (
    <div className="activity-list">
      {items.map((item) => (
        <article className="activity-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
          <div className="row-actions">
            <p>{statusLabel(item.value)}</p>
            {item.action}
          </div>
        </article>
      ))}
    </div>
  )
}

function nextAction(state: string) {
  if (state === 'recruiting') {
    return 'Invite members and fill the circle'
  }
  if (state === 'agreement_pending') {
    return 'Collect matching member agreements'
  }
  if (state === 'draw_pending') {
    return 'Commit and reveal the payout draw'
  }
  if (state === 'active') {
    return 'Collect contributions and execute payouts'
  }
  if (state === 'completed') {
    return 'Circle complete'
  }
  return 'Review circle'
}

function memberLabel(circle: CircleDetailResponse, memberId: string) {
  const member = circle.members.find((item) => item.member_id === memberId)
  return `${member?.role === 'owner' ? 'Owner' : 'Member'} ${shortId(memberId)}`
}

function shortId(value: string) {
  return value.slice(0, 8)
}

interface ActionGate {
  enabled: boolean
  reason: string
}

function actionGate({
  isOwner,
  allowedState,
  ready,
  reason,
}: {
  isOwner: boolean
  allowedState: boolean
  ready: boolean
  reason: string
}): ActionGate {
  if (!isOwner) {
    return { enabled: false, reason: 'This action is only available to the circle owner.' }
  }
  if (!allowedState || !ready) {
    return { enabled: false, reason }
  }
  return { enabled: true, reason: '' }
}

async function drawCommitmentHash(circleId: string, memberIds: string[], salt: string) {
  const canonicalMembers = [...memberIds].sort().join(',')
  return sha256(`${circleId}:${canonicalMembers}:${salt}`)
}

async function deterministicPayoutOrder(circleId: string, memberIds: string[], salt: string) {
  const entries = await Promise.all(
    memberIds.map(async (memberId) => ({
      memberId,
      hash: await sha256(`${circleId}:${memberId}:${salt}`),
    })),
  )
  return entries.sort((left, right) => left.hash.localeCompare(right.hash)).map((entry) => entry.memberId)
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
