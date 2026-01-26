'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ClientHeader from '@/components/ClientHeader'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function ClientProducts() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [clientProducts, setClientProducts] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editingStockValue, setEditingStockValue] = useState(0)

  useEffect(() => {
    loadClientProducts()

    // Real-time subscription for message notifications
    const messagesChannel = supabase
      .channel('products-messages-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) loadUnreadMessages(currentUser.id)
        }
      )
      .subscribe()

    return () => {
      messagesChannel.unsubscribe()
    }
  }, [])

  async function loadClientProducts() {
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

    const { data } = await supabase
      .from('client_products')
      .select(`
        *,
        products (
          name,
          size,
          category,
          base_price,
          image_url,
          id
        ),
        variant_details:product_variant_id (
          size,
          price
        ),
        inventory (
          quantity,
          alert_threshold,
          critical_threshold,
          last_updated
        )
      `)
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: false })

    setClientProducts(data || [])
    await loadUnreadMessages(currentUser.id)
    setLoading(false)
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
      setClientProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, client_stock: newStock } : p
      ))
      setEditingStockId(null)
    } else {
      alert(t('common.error'))
    }
  }

  async function loadUnreadMessages(userId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('client_id', userId)
      .single() as any as any

    setUnreadMessages(data?.unread_count || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
    <div className="min-h-screen bg-eonite-beige dark:bg-gray-950">
      <ClientHeader profile={profile} onLogout={handleLogout} unreadMessages={unreadMessages} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 dark:text-white">{t('products.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('products.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('products.registered')}</div>
              <div className="text-3xl font-bold text-eonite-green">
                {clientProducts.length}
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/catalog">
                <Button size="sm" variant="outline" className="dark:border-gray-600 dark:text-gray-200">{t('products.addProduct')}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('products.totalStock')}</div>
              <div className="text-3xl font-bold text-eonite-green">
                {clientProducts.reduce((sum, p) => sum + (p.inventory?.[0]?.quantity || 0), 0).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('products.available')}</div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('products.activeAlerts')}</div>
              <div className="text-3xl font-bold text-yellow-600">
                {clientProducts.filter(p => {
                  const inv = p.inventory?.[0]
                  return inv && inv.quantity <= inv.alert_threshold
                }).length}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('products.needAttention')}</div>
            </CardContent>
          </Card>
        </div>

        {clientProducts.length === 0 ? (
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2 dark:text-white">{t('products.noProducts')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('products.noProductsDesc')}
              </p>
              <Link href="/catalog">
                <Button>{t('products.browseCatalog')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientProducts.map(product => {
              const inventory = product.inventory?.[0]
              const stockLevel = inventory
                ? inventory.quantity <= inventory.critical_threshold
                  ? 'critical'
                  : inventory.quantity <= inventory.alert_threshold
                    ? 'low'
                    : 'good'
                : 'unknown'

              return (
                <Card key={product.id} className="hover:shadow-lg transition dark:bg-gray-900 dark:border-gray-700">
                  <div className="relative">
                    {stockLevel === 'critical' && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                        🚨 {t('dashboard.criticalStock')}
                      </div>
                    )}
                    {stockLevel === 'low' && (
                      <div className="absolute top-4 right-4 bg-eonite-green text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                        ⚠️ {t('dashboard.lowStock')}
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 h-48 flex items-center justify-center overflow-hidden">
                      {product.products?.image_url ? (
                        <img
                          src={product.products.image_url}
                          alt={product.custom_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-6xl">📦</div>
                      )}
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-lg dark:text-white">{product.custom_name}</CardTitle>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Base: {product.products?.name}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {inventory ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('products.currentStock')}:</span>
                          <span className={`font-bold ${stockLevel === 'critical' ? 'text-red-600' :
                            stockLevel === 'low' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                            {inventory.quantity} {t('dashboard.bags')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${stockLevel === 'critical' ? 'bg-red-500' :
                              stockLevel === 'low' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                            style={{
                              width: `${Math.min(100, (inventory.quantity / inventory.alert_threshold) * 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{t('products.alertThreshold')}: {inventory.alert_threshold}</span>
                          <span>{t('products.critical')}: {inventory.critical_threshold}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('products.lastUpdate')}: {formatDate(inventory.last_updated)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {t('products.notConfigured')}
                      </div>
                    )}

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-warehouse text-blue-500"></i>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('products.clientStock') || 'My Stock'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingStockId === product.id ? (
                            <>
                              <input
                                type="number"
                                value={editingStockValue}
                                onChange={(e) => setEditingStockValue(parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-right border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-eonite-green outline-none"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => updateClientStock(product.id, editingStockValue)}
                                className="bg-eonite-green hover:bg-eonite-green-dark h-8 w-8 p-0"
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingStockId(null)}
                                className="h-8 w-8 p-0"
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStockId(product.id)
                                setEditingStockValue(product.client_stock || 0)
                              }}
                              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors group"
                            >
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {(product.client_stock || 0).toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-500">{t('dashboard.bags')}</span>
                              <i className="fas fa-edit text-gray-400 group-hover:text-blue-500 text-xs"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t dark:border-gray-700 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('products.format')}:</span>
                        <span className="font-semibold dark:text-white">{product.variant_details?.size || product.products?.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('products.unitPrice')}:</span>
                        <span className="font-semibold dark:text-white">{formatCurrency(product.unit_price)}</span>
                      </div>
                      {product.custom_design_url && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('products.design')}:</span>
                          <Button size="sm" variant="outline" asChild>
                            <a href={product.custom_design_url} target="_blank" rel="noopener noreferrer">
                              {t('products.view')}
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-4 border-t dark:border-gray-700">
                      <Button
                        className="w-full bg-eonite-green hover:bg-eonite-green-dark"
                        onClick={() => router.push(`/catalog?reorder=${product.products.id}${product.product_variant_id ? `&variant=${product.product_variant_id}` : ''}`)}
                      >
                        {t('products.reorder')}
                      </Button>
                      <Button className="w-full" variant="outline" disabled>
                        {t('products.modifyDesign')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Card className="mt-8 border-eonite-green/30 dark:border-eonite-green/40 bg-eonite-green/10 dark:bg-eonite-green/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div>
                <h3 className="font-bold text-eonite-green-dark dark:text-eonite-green-light mb-2">{t('products.needHelp')}</h3>
                <p className="text-eonite-green dark:text-eonite-green-light/80 mb-4">
                  {t('products.helpText')}
                </p>
                <Link href="/messages">
                  <Button variant="outline" className="dark:border-eonite-green/50 dark:text-eonite-green-light">
                    💬 {t('products.contactSupport')}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
