import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptCircleAgreement,
  changePassword,
  collectCircleDue,
  commitCircleDraw,
  completeCircle,
  createCircleInvite,
  createTopup,
  createWithdrawal,
  failLateContribution,
  getCircle,
  getCircleAgreements,
  getCircleContributions,
  getCircleDraw,
  getCircleLedger,
  getCircleRecords,
  getMe,
  getWalletActivity,
  getWalletBalance,
  listSessions,
  lockCircle,
  logoutAll,
  payoutCircleCycle,
  revealCircleDraw,
  revokeSession,
  updateMe,
} from './api'
import type {
  ChangePasswordInput,
  CircleAgreementInput,
  CircleInviteInput,
  UpdateMeInput,
  WalletTopupInput,
  WalletWithdrawalInput,
} from './api'

export const queryKeys = {
  me: ['me'] as const,
  sessions: ['sessions'] as const,
  walletBalance: ['wallet', 'balance'] as const,
  walletActivity: ['wallet', 'activity'] as const,
  circleWorkspace: (circleId: string) => ['circle', circleId, 'workspace'] as const,
}

export function useProfileQuery() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const [me, sessions] = await Promise.all([getMe(), listSessions()])
      return { me, sessions }
    },
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMeInput) => updateMe(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  })
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useLogoutAllMutation() {
  return useMutation({
    mutationFn: () => logoutAll(),
  })
}

export function useWalletBalanceQuery() {
  return useQuery({
    queryKey: queryKeys.walletBalance,
    queryFn: getWalletBalance,
  })
}

export function useWalletActivityQuery() {
  return useInfiniteQuery({
    queryKey: queryKeys.walletActivity,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getWalletActivity(10, pageParam),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })
}

export function useTopupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WalletTopupInput) => createTopup(input),
    onSuccess: () => invalidateWallet(queryClient),
  })
}

export function useWithdrawalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WalletWithdrawalInput) => createWithdrawal(input),
    onSuccess: () => invalidateWallet(queryClient),
  })
}

export function useCircleWorkspaceQuery(circleId: string) {
  return useQuery({
    queryKey: queryKeys.circleWorkspace(circleId),
    queryFn: async () => {
      const [me, circle, agreements, draw, contributions, ledger, records] = await Promise.all([
        getMe(),
        getCircle(circleId),
        getCircleAgreements(circleId),
        getCircleDraw(circleId),
        getCircleContributions(circleId),
        getCircleLedger(circleId),
        getCircleRecords(circleId),
      ])
      return { me, circle, agreements, draw, contributions, ledger, records }
    },
  })
}

export function useCircleActionMutations(circleId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.circleWorkspace(circleId) })

  return {
    invite: useMutation({
      mutationFn: (input: CircleInviteInput) => createCircleInvite(circleId, input),
    }),
    agreement: useMutation({
      mutationFn: (input: CircleAgreementInput) => acceptCircleAgreement(circleId, input),
      onSuccess: invalidate,
    }),
    lock: useMutation({
      mutationFn: () => lockCircle(circleId),
      onSuccess: invalidate,
    }),
    commitDraw: useMutation({
      mutationFn: (commitmentHash: string) => commitCircleDraw(circleId, commitmentHash),
      onSuccess: invalidate,
    }),
    revealDraw: useMutation({
      mutationFn: (salt: string) => revealCircleDraw(circleId, salt),
      onSuccess: invalidate,
    }),
    collectDue: useMutation({
      mutationFn: () => collectCircleDue(circleId),
      onSuccess: invalidate,
    }),
    payout: useMutation({
      mutationFn: (cycleId: string) => payoutCircleCycle(circleId, cycleId),
      onSuccess: invalidate,
    }),
    failLate: useMutation({
      mutationFn: (contributionId: string) => failLateContribution(circleId, contributionId),
      onSuccess: invalidate,
    }),
    complete: useMutation({
      mutationFn: () => completeCircle(circleId),
      onSuccess: invalidate,
    }),
  }
}

function invalidateWallet(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance })
  void queryClient.invalidateQueries({ queryKey: queryKeys.walletActivity })
}
