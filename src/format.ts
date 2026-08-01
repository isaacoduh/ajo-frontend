export function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amountMinor / 100)
}

export function formatSignedMinor(amountMinor: number, currency: string) {
  const sign = amountMinor > 0 ? '+' : ''
  return `${sign}${formatMinor(amountMinor, currency)}`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function currentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

export function statusLabel(value: string) {
  return value.replaceAll('_', ' ')
}

export function majorToMinor(value: FormDataEntryValue | null) {
  return Math.round(Number(value) * 100)
}
