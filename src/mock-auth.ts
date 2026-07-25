export interface MockUser {
  email: string
  fullName: string
  password: string
}

export const mockUser: MockUser = {
  email: 'ufuomaoduh@gmail.com',
  fullName: 'Isaac Oduh',
  password: 'password1234',
}

const mockSessionKey = 'ajo.mockSession'

export function createMockSession(user: MockUser) {
  sessionStorage.setItem(
    mockSessionKey,
    JSON.stringify({
      email: user.email,
      fullName: user.fullName,
    }),
  )
}

export function readMockSession() {
  const rawSession = sessionStorage.getItem(mockSessionKey)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as Pick<MockUser, 'email' | 'fullName'>
  } catch {
    sessionStorage.removeItem(mockSessionKey)
    return null
  }
}

export function clearMockSession() {
  sessionStorage.removeItem(mockSessionKey)
}
