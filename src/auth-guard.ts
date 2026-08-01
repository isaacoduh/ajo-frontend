import { redirect } from '@tanstack/react-router'

import { readSession } from './api'

export function requireAuth() {
  if (typeof window === 'undefined') {
    return
  }

  if (!readSession()) {
    throw redirect({ to: '/login' })
  }
}

export function redirectAuthedHome() {
  if (typeof window === 'undefined') {
    return
  }

  if (readSession()) {
    throw redirect({ to: '/home' })
  }
}
