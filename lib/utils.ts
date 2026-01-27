import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (format === 'long') {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(d)
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

export function calculateTTC(ht: number, tvaRate: number = 20): number {
  return ht * (1 + tvaRate / 100)
}

export function calculateHT(ttc: number, tvaRate: number = 20): number {
  return ttc / (1 + tvaRate / 100)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getStockLevel(quantity: number, alertThreshold: number, criticalThreshold: number): 'high' | 'low' | 'critical' {
  if (quantity <= criticalThreshold) return 'critical'
  if (quantity <= alertThreshold) return 'low'
  return 'high'
}

export function getStockLevelColor(level: 'high' | 'low' | 'critical'): string {
  const colors = {
    high: 'bg-green-100 text-green-700',
    low: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  }
  return colors[level]
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    quote: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    production: 'bg-yellow-100 text-yellow-700',
    delivered_eonite: 'bg-purple-100 text-purple-700',
    available: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    quote: 'Quote',
    confirmed: 'Confirmed',
    production: 'In Production',
    delivered_eonite: 'On Delivery',
    available: 'Delivered',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function getURL() {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'

  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
  return url
}
