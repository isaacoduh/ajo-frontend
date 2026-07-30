export interface UserResponse {
  id: string
  email: string
  token_version: number
  created_at: string
}

export interface TokenPairResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  user: UserResponse
}

export interface AuthMeResponse {
  user: {
    id: string
    email: string
  }
  member: {
    id: string
    display_name: string | null
    country: string
    screening_state: 'pending' | 'clear' | 'review'
  }
}

export interface WalletBalanceResponse {
  currency: string
  available_minor: number
  pending_minor: number
}

export interface WalletActivityItemResponse {
  id: string
  journal_entry_id: string
  created_at: string
  description: string
  currency: string
  amount_minor: number
  direction: string
  wallet_balance_bucket: string
}

export interface WalletActivityResponse {
  items: WalletActivityItemResponse[]
  next_cursor: string | null
}

export interface CircleSummaryResponse {
  id: string
  name: string
  state: string
  currency: string
  contribution_amount_minor: number
  member_count_target: number
  cycle_count: number
  cadence: string
  start_date: string
  owner_member_id: string
  member_count: number
  agreed_count: number
  created_at: string
  locked_at: string | null
  completed_at: string | null
}

export interface CircleMemberResponse {
  member_id: string
  role: string
  status: string
  joined_at: string | null
}

export interface CircleDetailResponse extends CircleSummaryResponse {
  members: CircleMemberResponse[]
}

export interface CircleListResponse {
  items: CircleSummaryResponse[]
}

export interface CreateCircleInput {
  name: string
  contribution_amount_minor: number
  member_count_target: number
  cycle_count: number
  cadence: 'monthly'
  start_date: string
}

interface ProblemDetail {
  detail?: string
  title?: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const refreshSessionKey = 'ajo.refreshToken'

let accessToken: string | null = null

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface StoredSession {
  accessToken: string | null
  refreshToken: string | null
}

export function readSession(): StoredSession | null {
  const refreshToken = sessionStorage.getItem(refreshSessionKey)
  if (!accessToken && !refreshToken) {
    return null
  }
  return { accessToken, refreshToken }
}

export function saveSession(tokenPair: TokenPairResponse) {
  accessToken = tokenPair.access_token
  sessionStorage.setItem(refreshSessionKey, tokenPair.refresh_token)
}

export function clearSession() {
  accessToken = null
  sessionStorage.removeItem(refreshSessionKey)
}

export async function login(email: string, password: string): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  })
}

export async function getMe(): Promise<AuthMeResponse> {
  return authRequest<AuthMeResponse>('/auth/me')
}

export async function getWalletBalance(): Promise<WalletBalanceResponse> {
  return authRequest<WalletBalanceResponse>('/wallet/balance')
}

export async function getWalletActivity(limit = 5): Promise<WalletActivityResponse> {
  return authRequest<WalletActivityResponse>(`/wallet/activity?limit=${limit}`)
}

export async function listCircles(): Promise<CircleListResponse> {
  return authRequest<CircleListResponse>('/circles')
}

export async function getCircle(circleId: string): Promise<CircleDetailResponse> {
  return authRequest<CircleDetailResponse>(`/circles/${encodeURIComponent(circleId)}`)
}

export async function createCircle(input: CreateCircleInput): Promise<CircleDetailResponse> {
  return authRequest<CircleDetailResponse>('/circles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function logout() {
  const session = readSession()
  clearSession()

  if (!session?.refreshToken) {
    return
  }

  try {
    await apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
  } catch {
    // Local logout should not be blocked by a failed network request.
  }
}

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = readSession()

  if (!session) {
    throw new ApiError('Authentication required.', 401)
  }

  if (!session.accessToken) {
    if (!session.refreshToken) {
      throw new ApiError('Authentication required.', 401)
    }
    const refreshed = await refreshAccessToken(session.refreshToken)
    return apiRequest<T>(path, options, refreshed.access_token)
  }

  try {
    return await apiRequest<T>(path, options, session.accessToken)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !session.refreshToken) {
      throw error
    }

    const refreshed = await refreshAccessToken(session.refreshToken)
    return apiRequest<T>(path, options, refreshed.access_token)
  }
}

async function refreshAccessToken(refreshToken: string): Promise<TokenPairResponse> {
  try {
    const tokenPair = await apiRequest<TokenPairResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    saveSession(tokenPair)
    return tokenPair
  } catch (error) {
    clearSession()
    throw error
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  bearerToken?: string,
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }

  if (method !== 'GET' && method !== 'HEAD' && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', crypto.randomUUID())
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    method,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ProblemDetail
    return payload.detail ?? payload.title ?? 'Request failed.'
  } catch {
    return 'Request failed.'
  }
}
