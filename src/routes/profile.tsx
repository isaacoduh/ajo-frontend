import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'

import { AppShell } from '../app-shell'
import { requireAuth } from '../auth-guard'
import { formatDateTime } from '../format'
import {
  useChangePasswordMutation,
  useLogoutAllMutation,
  useProfileQuery,
  useRevokeSessionMutation,
  useUpdateProfileMutation,
} from '../queries'
import { useToasts } from '../toasts'

export const Route = createFileRoute('/profile')({ beforeLoad: requireAuth, component: ProfilePage })

function ProfilePage() {
  const navigate = useNavigate()
  const { showToast } = useToasts()
  const profileQuery = useProfileQuery()
  const updateProfile = useUpdateProfileMutation()
  const passwordMutation = useChangePasswordMutation()
  const revokeMutation = useRevokeSessionMutation()
  const logoutAllMutation = useLogoutAllMutation()

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    try {
      await updateProfile.mutateAsync({
        display_name: String(formData.get('display_name')).trim() || null,
        country: String(formData.get('country')).trim().toUpperCase() || null,
      })
      showToast('Profile updated.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update profile.', 'error')
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await passwordMutation.mutateAsync({
        current_password: String(formData.get('current_password')),
        new_password: String(formData.get('new_password')),
      })
      form.reset()
      showToast('Password changed.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not change password.', 'error')
    }
  }

  async function handleRevoke(sessionId: string) {
    try {
      await revokeMutation.mutateAsync(sessionId)
      showToast('Session revoked.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not revoke session.', 'error')
    }
  }

  async function handleLogoutAll() {
    try {
      await logoutAllMutation.mutateAsync()
      showToast('Logged out on all devices.', 'success')
      void navigate({ to: '/login' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not log out all devices.', 'error')
    }
  }

  const me = profileQuery.data?.me
  const sessions = profileQuery.data?.sessions ?? { sessions: [] }

  if (!me) {
    return (
      <main className="dashboard-shell">
        <p className={profileQuery.error ? 'auth-error dashboard-loading' : 'dashboard-loading'} role={profileQuery.error ? 'alert' : undefined}>
          {profileQuery.error instanceof Error ? profileQuery.error.message : 'Loading profile...'}
        </p>
      </main>
    )
  }

  return (
    <AppShell title="Profile and security" eyebrow="Account">
      <section className="dashboard-section settings-grid">
        <article className="wallet-action-card">
          <div>
            <span>Profile</span>
            <strong>Member details</strong>
            <p>{me.user.email}</p>
          </div>
          <form className="auth-form compact-form" onSubmit={handleProfileSubmit}>
            <div className="field-group">
              <label htmlFor="profile-display-name">Display name</label>
              <input id="profile-display-name" name="display_name" type="text" defaultValue={me.member.display_name ?? ''} maxLength={200} />
            </div>
            <div className="field-group">
              <label htmlFor="profile-country">Country</label>
              <input id="profile-country" name="country" type="text" defaultValue={me.member.country} minLength={2} maxLength={2} />
            </div>
            <button className="button button-primary" type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </article>

        <article className="wallet-action-card">
          <div>
            <span>Security</span>
            <strong>Change password</strong>
          </div>
          <form className="auth-form compact-form" onSubmit={handlePasswordSubmit}>
            <div className="field-group">
              <label htmlFor="current-password">Current password</label>
              <input id="current-password" name="current_password" type="password" autoComplete="current-password" required />
            </div>
            <div className="field-group">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" name="new_password" type="password" autoComplete="new-password" minLength={12} required />
            </div>
            <button className="button button-primary" type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Changing...' : 'Change password'}
            </button>
          </form>
        </article>
      </section>

      <section className="dashboard-section" aria-labelledby="sessions-title">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Devices</p>
            <h2 id="sessions-title">Sessions</h2>
          </div>
        </div>
        <div className="activity-list">
          {sessions.sessions.map((session) => (
            <article className="activity-row" key={session.id}>
              <div>
                <strong>{session.active ? 'Active session' : 'Inactive session'}</strong>
                <span>
                  Created {formatDateTime(session.created_at)} · Expires {formatDateTime(session.expires_at)}
                </span>
              </div>
              <button className="dashboard-logout" type="button" disabled={!session.active || (revokeMutation.isPending && revokeMutation.variables === session.id)} onClick={() => void handleRevoke(session.id)}>
                {revokeMutation.isPending && revokeMutation.variables === session.id ? 'Revoking...' : 'Revoke'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section account-danger">
        <div>
          <h2>Logout all devices</h2>
          <p>Revokes every refresh session for this account.</p>
        </div>
        <button className="dashboard-logout" type="button" disabled={logoutAllMutation.isPending} onClick={() => void handleLogoutAll()}>
          {logoutAllMutation.isPending ? 'Logging out...' : 'Logout all'}
        </button>
      </section>
    </AppShell>
  )
}
