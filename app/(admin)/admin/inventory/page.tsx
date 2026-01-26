'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getStockLevel, getStockLevelColor } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function AdminInventory() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientFilter = searchParams.get('client')
  const { t } = useLanguage()

  const supabase = createClient()
  const [inventory, setInventory] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ quantity: 0, alert_threshold: 0, critical_threshold: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>(clientFilter || 'all')

  useEffect(() => {
    checkAdminAndLoadData()
  }, [selectedClientId])

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as any as any

    if (profile?.role !== 'admin' && profile?.role !== 'designer') {
      router.push('/dashboard')
      return
    }

    await Promise.all([loadInventory(selectedClientId), loadClients()])
    setLoading(false)
  }

  async function loadClients() {
    const { data } = await supabase
      .from('profiles')
      .select('id, company_name, contact_name')
      .eq('role', 'client')
      .order('company_name')

    setClients(data || [])
  }

  const loadInventory = useCallback(async (clientId: string) => {
    const { data } = await supabase
      .from('inventory')
      .select(`
        *,
        client_products (
          id,
          custom_name,
          client_id,
          profiles!client_products_client_id_fkey (
            id,
            company_name,
            contact_name
          ),
          products (
            name,
            size
          )
        )
      `)
      .order('quantity', { ascending: true })

    if (data) {
      let filteredData = data
      if (clientId !== 'all') {
        filteredData = data.filter((inv: any) =>
          inv.client_products?.client_id === clientId
        )
      }
      setInventory(filteredData)
    }
  }, [supabase])

  async function handleRefresh() {
    setRefreshing(true)
    await loadInventory(selectedClientId)
    setRefreshing(false)
  }

  async function startEdit(inv: any) {
    setEditingId(inv.id)
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
      await loadInventory(selectedClientId)
      setEditingId(null)
    } else {
      alert('Erreur lors de la mise à jour')
    }
  }

  function cancelEdit() {
    setEditingId(null)
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

  const lowStockItems = inventory.filter(inv => inv.quantity <= inv.alert_threshold)
  const criticalStockItems = inventory.filter(inv => inv.quantity <= inv.critical_threshold)
  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity, 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('admin.inventory.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.inventory.subtitle')}</p>
        </div>

        {/* Filter */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <Label className="text-sm font-semibold text-gray-700">{t('admin.inventory.filterByClient')}</Label>
              <select
                className="w-full mt-2 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-eonite-green focus:outline-none transition"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="all">{t('admin.inventory.allClients')}</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.company_name || client.contact_name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-eonite-green hover:bg-green-700 text-white px-6 py-3"
            >
              <i className={`fas fa-sync-alt mr-2 ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? t('common.loading') : t('admin.inventory.refresh')}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-boxes-stacked text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-semibold mb-1">{t('admin.inventory.totalProducts')}</p>
            <p className="text-3xl font-black text-eonite-green">{inventory.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-cubes text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-semibold mb-1">{t('admin.inventory.totalStock')}</p>
            <p className="text-3xl font-black text-eonite-green">{totalStock.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-exclamation-triangle text-white text-xl"></i>
              </div>
              {lowStockItems.length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full animate-pulse">!</span>
              )}
            </div>
            <p className="text-sm text-gray-600 font-semibold mb-1">{t('admin.inventory.lowStockAlerts')}</p>
            <p className="text-3xl font-black text-eonite-green">{lowStockItems.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-skull-crossbones text-white text-xl"></i>
              </div>
              {criticalStockItems.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full animate-pulse">!</span>
              )}
            </div>
            <p className="text-sm text-gray-600 font-semibold mb-1">{t('admin.inventory.criticalAlerts')}</p>
            <p className="text-3xl font-black text-eonite-green">{criticalStockItems.length}</p>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <i className="fas fa-warehouse text-eonite-green"></i>
              {t('admin.inventory.inventoryList')} ({inventory.length} {t('admin.inventory.productsCount')})
            </h3>
          </div>

          {inventory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-box-open text-5xl mb-4 text-gray-300"></i>
              <p className="font-semibold">{t('admin.inventory.noInventory')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inventory.map(inv => {
                const isEditing = editingId === inv.id
                const stockLevel = getStockLevel(inv.quantity, inv.alert_threshold, inv.critical_threshold)

                return (
                  <div key={inv.id} className={`border-2 rounded-2xl p-5 transition-all duration-300 ${stockLevel === 'critical' ? 'border-red-200 bg-red-50' :
                    stockLevel === 'low' ? 'border-yellow-200 bg-yellow-50' :
                      'border-gray-100 dark:border-gray-700 hover:border-green-200'
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${stockLevel === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                          stockLevel === 'low' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-br from-green-500 to-green-600'
                          }`}>
                          <i className="fas fa-box text-white text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                            {inv.client_products?.profiles?.company_name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {inv.client_products?.custom_name || inv.client_products?.products?.name}
                            {inv.client_products?.products?.size && ` - ${inv.client_products.products.size}`}
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStockLevelColor(stockLevel)}`}>
                        {stockLevel === 'critical' && <><i className="fas fa-exclamation-circle mr-1"></i> {t('admin.inventory.critical')}</>}
                        {stockLevel === 'low' && <><i className="fas fa-exclamation-triangle mr-1"></i> {t('admin.inventory.low')}</>}
                        {stockLevel === 'high' && <><i className="fas fa-check-circle mr-1"></i> {t('admin.inventory.good')}</>}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-xl">
                        <div>
                          <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.inventory.currentQuantity')}</Label>
                          <Input
                            type="number"
                            value={editValues.quantity}
                            onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.inventory.alertThreshold')}</Label>
                          <Input
                            type="number"
                            value={editValues.alert_threshold}
                            onChange={(e) => setEditValues({ ...editValues, alert_threshold: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.inventory.criticalThreshold')}</Label>
                          <Input
                            type="number"
                            value={editValues.critical_threshold}
                            onChange={(e) => setEditValues({ ...editValues, critical_threshold: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-white rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">{t('admin.inventory.currentQuantity')}</p>
                          <p className="text-2xl font-black text-gray-900 dark:text-white">{inv.quantity}</p>
                          <p className="text-xs text-gray-500">{t('dashboard.bags')}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">{t('admin.inventory.alertThreshold')}</p>
                          <p className="text-2xl font-black text-yellow-600">{inv.alert_threshold}</p>
                          <p className="text-xs text-gray-500">{t('dashboard.bags')}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">{t('admin.inventory.criticalThreshold')}</p>
                          <p className="text-2xl font-black text-red-600">{inv.critical_threshold}</p>
                          <p className="text-xs text-gray-500">{t('dashboard.bags')}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => saveEdit(inv.id)} className="bg-eonite-green hover:bg-green-700">
                            <i className="fas fa-save mr-2"></i> {t('common.save')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            {t('common.cancel')}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(inv)}>
                          <i className="fas fa-edit mr-2"></i> {t('common.edit')}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
