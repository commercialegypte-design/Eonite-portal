'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ClientHeader from '@/components/ClientHeader'
import { formatDate, formatCurrency, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function ClientDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useLanguage()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [orderedProducts, setOrderedProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editingStockValue, setEditingStockValue] = useState(0)
  const [activeOffers, setActiveOffers] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Setup Real-time subscriptions once user is loaded
  useEffect(() => {
    if (!user) return

    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => loadInventory()
      )
      .subscribe()

    // Subscribe to orders for this specific client
    // We use a filter to ensure we get updates even if RLS is strict
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order Change Detected:', payload)
          // Simply reload orders whenever ANY change happens to orders table
          // RLS ensures we only see our own, but this ensures we catch the event
          loadOrders()
        }
      )
      .subscribe()

    const messagesChannel = supabase
      .channel('messages-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadUnreadMessages(user.id)
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => loadUnreadMessages(user.id)
      )
      .subscribe()

    return () => {
      inventoryChannel.unsubscribe()
      ordersChannel.unsubscribe()
      messagesChannel.unsubscribe()
    }
  }, [user])

  async function loadDashboardData() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      setProfile(profileData)

      await Promise.all([
        loadInventory(),
        loadOrderedProducts(),
        loadOrders(),
        loadNotifications(),
        loadUnreadMessages(currentUser.id),
        loadActiveOffers()
      ])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveOffers() {
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3)

    if (data) setActiveOffers(data)
  }

  async function loadInventory() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const { data } = await supabase
      .from('inventory')
      .select(`
        *,
        client_products (
          id,
          custom_name,
          client_stock,
          products (
            name,
            size
          )
        )
      `)
      .order('quantity', { ascending: true })

    if (data) {
      const userInventory = data.filter((inv: any) =>
        inv.client_products?.client_id === currentUser.id
      )
      setInventory(userInventory || [])
    }
  }

  async function loadOrderedProducts() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    // Get ordered products from orders
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        order_items (
          quantity,
          client_products (
            id,
            custom_name,
            client_stock,
            products (
              name,
              size,
              image_url
            )
          )
        )
      `)
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (data) {
      // Aggregate by product
      const productMap = new Map<string, any>()
      data.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const productId = item.client_products?.id
          if (!productId) return

          if (productMap.has(productId)) {
            const existing = productMap.get(productId)
            existing.totalOrdered += item.quantity
          } else {
            productMap.set(productId, {
              id: productId,
              name: item.client_products?.custom_name || item.client_products?.products?.name,
              size: item.client_products?.products?.size,
              imageUrl: item.client_products?.products?.image_url,
              totalOrdered: item.quantity,
              clientStock: item.client_products?.client_stock || 0
            })
          }
        })
      })
      setOrderedProducts(Array.from(productMap.values()))
    }
  }

  async function updateClientStock(productId: string, newStock: number) {
    const { error } = await (supabase
      .from('client_products') as any)
      .update({
        client_stock: newStock,
        client_stock_updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (!error) {
      setOrderedProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, clientStock: newStock } : p
      ))
      setEditingStockId(null)
    }
  }

  async function loadOrders() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client_products (
          custom_name,
          products (name)
        )
      `)
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to load orders:', error)
    }

    setOrders(data || [])
  }

  async function handleOrderClick(order: any) {
    setSelectedOrder(order)
    setLoadingItems(true)
    setOrderItems([])

    // Fetch order items for this order
    const { data: items, error } = await (supabase
      .from('order_items') as any)
      .select(`
        *,
        client_products (
          custom_name,
          products (name)
        )
      `)
      .eq('order_id', order.id)

    if (error) {
      console.error('Failed to load order items:', error)
    } else {
      setOrderItems(items || [])
    }
    setLoadingItems(false)
  }

  async function loadNotifications() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    setNotifications(data || [])
  }

  async function loadUnreadMessages(userId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('client_id', userId)
      .single() as any

    setUnreadMessages(data?.unread_count || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleUpdateStock(invId: string, newQuantity: number) {
    if (newQuantity < 0) return

    const { error } = await (supabase
      .from('inventory') as any)
      .update({
        quantity: newQuantity,
        last_updated: new Date().toISOString()
      })
      .eq('id', invId)

    if (error) {
      console.error('Error updating stock:', error)
      alert(t('common.error'))
    } else {
      loadInventory() // Refresh
    }
  }

  // Mini component for inline stock update
  function UpdateStockInput({ initialQuantity, onUpdate }: { initialQuantity: number, onUpdate: (q: number) => void }) {
    const [val, setVal] = useState(initialQuantity.toString())
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
      setVal(initialQuantity.toString())
    }, [initialQuantity])

    const handleBlur = () => {
      setIsEditing(false)
      const num = parseInt(val)
      if (!isNaN(num) && num !== initialQuantity) {
        onUpdate(num)
      } else {
        setVal(initialQuantity.toString())
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur()
      }
    }

    if (isEditing) {
      return (
        <input
          autoFocus
          type="number"
          className="w-20 px-2 py-1 text-right border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-eonite-green outline-none"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      )
    }

    return (
      <span
        onClick={() => setIsEditing(true)}
        className="font-bold text-xl cursor-pointer hover:text-eonite-green border-b border-dashed border-gray-300 hover:border-eonite-green transition-colors dark:text-white"
      >
        {initialQuantity}
      </span>
    )
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

  const lowStockItems = inventory.filter(inv =>
    inv.quantity <= inv.alert_threshold
  )
  const criticalStockItems = inventory.filter(inv =>
    inv.quantity <= inv.critical_threshold
  )
  const activeOrders = orders.filter(o =>
    o.status === 'production' || o.status === 'confirmed'
  )

  return (
    <div className="min-h-screen bg-eonite-beige dark:bg-gray-950">
      <ClientHeader
        profile={profile}
        onLogout={handleLogout}
        unreadMessages={unreadMessages}
      />

      {/* Hero Section with Cover Image */}
      <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
        <img
          src="/eonite-cover.png"
          alt="EONITE"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
              {t('dashboard.welcome')} {profile?.contact_name?.split(' ')[0]}
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/90">{t('dashboard.clientSubtitle')}</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Special Offers Section */}
        {activeOffers.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-tags text-eonite-green"></i>
                {t('offers.title') || 'Special Offers'}
              </h2>
              <Link href="/offers" className="text-sm font-semibold text-eonite-green hover:underline flex items-center gap-1">
                {t('common.viewAll') || 'View All'}
                <i className="fas fa-arrow-right text-xs"></i>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeOffers.map(offer => (
                <Link href="/offers" key={offer.id} className="group block bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {offer.discount_percent && (
                      <div className="absolute top-3 left-3 bg-white/95 text-eonite-green font-bold text-xs px-2 py-1 rounded shadow-lg">
                        {offer.discount_percent}% OFF
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1 truncate group-hover:text-eonite-green transition-colors">
                      {offer.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      {offer.discount_code && (
                        <div className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {offer.discount_code}
                        </div>
                      )}
                      <span className="text-xs text-eonite-green font-medium">
                        {t('common.limitedTime') || 'Limited Time'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {criticalStockItems.length > 0 && (
          <Card className="mb-6 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <CardHeader>
              <CardTitle className="text-red-800 dark:text-red-400 flex items-center gap-2">
                🚨 {t('dashboard.criticalStock')}
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-400">
                {criticalStockItems.length} {t('dashboard.criticalStockDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {criticalStockItems.map(inv => (
                <div key={inv.id} className="mb-3 last:mb-0">
                  <div className="font-semibold dark:text-white">
                    {inv.client_products?.custom_name || inv.client_products?.products?.name}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {t('dashboard.currentStock')}: <strong>{inv.quantity} {t('dashboard.bags')}</strong>
                  </div>
                </div>
              ))}
              <Button className="mt-4" size="sm">
                {t('dashboard.orderNow')}
              </Button>
            </CardContent>
          </Card>
        )}

        {lowStockItems.length > 0 && criticalStockItems.length === 0 && (
          <Card className="mb-6 border-eonite-green/50 dark:border-eonite-green/40 bg-eonite-green/10 dark:bg-eonite-green/10">
            <CardHeader>
              <CardTitle className="text-eonite-green-dark dark:text-eonite-green-light flex items-center gap-2">
                ⚠️ {t('dashboard.lowStock')}
              </CardTitle>
              <CardDescription className="text-eonite-green dark:text-eonite-green-light/80">
                {lowStockItems.length} {t('dashboard.lowStockDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.map(inv => (
                <div key={inv.id} className="flex justify-between items-center mb-2 last:mb-0">
                  <div>
                    <div className="font-semibold text-sm dark:text-white">
                      {inv.client_products?.custom_name || inv.client_products?.products?.name}
                    </div>
                    <div className="text-xs text-eonite-green dark:text-eonite-green-light">
                      {t('products.currentStock')}: {inv.quantity} {t('dashboard.bags')}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('dashboard.order')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardDescription>{t('dashboard.registeredProducts')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-eonite-green">
                {inventory.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {lowStockItems.length} {t('dashboard.inLowStock')}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardDescription>{t('dashboard.activeOrders')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-eonite-green">
                {activeOrders.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.inProductionOrConfirmed')}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardDescription>{t('dashboard.totalOrdered')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-eonite-green">
                {orders.reduce((sum, o) => sum + (o.quantity || 0), 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.bagsThisYear')}
              </div>
            </CardContent>
          </Card>
        </div>



        {/* My Stock Section (Renamed from My Products) */}
        <Card className="mb-8 dark:bg-gray-900 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="dark:text-white flex items-center gap-2">
                <i className="fas fa-warehouse text-eonite-green"></i>
                {language === 'fr' ? 'Mon Stock' : 'My Stock'}
              </CardTitle>
              <CardDescription>{t('dashboard.manageStock') || 'Manage your stock levels'}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadOrderedProducts} className="h-8 w-8 p-0">
              <i className="fas fa-sync-alt text-gray-500 hover:text-eonite-green transition-colors"></i>
            </Button>
          </CardHeader>
          <CardContent>
            {orderedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="fas fa-box-open text-3xl mb-2 text-gray-300"></i>
                <p>{t('dashboard.noOrderedProducts') || 'No products in stock'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orderedProducts.map(product => (
                  <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-eonite-green/30 dark:hover:border-eonite-green/30 transition-all">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-eonite-green/20 to-eonite-green/5 dark:from-eonite-green/30 dark:to-eonite-green/10 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <i className="fas fa-box text-eonite-green"></i>
                        )}
                      </div>
                      <div>
                        <div className="font-bold dark:text-white">{product.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {product.size && `${product.size} • `}
                          {product.totalOrdered.toLocaleString()} {t('dashboard.bags')} {language === 'fr' ? 'commandés' : 'ordered'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      {/* Editable Client Stock */}
                      <div className="px-4 py-3 bg-eonite-green/10 dark:bg-eonite-green/20 rounded-xl">
                        <div className="text-xs text-eonite-green-dark dark:text-eonite-green-light font-semibold mb-1">
                          <i className="fas fa-warehouse mr-1"></i>
                          {language === 'fr' ? 'Mon Stock' : 'My Stock'}
                        </div>
                        {editingStockId === product.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editingStockValue}
                              onChange={(e) => setEditingStockValue(parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-right border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-eonite-green outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => updateClientStock(product.id, editingStockValue)}
                              className="p-1 bg-eonite-green text-white rounded hover:bg-eonite-green-dark"
                            >
                              <i className="fas fa-check text-xs"></i>
                            </button>
                            <button
                              onClick={() => setEditingStockId(null)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingStockId(product.id)
                              setEditingStockValue(product.clientStock)
                            }}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <span className="text-xl font-bold text-eonite-green-dark dark:text-eonite-green-light">
                              {product.clientStock.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500">{t('dashboard.bags')}</span>
                            <i className="fas fa-edit text-gray-400 group-hover:text-eonite-green text-xs"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8 dark:bg-gray-900 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="dark:text-white">{t('dashboard.recentOrders')}</CardTitle>
              <CardDescription>{t('dashboard.trackOrders')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadOrders} className="h-8 w-8 p-0">
              <i className="fas fa-sync-alt text-gray-500 hover:text-eonite-green transition-colors"></i>
            </Button>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('dashboard.noOrders')}
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="border dark:border-gray-700 rounded-lg p-4 hover:border-eonite-green dark:hover:border-eonite-green transition dark:bg-gray-800/50 cursor-pointer hover:shadow-lg"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold dark:text-white">
                          {t('dashboard.orderNumber')} {order.order_number}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {order.client_products?.custom_name || order.client_products?.products?.name}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">{t('dashboard.quantity')}</div>
                        <div className="font-semibold dark:text-white">{order.quantity?.toLocaleString()} {t('dashboard.bags')}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">{t('dashboard.amount')}</div>
                        <div className="font-semibold dark:text-white">{formatCurrency(order.total_ttc)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">{t('dashboard.date')}</div>
                        <div className="font-semibold dark:text-white">{formatDate(order.created_at)}</div>
                      </div>
                    </div>
                    {order.status === 'production' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="dark:text-gray-300">{t('dashboard.production')}</span>
                          <span className="font-semibold dark:text-white">{order.production_progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-eonite-green h-2 rounded-full transition-all"
                            style={{ width: `${order.production_progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main >

      {/* Order Details Modal */}
      {
        selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md" onClick={() => setSelectedOrder(null)}>
            <Card className="w-full max-w-lg bg-white dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
              <CardHeader className="border-b border-gray-200 dark:border-white/5 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-eonite-green to-eonite-green-dark flex items-center justify-center text-white">
                      <i className="fas fa-receipt"></i>
                    </div>
                    {t('dashboard.orderNumber')} {selectedOrder.order_number}
                  </CardTitle>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(selectedOrder.status)}`}>
                  {getOrderStatusLabel(selectedOrder.status)}
                </span>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Products List */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                  <div className="text-sm text-gray-600 dark:text-gray-400 p-3 border-b border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-black/20">
                    {language === 'fr' ? 'Produits' : 'Products'}
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-white/5">
                    {loadingItems ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-circle-notch fa-spin mr-2"></i>
                        {language === 'fr' ? 'Chargement...' : 'Loading...'}
                      </div>
                    ) : orderItems.length > 0 ? (
                      orderItems.map((item: any, index: number) => (
                        <div key={index} className="p-3 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.client_products?.custom_name || item.client_products?.products?.name || `Product ${index + 1}`}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.quantity?.toLocaleString()} × {formatCurrency(item.unit_price)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-eonite-green">{formatCurrency(item.total_price)}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {selectedOrder.client_products?.custom_name || selectedOrder.client_products?.products?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedOrder.quantity?.toLocaleString()} × {formatCurrency(selectedOrder.unit_price)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-eonite-green">{formatCurrency(selectedOrder.total_ht)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Totals */}
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Total HT' : 'Subtotal'}</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.total_ht)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.total_ttc - selectedOrder.total_ht)}</span>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-white/10 my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{language === 'fr' ? 'Total TTC' : 'Total'}</span>
                    <span className="text-xl font-bold text-eonite-green">{formatCurrency(selectedOrder.total_ttc)}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'fr' ? 'Date de commande' : 'Order Date'}</div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatDate(selectedOrder.created_at)}</div>
                  </div>
                  {selectedOrder.estimated_completion && (
                    <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{language === 'fr' ? 'Livraison estimée' : 'Est. Delivery'}</div>
                      <div className="font-medium text-gray-900 dark:text-white">{formatDate(selectedOrder.estimated_completion)}</div>
                    </div>
                  )}
                </div>

                {/* Production Progress */}
                {selectedOrder.status === 'production' && (
                  <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">{t('dashboard.production')}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{selectedOrder.production_progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-eonite-green to-eonite-green-light h-3 rounded-full transition-all"
                        style={{ width: `${selectedOrder.production_progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</div>
                    <div className="text-gray-900 dark:text-white text-sm">{selectedOrder.notes}</div>
                  </div>
                )}

                {/* Payment Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                  <span className="text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Statut paiement' : 'Payment Status'}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedOrder.payment_status === 'paid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    : selectedOrder.payment_status === 'refunded'
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      : 'bg-eonite-green/20 text-eonite-green-dark dark:bg-eonite-green/20 dark:text-eonite-green-light'
                    }`}>
                    {selectedOrder.payment_status === 'paid'
                      ? (language === 'fr' ? 'Payé' : 'Paid')
                      : selectedOrder.payment_status === 'refunded'
                        ? (language === 'fr' ? 'Remboursé' : 'Refunded')
                        : (language === 'fr' ? 'En attente' : 'Pending')
                    }
                  </span>
                </div>

                {/* Close Button */}
                <Button
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
                  onClick={() => setSelectedOrder(null)}
                >
                  {t('common.close')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      }
    </div >
  )
}
