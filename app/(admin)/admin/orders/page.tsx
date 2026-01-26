'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function AdminOrders() {
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useLanguage()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    checkAdminAndLoadOrders()

    // Real-time subscription for order updates
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadOrders()
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  async function checkAdminAndLoadOrders() {
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

    await loadOrders()
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_client_id_fkey (
          id,
          contact_name,
          company_name,
          email,
          phone
        ),
        client_products (
          custom_name,
          products (
            name,
            size
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load orders:', error)
    }

    setOrders(data || [])
    setLoading(false)
  }

  async function handleOrderClick(order: any) {
    setSelectedOrder(order)
    setLoadingItems(true)
    setOrderItems([])

    const { data: items, error } = await (supabase
      .from('order_items') as any)
      .select(`
        *,
        client_products (
          custom_name,
          products (name, size)
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

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdatingOrder(orderId)

    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Set actual completion date when delivered
    if (newStatus === 'available') {
      updateData.actual_completion = new Date().toISOString()
    }

    const { error } = await (supabase
      .from('orders') as any)
      .update(updateData)
      .eq('id', orderId)

    if (error) {
      console.error('Failed to update order:', error)
    } else {
      await loadOrders()
    }

    setUpdatingOrder(null)
  }

  async function updateProductionProgress(orderId: string, progress: number) {
    const { error } = await (supabase
      .from('orders') as any)
      .update({
        production_progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      console.error('Failed to update progress:', error)
    } else {
      await loadOrders()
    }
  }

  async function updatePaymentStatus(orderId: string, newStatus: string) {
    const { error } = await (supabase
      .from('orders') as any)
      .update({
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      console.error('Failed to update payment status:', error)
      alert(language === 'fr' ? 'Erreur lors de la mise à jour' : 'Failed to update')
    } else {
      // Update local state
      setSelectedOrder({ ...selectedOrder, payment_status: newStatus })
      await loadOrders()
    }
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

  const statuses = [
    { value: 'all', label: language === 'fr' ? 'Toutes' : 'All' },
    { value: 'confirmed', label: language === 'fr' ? 'Confirmées' : 'Confirmed' },
    { value: 'production', label: language === 'fr' ? 'En production' : 'In Production' },
    { value: 'delivered_eonite', label: language === 'fr' ? 'Chez EONITE' : 'At EONITE' },
    { value: 'available', label: language === 'fr' ? 'Livrées' : 'Delivered' },
    { value: 'cancelled', label: language === 'fr' ? 'Annulées' : 'Cancelled' },
  ]

  const filteredOrders = selectedStatus === 'all'
    ? orders
    : orders.filter(o => o.status === selectedStatus)

  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    production: orders.filter(o => o.status === 'production').length,
    delivered: orders.filter(o => o.status === 'available').length,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">
            {language === 'fr' ? 'Gestion des Commandes' : 'Order Management'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'fr' ? 'Suivez et gérez toutes les commandes clients' : 'Track and manage all client orders'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg border-l-4 border-eonite-green">
            <div className="text-sm text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Total' : 'Total'}</div>
            <div className="text-2xl font-bold text-eonite-green">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Confirmées' : 'Confirmed'}</div>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">{language === 'fr' ? 'En production' : 'In Production'}</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.production}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg border-l-4 border-green-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Livrées' : 'Delivered'}</div>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4">
          <div className="flex gap-2 flex-wrap">
            {statuses.map(status => (
              <Button
                key={status.value}
                variant={selectedStatus === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status.value)}
                className={selectedStatus === status.value ? "bg-eonite-green hover:bg-eonite-green-dark" : ""}
              >
                {status.label}
                {status.value !== 'all' && (
                  <span className="ml-2 text-xs opacity-70">
                    ({orders.filter(o => o.status === status.value).length})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-eonite-beige to-green-50 dark:from-gray-800 dark:to-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-shopping-cart text-eonite-green"></i>
              {language === 'fr' ? 'Commandes' : 'Orders'} ({filteredOrders.length})
            </h3>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>{language === 'fr' ? 'Aucune commande trouvée' : 'No orders found'}</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer" onClick={() => handleOrderClick(order)}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg dark:text-white">#{order.order_number}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-building w-4 text-eonite-green"></i>
                          <span className="font-semibold dark:text-gray-200">{order.profiles?.company_name || order.profiles?.contact_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-box w-4 text-eonite-green"></i>
                          <span>{order.client_products?.custom_name || order.client_products?.products?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-cubes w-4 text-eonite-green"></i>
                          <span>{order.quantity?.toLocaleString()} {language === 'fr' ? 'sacs' : 'bags'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-euro-sign w-4 text-eonite-green"></i>
                          <span className="font-semibold dark:text-gray-200">{formatCurrency(order.total_ttc)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-calendar w-4 text-eonite-green"></i>
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Production Progress (if in production) */}
                    {order.status === 'production' && (
                      <div className="lg:w-48">
                        <div className="text-sm font-semibold mb-2 dark:text-white">
                          {language === 'fr' ? 'Progression' : 'Progress'}: {order.production_progress || 0}%
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-eonite-green h-2 rounded-full transition-all"
                            style={{ width: `${order.production_progress || 0}%` }}
                          />
                        </div>
                        <div className="flex gap-1">
                          {[25, 50, 75, 100].map(p => (
                            <Button
                              key={p}
                              size="sm"
                              variant="outline"
                              className="text-xs px-2 py-1 h-auto dark:border-gray-600 dark:text-gray-300"
                              onClick={(e) => { e.stopPropagation(); updateProductionProgress(order.id, p); }}
                            >
                              {p}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="flex flex-wrap gap-2 lg:w-auto">
                      {order.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'production'); }}
                          disabled={updatingOrder === order.id}
                          className="bg-eonite-green hover:bg-eonite-green-dark"
                        >
                          {updatingOrder === order.id ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                          ) : (
                            <i className="fas fa-industry mr-2"></i>
                          )}
                          {language === 'fr' ? 'Démarrer production' : 'Start Production'}
                        </Button>
                      )}
                      {order.status === 'production' && (
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivered_eonite'); }}
                          disabled={updatingOrder === order.id}
                          className="bg-eonite-green hover:bg-eonite-green-dark"
                        >
                          {updatingOrder === order.id ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                          ) : (
                            <i className="fas fa-truck mr-2"></i>
                          )}
                          {language === 'fr' ? 'En livraison' : 'Out for Delivery'}
                        </Button>
                      )}
                      {order.status === 'delivered_eonite' && (
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'available'); }}
                          disabled={updatingOrder === order.id}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {updatingOrder === order.id ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                          ) : (
                            <i className="fas fa-check-circle mr-2"></i>
                          )}
                          {language === 'fr' ? 'Marquer livré' : 'Mark Delivered'}
                        </Button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'available' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }}
                          disabled={updatingOrder === order.id}
                          className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <i className="fas fa-times mr-2"></i>
                          {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-3 p-3 bg-eonite-beige dark:bg-eonite-green/10 rounded-lg text-sm dark:text-gray-300">
                      <i className="fas fa-sticky-note text-eonite-green mr-2"></i>
                      {order.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setSelectedOrder(null)}>
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-eonite-green to-emerald-800 flex items-center justify-center text-white text-xl">
                    <i className="fas fa-receipt"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">#{selectedOrder.order_number}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(selectedOrder.status)}`}>
                      {getOrderStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              {console.log('Selected order profile:', selectedOrder.profiles)}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{language === 'fr' ? 'Client' : 'Client'}</div>
                <div className="font-semibold dark:text-white text-lg mb-2">{selectedOrder.profiles?.company_name || selectedOrder.profiles?.contact_name}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <i className="fas fa-envelope w-4 text-eonite-green"></i>
                    <a href={`mailto:${selectedOrder.profiles?.email}`} className="hover:text-eonite-green">{selectedOrder.profiles?.email}</a>
                  </div>
                  {selectedOrder.profiles?.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <i className="fas fa-phone w-4 text-eonite-green"></i>
                      <a href={`tel:${selectedOrder.profiles?.phone}`} className="hover:text-eonite-green">{selectedOrder.profiles?.phone}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Products List */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
                <div className="text-sm text-gray-500 dark:text-gray-400 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 font-medium">
                  {language === 'fr' ? 'Produits' : 'Products'}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loadingItems ? (
                    <div className="p-4 text-center text-gray-500">
                      <i className="fas fa-circle-notch fa-spin mr-2"></i>
                      {language === 'fr' ? 'Chargement...' : 'Loading...'}
                    </div>
                  ) : orderItems.length > 0 ? (
                    orderItems.map((item: any, index: number) => (
                      <div key={index} className="p-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium dark:text-white">
                            {item.client_products?.custom_name || item.client_products?.products?.name || `Product ${index + 1}`}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity?.toLocaleString()} {language === 'fr' ? 'sacs' : 'bags'} × {formatCurrency(item.unit_price)}
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
                        <div className="font-medium dark:text-white">
                          {selectedOrder.client_products?.custom_name || selectedOrder.client_products?.products?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedOrder.quantity?.toLocaleString()} {language === 'fr' ? 'sacs' : 'bags'} × {formatCurrency(selectedOrder.unit_price)}
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
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Total HT' : 'Subtotal'}</span>
                  <span className="dark:text-white">{formatCurrency(selectedOrder.total_ht)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">TVA (20%)</span>
                  <span className="dark:text-white">{formatCurrency(selectedOrder.total_ttc - selectedOrder.total_ht)}</span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                <div className="flex justify-between">
                  <span className="font-medium dark:text-white">Total TTC</span>
                  <span className="text-xl font-bold text-eonite-green">{formatCurrency(selectedOrder.total_ttc)}</span>
                </div>
              </div>

              {/* Production Progress */}
              {selectedOrder.status === 'production' && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Progression' : 'Progress'}</span>
                    <span className="font-bold dark:text-white">{selectedOrder.production_progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-eonite-green to-emerald-500 h-3 rounded-full transition-all"
                      style={{ width: `${selectedOrder.production_progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dates & Payment Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === 'fr' ? 'Date commande' : 'Order Date'}</div>
                  <div className="font-medium dark:text-white">{formatDate(selectedOrder.created_at)}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{language === 'fr' ? 'Statut paiement' : 'Payment Status'}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updatePaymentStatus(selectedOrder.id, 'pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedOrder.payment_status === 'pending'
                        ? 'bg-eonite-green text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-eonite-green/20 dark:hover:bg-eonite-green/20'
                        }`}
                    >
                      <i className="fas fa-clock mr-1"></i>
                      {language === 'fr' ? 'En attente' : 'Pending'}
                    </button>
                    <button
                      onClick={() => updatePaymentStatus(selectedOrder.id, 'paid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedOrder.payment_status === 'paid'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                        }`}
                    >
                      <i className="fas fa-check mr-1"></i>
                      {language === 'fr' ? 'Payé' : 'Paid'}
                    </button>
                    <button
                      onClick={() => updatePaymentStatus(selectedOrder.id, 'refunded')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedOrder.payment_status === 'refunded'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`}
                    >
                      <i className="fas fa-undo mr-1"></i>
                      {language === 'fr' ? 'Remboursé' : 'Refunded'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-eonite-beige dark:bg-eonite-green/10 p-4 rounded-xl border border-eonite-green/30 dark:border-eonite-green/20">
                  <div className="text-sm text-eonite-green dark:text-eonite-green-light mb-1 flex items-center gap-2">
                    <i className="fas fa-sticky-note"></i>
                    Notes
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">{selectedOrder.notes}</div>
                </div>
              )}

              {/* Close Button */}
              <Button
                className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white"
                onClick={() => setSelectedOrder(null)}
              >
                {language === 'fr' ? 'Fermer' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
