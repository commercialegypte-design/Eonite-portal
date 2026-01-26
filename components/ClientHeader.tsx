'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LanguageToggle from '@/components/LanguageToggle'
import ThemeToggle from '@/components/ThemeToggle'
import { useLanguage } from '@/lib/LanguageContext'

interface ClientHeaderProps {
  profile: any
  onLogout: () => void
  notificationCount?: number
  unreadMessages?: number
}

export default function ClientHeader({ profile, onLogout, notificationCount = 0, unreadMessages = 0 }: ClientHeaderProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/dashboard', label: t('nav.dashboard') },
    { href: '/products', label: t('nav.products') },
    { href: '/catalog', label: t('nav.catalog') },
    { href: '/offers', label: t('nav.offers') },
    { href: '/messages', label: t('nav.messages'), badge: unreadMessages > 0 ? unreadMessages : null },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-700 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <img src="/logo.png" alt="EONITE" className="h-8 sm:h-10 w-auto" />
            </Link>
            <nav className="hidden md:flex gap-6">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm ${isActive(link.href)
                    ? 'font-semibold text-eonite-green border-b-2 border-eonite-green pb-1'
                    : 'text-gray-600 dark:text-gray-300 hover:text-eonite-green'
                    }`}
                >
                  {link.label}
                  {link.badge && link.badge > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <LanguageToggle />
            <div className="text-sm text-right">
              <div className="font-semibold dark:text-white">{profile?.contact_name}</div>
              <div className="text-gray-500 dark:text-gray-400 text-xs">{profile?.company_name}</div>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              {t('common.logout')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm ${isActive(link.href)
                  ? 'bg-eonite-green/10 text-eonite-green font-semibold'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {link.label}
                {link.badge && link.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <div className="border-t dark:border-gray-700 my-2 pt-2">
              <div className="px-4 py-2 text-sm">
                <div className="font-semibold dark:text-white">{profile?.contact_name}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">{profile?.company_name}</div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogout()
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
