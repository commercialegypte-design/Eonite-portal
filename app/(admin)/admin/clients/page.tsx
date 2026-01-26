'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function AdminClients() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [clients, setClients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAndLoadClients()
  }, [])

  async function checkAdminAndLoadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as any

    if (profile?.role !== 'admin' && profile?.role !== 'designer') {
      router.push('/dashboard')
      return
    }

    await loadClients()
    setLoading(false)
  }

  async function loadClients() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    setClients(data || [])
  }

  async function viewClientInventory(clientId: string) {
    router.push(`/admin/inventory?client=${clientId}`)
  }

  const filteredClients = clients.filter(client =>
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const newThisMonth = clients.filter(c => {
    const created = new Date(c.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
  }).length

  /* New State for Inventory Modal */
  const [selectedClientForInventory, setSelectedClientForInventory] = useState<any>(null)
  const [clientInventory, setClientInventory] = useState<any[]>([])
  const [clientOrderedProducts, setClientOrderedProducts] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [editingInvId, setEditingInvId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ quantity: 0, alert_threshold: 0, critical_threshold: 0 })
  const [modalTab, setModalTab] = useState<'inventory' | 'ordered'>('ordered')
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editingStockValue, setEditingStockValue] = useState(0)

  /* Function to fetch inventory and ordered products for selected client */
  async function openInventoryModal(client: any) {
    setSelectedClientForInventory(client)
    setLoadingInventory(true)
    setModalTab('ordered') // Default to 'ordered' tab as user requested

    // Fetch inventory
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select(`
        *,
        client_products (
          id,
          custom_name,
          products (name, size)
        )
      `)
      .order('quantity', { ascending: true })

    if (inventoryData) {
      // Filter manually since we want all inventory for this client's products
      const filtered = inventoryData.filter((inv: any) =>
        inv.client_products && inv.client_products.client_id === client.id
      )
      setClientInventory(filtered)
    }

    // Fetch ordered products - aggregate order items by client_product
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        status,
        order_items (
          id,
          quantity,
          unit_price,
          total_price,
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
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    if (ordersData) {
      // Flatten order items and aggregate by product
      const productMap = new Map<string, any>()

      ordersData.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const productId = item.client_products?.id
          if (!productId) return

          if (productMap.has(productId)) {
            const existing = productMap.get(productId)
            existing.totalQuantity += item.quantity
            existing.totalSpent += parseFloat(item.total_price || 0)
            existing.orderCount += 1
            if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
              existing.lastOrderDate = order.created_at
            }
          } else {
            productMap.set(productId, {
              id: productId,
              name: item.client_products?.custom_name || item.client_products?.products?.name,
              size: item.client_products?.products?.size,
              imageUrl: item.client_products?.products?.image_url,
              totalQuantity: item.quantity,
              totalSpent: parseFloat(item.total_price || 0),
              orderCount: 1,
              lastOrderDate: order.created_at,
              latestUnitPrice: item.unit_price,
              clientStock: item.client_products?.client_stock || 0
            })
          }
        })
      })

      setClientOrderedProducts(Array.from(productMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity))
    }

    setLoadingInventory(false)
  }

  /* Inline Edit Functions (copied/adapted from Inventory Page) */
  function startEdit(inv: any) {
    setEditingInvId(inv.id)
    setEditValues({
      quantity: inv.quantity,
      alert_threshold: inv.alert_threshold,
      critical_threshold: inv.critical_threshold
    })
  }

  async function saveEdit(invId: string) {
    const { error } = await (supabase
      .from('inventory') as any)
      .update({
        quantity: editValues.quantity,
        alert_threshold: editValues.alert_threshold,
        critical_threshold: editValues.critical_threshold,
        last_updated: new Date().toISOString()
      })
      .eq('id', invId)

    if (!error) {
      if (selectedClientForInventory) {
        openInventoryModal(selectedClientForInventory) // Refresh data
      }
      setEditingInvId(null)
    } else {
      alert(t('common.error'))
    }
  }

  async function updateClientStock(productId: string, newClientStock: number) {
    const { error } = await (supabase
      .from('client_products') as any)
      .update({
        client_stock: newClientStock,
        client_stock_updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (!error) {
      // Update local state
      setClientOrderedProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, clientStock: newClientStock } : p
      ))
      setEditingStockId(null)
    } else {
      alert(t('common.error'))
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('admin.clients.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.clients.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <Input
                placeholder={t('admin.clients.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-6 text-lg rounded-xl border-2 focus:border-eonite-green dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-eonite-green to-eonite-green-dark rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.clients.total')}</p>
            <p className="text-3xl font-black text-eonite-green">{clients.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-eonite-green to-eonite-green-dark rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-user-plus text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.clients.newThisMonth')}</p>
            <p className="text-3xl font-black text-eonite-green">{newThisMonth}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-eonite-green to-eonite-green-dark rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-filter text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.clients.searchResults')}</p>
            <p className="text-3xl font-black text-eonite-green">{filteredClients.length}</p>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-users text-eonite-green"></i>
              {t('admin.clients.list')} ({filteredClients.length})
            </h3>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-users-slash text-5xl mb-4 text-gray-300"></i>
              <p className="font-semibold">{t('admin.clients.noClients')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClients.map(client => (
                <div key={client.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-5 hover:border-eonite-green/30 dark:hover:border-eonite-green/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-eonite-green to-eonite-green-dark rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {client.company_name?.charAt(0) || client.contact_name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">{client.company_name || t('admin.clients.notProvided')}</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-user text-gray-400 w-4"></i>
                          <span>{client.contact_name || t('admin.clients.notProvided')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-envelope text-gray-400 w-4"></i>
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <i className="fas fa-phone text-gray-400 w-4"></i>
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.siret && (
                          <div className="flex items-center gap-2">
                            <i className="fas fa-building text-gray-400 w-4"></i>
                            <span>SIRET: {client.siret}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <i className="fas fa-calendar mr-1"></i>
                        {t('admin.clients.registeredOn')} {formatDate(client.created_at, 'long')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button
                      size="sm"
                      onClick={() => openInventoryModal(client)}
                      className="bg-eonite-green hover:bg-eonite-green-dark text-white"
                    >
                      <i className="fas fa-warehouse mr-2"></i>
                      {t('admin.clients.viewInventory')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/messages?client=${client.id}`)}
                      className="border-eonite-green/30 text-eonite-green hover:bg-eonite-green/10"
                    >
                      <i className="fas fa-envelope mr-2"></i>
                      {t('admin.clients.sendMessage')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Products Modal */}
      {selectedClientForInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedClientForInventory(null)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedClientForInventory.company_name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">{t('admin.clients.viewInventory')}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedClientForInventory(null)}>
                <i className="fas fa-times text-xl"></i>
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
              <button
                onClick={() => setModalTab('ordered')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${modalTab === 'ordered'
                  ? 'border-eonite-green text-eonite-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <i className="fas fa-shopping-cart mr-2"></i>
                {t('admin.clients.orderedProducts')} ({clientOrderedProducts.length})
              </button>
              <button
                onClick={() => setModalTab('inventory')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${modalTab === 'inventory'
                  ? 'border-eonite-green text-eonite-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <i className="fas fa-warehouse mr-2"></i>
                {t('admin.inventory.title')} ({clientInventory.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingInventory ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-4 border-eonite-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p>{t('common.loading')}</p>
                </div>
              ) : modalTab === 'ordered' ? (
                /* Ordered Products Tab */
                clientOrderedProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-shopping-cart text-5xl mb-4 text-gray-300"></i>
                    <p className="font-semibold">{t('admin.clients.noOrderedProducts')}</p>
                    <p className="text-sm mt-2">{t('admin.clients.noOrderedProductsDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-eonite-green/10 to-eonite-green/5 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-eonite-green">
                          {clientOrderedProducts.reduce((sum, p) => sum + p.totalQuantity, 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 font-semibold">{t('admin.clients.totalBagsOrdered')}</p>
                      </div>
                      <div className="bg-gradient-to-br from-eonite-green/20 to-eonite-green/10 dark:from-eonite-green/15 dark:to-eonite-green/5 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-eonite-green">
                          {clientOrderedProducts.length}
                        </p>
                        <p className="text-xs text-gray-500 font-semibold">{t('admin.clients.uniqueProducts')}</p>
                      </div>
                      <div className="bg-gradient-to-br from-eonite-green/15 to-eonite-green/5 dark:from-eonite-green/10 dark:to-eonite-green/5 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-eonite-green">
                          {clientOrderedProducts.reduce((sum, p) => sum + p.totalSpent, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </p>
                        <p className="text-xs text-gray-500 font-semibold">{t('admin.clients.totalSpent')}</p>
                      </div>
                    </div>

                    {/* Products list */}
                    {clientOrderedProducts.map((product: any) => (
                      <div key={product.id} className="border-2 border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:border-eonite-green/30 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Product image or icon */}
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-eonite-green/20 to-eonite-green/5 flex items-center justify-center flex-shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <i className="fas fa-box text-2xl text-eonite-green"></i>
                            )}
                          </div>

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                              {product.name}
                            </h4>
                            {product.size && (
                              <p className="text-sm text-gray-500">{product.size}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              <i className="fas fa-clock mr-1"></i>
                              {t('admin.clients.lastOrdered')}: {formatDate(product.lastOrderDate, 'short')}
                            </p>
                          </div>

                          {/* Stats - Total ordered */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-black text-eonite-green">{product.totalQuantity.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{t('dashboard.bags')}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {product.orderCount} {t('admin.clients.orders')}
                            </div>
                          </div>
                        </div>

                        {/* Client Stock Row - Editable */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-warehouse text-blue-500"></i>
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('admin.clients.clientStock') || 'Client Stock'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingStockId === product.id ? (
                                <>
                                  <Input
                                    type="number"
                                    value={editingStockValue}
                                    onChange={(e) => setEditingStockValue(parseInt(e.target.value) || 0)}
                                    className="w-24 text-right"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => updateClientStock(product.id, editingStockValue)}
                                    className="bg-eonite-green hover:bg-eonite-green-dark"
                                  >
                                    <i className="fas fa-check"></i>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingStockId(null)}
                                  >
                                    <i className="fas fa-times"></i>
                                  </Button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingStockId(product.id)
                                    setEditingStockValue(product.clientStock)
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors group"
                                >
                                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {product.clientStock.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-500">{t('dashboard.bags')}</span>
                                  <i className="fas fa-edit text-gray-400 group-hover:text-blue-500 text-xs"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Additional stats row */}
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400 text-xs uppercase">{t('admin.clients.totalSpent')}</span>
                            <span className="font-semibold ml-2 text-gray-900 dark:text-white">
                              {product.totalSpent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 text-xs uppercase">{t('admin.clients.latestPrice')}</span>
                            <span className="font-semibold ml-2 text-gray-900 dark:text-white">
                              {parseFloat(product.latestUnitPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {t('dashboard.bag')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Inventory Tab */
                clientInventory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-boxes-stacked text-5xl mb-4 text-gray-300"></i>
                    <p>{t('admin.inventory.noInventory')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {clientInventory.map((inv: any) => {
                      const isEditing = editingInvId === inv.id
                      const stockLevel = inv.quantity <= inv.critical_threshold ? 'critical' : inv.quantity <= inv.alert_threshold ? 'low' : 'good'

                      return (
                        <div key={inv.id} className={`border-2 rounded-xl p-4 transition-all ${stockLevel === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-900/10' :
                          stockLevel === 'low' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10' :
                            'border-gray-100 dark:border-gray-800'
                          }`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stockLevel === 'critical' ? 'bg-red-100 text-red-600' :
                                stockLevel === 'low' ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                <i className="fas fa-box text-xl"></i>
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                                  {inv.client_products?.custom_name || inv.client_products?.products?.name}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {inv.client_products?.products?.size && `${inv.client_products.products.size}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold dark:text-white">{inv.quantity}</div>
                              <div className="text-xs text-gray-500">{t('dashboard.bags')}</div>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                              <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">{t('admin.inventory.currentQuantity')}</label>
                                <Input
                                  type="number"
                                  value={editValues.quantity}
                                  onChange={e => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">{t('admin.inventory.alertThreshold')}</label>
                                <Input
                                  type="number"
                                  value={editValues.alert_threshold}
                                  onChange={e => setEditValues({ ...editValues, alert_threshold: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">{t('admin.inventory.criticalThreshold')}</label>
                                <Input
                                  type="number"
                                  value={editValues.critical_threshold}
                                  onChange={e => setEditValues({ ...editValues, critical_threshold: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-4 text-center text-sm mb-4">
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('admin.inventory.currentQuantity')}</span>
                                <span className="font-semibold dark:text-white">{inv.quantity}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('admin.inventory.alertThreshold')}</span>
                                <span className="font-semibold text-yellow-600">{inv.alert_threshold}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('admin.inventory.criticalThreshold')}</span>
                                <span className="font-semibold text-red-600">{inv.critical_threshold}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditingInvId(null)}>{t('common.cancel')}</Button>
                                <Button size="sm" className="bg-eonite-green hover:bg-green-700" onClick={() => saveEdit(inv.id)}>{t('common.save')}</Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => startEdit(inv)} className="w-full">
                                <i className="fas fa-edit mr-2"></i> {t('common.edit')}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Button size="lg" onClick={() => router.push(`/admin/inventory?client=${selectedClientForInventory.id}`)}>
                {t('admin.inventory.inventoryList')} <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
