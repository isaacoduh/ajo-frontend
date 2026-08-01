import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast(message, variant = 'info') {
        const id = crypto.randomUUID()
        setToasts((current) => [...current, { id, message, variant }])
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }, 4200)
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.variant}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToasts() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToasts must be used within ToastProvider.')
  }
  return context
}
