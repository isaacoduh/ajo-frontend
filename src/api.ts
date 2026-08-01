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

export interface UpdateMeInput {
  display_name?: string | null
  country?: string | null
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

export interface SessionResponse {
  id: string
  family_id: string
  created_at: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  active: boolean
}

export interface SessionsResponse {
  sessions: SessionResponse[]
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

export interface WalletTopupInput {
  amount_minor: number
  currency: string
}

export interface WalletProviderActionResponse {
  type: string
  client_secret: string | null
  redirect_url: string | null
}

export interface WalletTopupResponse {
  id: string
  amount_minor: number
  currency: string
  state: string
  provider_action: WalletProviderActionResponse | null
}

export interface WalletWithdrawalInput {
  amount_minor: number
  currency: string
}

export interface WalletWithdrawalResponse {
  id: string
  amount_minor: number
  currency: string
  state: string
}

export interface StatementResponse {
  period: string
  currency: string
  opening_balance_minor: number
  movement_minor: number
  closing_balance_minor: number
  journal_entry_ids: string[]
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

export interface CircleInviteInput {
  email?: string | null
  expires_in_days: number
}

export interface CircleInviteResponse {
  id: string
  circle_id: string
  token: string
  email: string | null
  status: string
  expires_at: string
}

export interface CircleJoinInput {
  token: string
}

export interface CircleAgreementInput {
  contribution_amount_minor: number
  cadence: 'monthly'
  start_date: string
  payout_rules: Record<string, unknown>
}

export interface CircleAgreementResponse {
  id: string
  circle_id: string
  member_id: string
  contribution_amount_minor: number
  cadence: string
  start_date: string
  payout_rules: Record<string, unknown>
  accepted_at: string
}

export interface CircleAgreementListResponse {
  items: CircleAgreementResponse[]
}

export interface CircleDrawResponse {
  circle_id: string
  commitment_hash: string | null
  salt: string | null
  revealed_at: string | null
  payout_order: string[]
}

export interface CircleContributionResponse {
  id: string
  cycle_id: string
  member_id: string
  amount_minor: number
  status: string
  due_date: string
  payment_object_id: string | null
}

export interface CircleContributionListResponse {
  items: CircleContributionResponse[]
}

export interface CirclePayoutResponse {
  id: string
  circle_id: string
  cycle_id: string
  recipient_member_id: string
  amount_minor: number
  shortfall_minor: number
  status: string
  payment_object_id: string | null
  journal_entry_id: string | null
}

export interface CircleLedgerItemResponse {
  posting_id: string
  journal_entry_id: string
  created_at: string
  account_code: string
  description: string
  amount_minor: number
  side: string
}

export interface CircleLedgerResponse {
  items: CircleLedgerItemResponse[]
}

export interface CircleRecordsResponse {
  arrears_count: number
  shortfall_count: number
  arrears_minor: number
  shortfall_minor: number
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
  if (typeof window === 'undefined') {
    return null
  }
  const refreshToken = sessionStorage.getItem(refreshSessionKey)
  if (!accessToken && !refreshToken) {
    return null
  }
  return { accessToken, refreshToken }
}

export function saveSession(tokenPair: TokenPairResponse) {
  accessToken = tokenPair.access_token
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.setItem(refreshSessionKey, tokenPair.refresh_token)
}

export function clearSession() {
  accessToken = null
  if (typeof window === 'undefined') {
    return
  }
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

export async function updateMe(input: UpdateMeInput): Promise<AuthMeResponse> {
  return authRequest<AuthMeResponse>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function logoutAll(): Promise<void> {
  await authRequest<void>('/auth/logout-all', {
    method: 'POST',
  })
  clearSession()
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  return authRequest<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function listSessions(): Promise<SessionsResponse> {
  return authRequest<SessionsResponse>('/auth/sessions')
}

export async function revokeSession(sessionId: string): Promise<void> {
  return authRequest<void>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  })
}

export async function getWalletBalance(): Promise<WalletBalanceResponse> {
  return authRequest<WalletBalanceResponse>('/wallet/balance')
}

export async function getWalletActivity(limit = 5, cursor?: string | null): Promise<WalletActivityResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) {
    params.set('cursor', cursor)
  }
  return authRequest<WalletActivityResponse>(`/wallet/activity?${params.toString()}`)
}

export async function createTopup(input: WalletTopupInput): Promise<WalletTopupResponse> {
  return authRequest<WalletTopupResponse>('/wallet/topups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createWithdrawal(input: WalletWithdrawalInput): Promise<WalletWithdrawalResponse> {
  return authRequest<WalletWithdrawalResponse>('/wallet/withdrawals', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getStatement(period: string): Promise<StatementResponse> {
  return authRequest<StatementResponse>(`/statements/${encodeURIComponent(period)}`)
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

export async function createCircleInvite(circleId: string, input: CircleInviteInput): Promise<CircleInviteResponse> {
  return authRequest<CircleInviteResponse>(`/circles/${encodeURIComponent(circleId)}/invites`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function joinCircle(circleId: string, input: CircleJoinInput): Promise<CircleDetailResponse> {
  return authRequest<CircleDetailResponse>(`/circles/${encodeURIComponent(circleId)}/join`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function acceptCircleAgreement(circleId: string, input: CircleAgreementInput): Promise<CircleAgreementResponse> {
  return authRequest<CircleAgreementResponse>(`/circles/${encodeURIComponent(circleId)}/agreement`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getCircleAgreements(circleId: string): Promise<CircleAgreementListResponse> {
  return authRequest<CircleAgreementListResponse>(`/circles/${encodeURIComponent(circleId)}/agreement`)
}

export async function lockCircle(circleId: string): Promise<CircleDetailResponse> {
  return authRequest<CircleDetailResponse>(`/circles/${encodeURIComponent(circleId)}/lock`, {
    method: 'POST',
  })
}

export async function commitCircleDraw(circleId: string, commitmentHash: string): Promise<CircleDrawResponse> {
  return authRequest<CircleDrawResponse>(`/circles/${encodeURIComponent(circleId)}/draw/commit`, {
    method: 'POST',
    body: JSON.stringify({ commitment_hash: commitmentHash }),
  })
}

export async function revealCircleDraw(circleId: string, salt: string): Promise<CircleDrawResponse> {
  return authRequest<CircleDrawResponse>(`/circles/${encodeURIComponent(circleId)}/draw/reveal`, {
    method: 'POST',
    body: JSON.stringify({ salt }),
  })
}

export async function getCircleDraw(circleId: string): Promise<CircleDrawResponse> {
  return authRequest<CircleDrawResponse>(`/circles/${encodeURIComponent(circleId)}/draw`)
}

export async function collectCircleDue(circleId: string): Promise<CircleContributionListResponse> {
  return authRequest<CircleContributionListResponse>(`/circles/${encodeURIComponent(circleId)}/collect-due`, {
    method: 'POST',
  })
}

export async function getCircleContributions(circleId: string): Promise<CircleContributionListResponse> {
  return authRequest<CircleContributionListResponse>(`/circles/${encodeURIComponent(circleId)}/contributions`)
}

export async function payoutCircleCycle(circleId: string, cycleId: string): Promise<CirclePayoutResponse> {
  return authRequest<CirclePayoutResponse>(
    `/circles/${encodeURIComponent(circleId)}/cycles/${encodeURIComponent(cycleId)}/payout`,
    { method: 'POST' },
  )
}

export async function failLateContribution(circleId: string, contributionId: string): Promise<CircleContributionListResponse> {
  return authRequest<CircleContributionListResponse>(
    `/circles/${encodeURIComponent(circleId)}/contributions/${encodeURIComponent(contributionId)}/fail-late`,
    { method: 'POST' },
  )
}

export async function getCircleLedger(circleId: string): Promise<CircleLedgerResponse> {
  return authRequest<CircleLedgerResponse>(`/circles/${encodeURIComponent(circleId)}/ledger`)
}

export async function getCircleStatement(circleId: string, period: string): Promise<StatementResponse> {
  return authRequest<StatementResponse>(
    `/circles/${encodeURIComponent(circleId)}/statements/${encodeURIComponent(period)}`,
  )
}

export async function getCircleRecords(circleId: string): Promise<CircleRecordsResponse> {
  return authRequest<CircleRecordsResponse>(`/circles/${encodeURIComponent(circleId)}/records`)
}

export async function completeCircle(circleId: string): Promise<CircleDetailResponse> {
  return authRequest<CircleDetailResponse>(`/circles/${encodeURIComponent(circleId)}/complete`, {
    method: 'POST',
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
