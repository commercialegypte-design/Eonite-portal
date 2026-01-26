'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import ThemeToggle from '@/components/ThemeToggle'

interface AdminLayoutProps {
  children: ReactNode
  disablePadding?: boolean
}

export default function AdminLayout({ children, disablePadding = false }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { t } = useLanguage()

  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    lowStockAlerts: 0,
    unreadMessages: 0,
    totalClients: 0,
    totalOrders: 0,
    totalProducts: 0
  })

  useEffect(() => {
    loadUserAndStats()

    // Real-time subscription for new messages
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          // Reload stats when conversations change
          loadUnreadCount()
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          // Reload stats when new message arrives
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  async function loadUnreadCount() {
    const { data } = await supabase.from('conversations').select('unread_count')
    const unread = (data || []).reduce((sum, c: any) => sum + (c.unread_count || 0), 0)
    setStats(prev => ({ ...prev, unreadMessages: unread }))
  }

  async function loadUserAndStats() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .eq('id', currentUser.id)
      .single() as any

    if (!profile || (profile.role !== 'admin' && profile.role !== 'designer')) {
      router.push('/dashboard')
      return
    }

    setUser({ ...currentUser, ...(profile as any) })

    // Load stats
    const [inventoryRes, messagesRes, clientsRes, ordersRes, productsRes] = await Promise.all([
      supabase.from('inventory').select('quantity, alert_threshold'),
      supabase.from('conversations').select('unread_count'),
      supabase.from('profiles').select('id').eq('role', 'client'),
      supabase.from('orders').select('id'),
      supabase.from('products').select('id')
    ])

    const lowStock = (inventoryRes.data || []).filter((i: any) => i.quantity <= i.alert_threshold).length
    const unread = (messagesRes.data || []).reduce((sum, c: any) => sum + (c.unread_count || 0), 0)

    setStats({
      lowStockAlerts: lowStock,
      unreadMessages: unread,
      totalClients: clientsRes.data?.length || 0,
      totalOrders: ordersRes.data?.length || 0,
      totalProducts: productsRes.data?.length || 0
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { id: 'dashboard', href: '/admin/dashboard', icon: 'chart-line', label: t('nav.dashboard') },
    { id: 'orders', href: '/admin/orders', icon: 'shopping-cart', label: t('nav.orders'), badge: stats.totalOrders },
    { id: 'clients', href: '/admin/clients', icon: 'users', label: t('nav.clients'), badge: stats.totalClients },
    { id: 'inventory', href: '/admin/inventory', icon: 'warehouse', label: t('nav.inventory'), badge: stats.lowStockAlerts > 0 ? stats.lowStockAlerts : null, badgeColor: 'red' },
    { id: 'offers', href: '/admin/offers', icon: 'tags', label: t('nav.offers') },
    { id: 'products', href: '/admin/products', icon: 'boxes-stacked', label: t('nav.products'), badge: stats.totalProducts },
    { id: 'messages', href: '/admin/messages', icon: 'envelope', label: t('nav.messages'), badge: stats.unreadMessages > 0 ? stats.unreadMessages : null, badgeColor: 'red' },
  ]

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex h-screen overflow-hidden bg-eonite-beige dark:bg-gray-950">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 bg-white dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center justify-center flex-1">
            <img src="/logo.png" alt="EONITE" className="h-12 w-auto" />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-1">
          {menuItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition relative ${isActive(item.href)
                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 text-eonite-green border-l-4 border-eonite-green font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              <i className={`fas fa-${item.icon} w-5 text-eonite-green`}></i>
              <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className={`${item.badgeColor === 'red' ? 'bg-red-100 text-red-800' : 'bg-eonite-green/10 text-eonite-green'} text-xs px-2.5 py-1 rounded-full font-bold`}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="w-10 h-10 bg-eonite-green rounded-xl flex items-center justify-center text-white font-bold">
              {user?.contact_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.contact_name || 'Admin'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.admin')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition font-semibold"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 ${disablePadding ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
