'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalClients: 0,
    totalOrders: 0,
    activeOrders: 0,
    totalRevenue: 0,
    lowStockAlerts: 0,
    unreadMessages: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single() as any

      if (profile?.role !== 'admin' && profile?.role !== 'designer') {
        router.push('/dashboard')
        return
      }

      setUser(currentUser)
      await loadDashboardData()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDashboardData() {
    const { count: clientsCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client')

    const { data: orders, count: ordersCount } = await supabase
      .from('orders')
      .select(`*, profiles!orders_client_id_fkey (company_name, contact_name)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10)

    const { count: activeCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['production', 'confirmed'])

    const { data: allOrders } = await supabase
      .from('orders')
      .select('total_ttc')
      .eq('payment_status', 'paid') as any

    const totalRevenue = allOrders?.reduce((sum: number, o: any) => sum + (o.total_ttc || 0), 0) || 0

    const { data: inventory } = await supabase
      .from('inventory')
      .select(`
        *,
        client_products (
          custom_name,
          profiles!client_products_client_id_fkey (company_name),
          products (name)
        )
      `) as any

    const lowStock = inventory?.filter((inv: any) => inv.quantity <= inv.alert_threshold) || []

    const { count: unreadCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gt('unread_count', 0)

    setStats({
      totalClients: clientsCount || 0,
      totalOrders: ordersCount || 0,
      activeOrders: activeCount || 0,
      totalRevenue,
      lowStockAlerts: lowStock.length,
      unreadMessages: unreadCount || 0
    })

    setRecentOrders(orders || [])
    setLowStockItems(lowStock.slice(0, 5))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-eonite-beige dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eonite-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <img src="/logo.png" alt="EONITE" className="h-12 w-auto mx-auto mb-2" />
          <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: t('dashboard.revenue'), value: formatCurrency(stats.totalRevenue), icon: 'fa-euro-sign' },
    { label: t('dashboard.totalOrders'), value: stats.totalOrders, icon: 'fa-box', subtext: `${stats.activeOrders} ${t('dashboard.inProgress')}` },
    { label: t('dashboard.totalClients'), value: stats.totalClients, icon: 'fa-users' },
    { label: t('admin.alerts'), value: stats.lowStockAlerts, icon: 'fa-bell', alert: stats.lowStockAlerts > 0 }
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('nav.dashboard')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.adminSubtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                  <i className={`fas ${stat.icon} text-white text-xl`}></i>
                </div>
                {stat.alert && (
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    !
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-eonite-green">{stat.value}</p>
              {stat.subtext && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.subtext}</p>
              )}
            </div>
          ))}
        </div>

        {/* Alerts Section */}
        {stats.lowStockAlerts > 0 ? (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
              <h3 className="text-xl font-black text-red-900 dark:text-red-300">
                {t('admin.urgentAlerts')} ({stats.lowStockAlerts})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockItems.map(inv => (
                <div key={inv.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                      <i className="fas fa-box text-orange-600 dark:text-orange-400"></i>
                    </div>
                    <div>
                      <span className="font-bold block text-sm dark:text-white">{inv.client_products?.profiles?.company_name}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {inv.client_products?.custom_name || inv.client_products?.products?.name} - {inv.quantity} {t('dashboard.bags')}
                      </span>
                    </div>
                  </div>
                  <Link href="/admin/inventory">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      {t('admin.treat')}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-700 rounded-2xl p-6 text-center">
            <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-5xl mb-3"></i>
            <h3 className="text-xl font-black text-green-900 dark:text-green-300">{t('admin.allGood')}</h3>
            <p className="text-green-700 dark:text-green-400">{t('admin.noAlerts')}</p>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-box text-eonite-green"></i>
              {t('dashboard.recentOrders')}
            </h3>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-inbox text-5xl mb-4 text-gray-300"></i>
              <p className="font-semibold">{t('dashboard.noOrders')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b-2 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{t('dashboard.orderNumber')}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{t('dashboard.date')}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{t('dashboard.amount')}</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-6 py-4 font-mono text-sm font-bold dark:text-white">{order.order_number}</td>
                      <td className="px-6 py-4 font-medium dark:text-gray-200">{order.profiles?.company_name || 'Client'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</td>
                      <td className="px-6 py-4 font-bold text-green-600">{formatCurrency(order.total_ttc)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${order.status === 'paid' || order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'production'
                            ? 'bg-eonite-green/20 text-eonite-green-dark'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <i className="fas fa-bolt text-eonite-green"></i>
            {t('dashboard.quickActions')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/clients">
              <button className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-eonite-green/10 to-eonite-green/20 dark:from-eonite-green/20 dark:to-eonite-green/10 border-2 border-eonite-green/30 dark:border-eonite-green/40 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <i className="fas fa-users text-eonite-green text-2xl"></i>
                <span className="font-bold text-gray-800 dark:text-gray-200">{t('nav.clients')}</span>
              </button>
            </Link>
            <Link href="/admin/inventory">
              <button className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-eonite-green/10 to-eonite-green/20 dark:from-eonite-green/20 dark:to-eonite-green/10 border-2 border-eonite-green/30 dark:border-eonite-green/40 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative">
                <i className="fas fa-warehouse text-eonite-green text-2xl"></i>
                <span className="font-bold text-gray-800 dark:text-gray-200">{t('nav.inventory')}</span>
                {stats.lowStockAlerts > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {stats.lowStockAlerts}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/admin/products">
              <button className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-eonite-green/10 to-eonite-green/20 dark:from-eonite-green/20 dark:to-eonite-green/10 border-2 border-eonite-green/30 dark:border-eonite-green/40 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <i className="fas fa-boxes-stacked text-eonite-green text-2xl"></i>
                <span className="font-bold text-gray-800 dark:text-gray-200">{t('nav.products')}</span>
              </button>
            </Link>
            <Link href="/admin/messages">
              <button className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-eonite-green/10 to-eonite-green/20 dark:from-eonite-green/20 dark:to-eonite-green/10 border-2 border-eonite-green/30 dark:border-eonite-green/40 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative">
                <i className="fas fa-envelope text-eonite-green text-2xl"></i>
                <span className="font-bold text-gray-800 dark:text-gray-200">{t('nav.messages')}</span>
                {stats.unreadMessages > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {stats.unreadMessages}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
