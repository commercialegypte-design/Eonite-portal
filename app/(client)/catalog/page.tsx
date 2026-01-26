'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import Link from 'next/link'
import ClientHeader from '@/components/ClientHeader'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface CartItem {
  product: any
  clientProductId: string | null
  quantity: number
  unitPrice: number
}

interface AppliedDiscount {
  code: string
  percent: number
  productIds: string[] // Empty means global
  amount: number
}

export default function ClientCatalog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t, language } = useLanguage()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  // Discount state
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null)
  const [discountError, setDiscountError] = useState('')
  const [validatingDiscount, setValidatingDiscount] = useState(false)

  // Add to cart modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [addQuantity, setAddQuantity] = useState('')

  // Selected variants map: productId -> variantId
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCatalog()

    // Real-time subscription for message notifications
    const messagesChannel = supabase
      .channel('catalog-messages-notifications')
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

  // Re-calculate discount when cart changes
  useEffect(() => {
    if (appliedDiscount) {
      calculateDiscountAmount(appliedDiscount.code, appliedDiscount.percent, appliedDiscount.productIds)
    }
  }, [cart])

  // Handle reorder param
  useEffect(() => {
    const reorderId = searchParams.get('reorder')
    const variantId = searchParams.get('variant')

    if (reorderId && products.length > 0 && !showAddModal) {
      const product = products.find(p => p.id === reorderId)
      if (product) {
        // Pre-select variant if provided
        if (variantId) {
          setSelectedVariants(prev => ({ ...prev, [product.id]: variantId }))
        }

        // Open modal
        // Note: openAddToCartModal uses selectedVariants state. 
        // Since state update is async, we might need to pass variant explicitly or wait.
        // Better: update state AND pass logic to open modal locally.

        // However, openAddToCartModal reads from selectedVariants state.
        // We can modify openAddToCartModal to accept optional variant override or 
        // just set state and let effect run? No, effect runs once.

        // Let's manually trigger logic similar to openAddToCartModal but with explicit variant
        setSelectedProduct(product)
        const targetVariantId = variantId || selectedVariants[product.id] || (product.variants?.[0]?.id)

        const variant = product.variants?.find((v: any) => v.id === targetVariantId)
        setAddQuantity(variant ? variant.min_order_quantity.toString() : product.min_order_quantity.toString())
        setShowAddModal(true)

        // Clean URL without refresh
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('reorder')
        newUrl.searchParams.delete('variant') // Also clean variant
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [searchParams, products])

  async function loadCatalog() {
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

    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        variants:product_variants(*)
      `)
      .eq('is_active', true)
      .order('category')
      .order('base_price')

    setProducts(productsData || [])

    // Initialize default variants
    const defaults: Record<string, string> = {}
    productsData?.forEach((p: any) => {
      if (p.variants && p.variants.length > 0) {
        const defaultVar = p.variants.find((v: any) => v.is_default) || p.variants[0]
        defaults[p.id] = defaultVar.id
      }
    })
    setSelectedVariants(defaults)

    const { data: promosData } = await supabase
      .from('promotions')
      .select('*, products(*)')
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString()) as any

    setPromotions(promosData || [])
    await loadUnreadMessages(currentUser.id)
    setLoading(false)
  }

  async function loadUnreadMessages(userId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('client_id', userId)
      .single() as any

    setUnreadMessages(data?.unread_count || 0)
  }

  function getProductPrice(product: any, variantId?: string) {
    const promo = promotions.find(p => p.product_id === product.id)
    let basePrice = product.base_price

    if (variantId && product.variants) {
      const variant = product.variants.find((v: any) => v.id === variantId)
      if (variant) basePrice = variant.price
    }

    return promo && promo.discount_percent
      ? basePrice * (1 - promo.discount_percent / 100)
      : basePrice
  }

  function openAddToCartModal(product: any) {
    setSelectedProduct(product)
    const variantId = selectedVariants[product.id]
    const variant = product.variants?.find((v: any) => v.id === variantId)
    setAddQuantity(variant ? variant.min_order_quantity.toString() : product.min_order_quantity.toString())
    setShowAddModal(true)
  }

  async function addToCart() {
    if (!selectedProduct || !user) return

    const quantity = parseInt(addQuantity)
    const variantId = selectedVariants[selectedProduct.id]
    const variant = selectedProduct.variants?.find((v: any) => v.id === variantId)
    const minOrder = variant ? variant.min_order_quantity : selectedProduct.min_order_quantity

    if (isNaN(quantity) || quantity < minOrder) return

    // Check if already in cart (same product AND same variant)
    // Note: client_products relates to product_id. If distinct variants are needed, they should be distinct client_products logic wise?
    // In our new schema, client_products has product_variant_id.
    // We assume cart stores clientProductId.

    // We need to check if we already have a client_product for this product + variant

    // Simplification: In CartItem, we might need variant info to display correctly.
    // Logic:
    // 1. Find existing client_product for this user + product + variant
    // 2. Or create new one.

    const { data: existingCP } = await supabase
      .from('client_products')
      .select('id')
      .eq('client_id', user.id)
      .eq('product_id', selectedProduct.id)
      .eq('product_variant_id', variantId) // Check variant match
      .limit(1)
      .single() as any

    let clientProductId = existingCP?.id || null

    if (!clientProductId) {
      // Create new
      const { data: newCP } = await (supabase
        .from('client_products') as any)
        .insert([{
          client_id: user.id,
          product_id: selectedProduct.id,
          product_variant_id: variantId,
          custom_name: selectedProduct.name + (variant ? ` (${variant.size})` : ''),
          is_active: true
        }])
        .select()
        .single()

      if (newCP) clientProductId = newCP.id
    }

    // Now update cart
    const existingIndex = cart.findIndex(item => item.clientProductId === clientProductId)

    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += quantity
      setCart(newCart)
    } else {
      setCart([...cart, {
        product: selectedProduct,
        clientProductId,
        quantity,
        unitPrice: getProductPrice(selectedProduct, variantId)
      }])
    }

    setShowAddModal(false)
    setSelectedProduct(null)
  }

  function removeFromCart(index: number) {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  function updateCartQuantity(index: number, newQuantity: number) {
    if (newQuantity < cart[index].product.min_order_quantity) return
    const newCart = [...cart]
    newCart[index].quantity = newQuantity
    setCart(newCart)
  }

  // --- Discount Logic ---

  async function validateDiscount() {
    if (!discountCode || cart.length === 0) return

    setValidatingDiscount(true)
    setDiscountError('')
    setAppliedDiscount(null)

    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          offer_products ( product_id )
        `)
        .eq('discount_code', discountCode)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setDiscountError(language === 'fr' ? 'Code invalide ou expiré' : 'Invalid or expired code')
        return
      }

      const promoData = data as any
      const productIds = promoData.offer_products?.map((op: any) => op.product_id) || []
      const percent = promoData.discount_percent || 0

      if (percent <= 0) {
        setDiscountError(language === 'fr' ? 'Ce code n\'offre pas de réduction' : 'This code offers no discount')
        return
      }

      // Calculate logic
      calculateDiscountAmount(promoData.discount_code, percent, productIds)

    } catch (err) {
      console.error('Check discount error', err)
      setDiscountError(language === 'fr' ? 'Erreur lors de la vérification' : 'Error checking code')
    } finally {
      setValidatingDiscount(false)
    }
  }

  function calculateDiscountAmount(code: string, percent: number, productIds: string[]) {
    let totalDiscount = 0
    let applicable = false

    if (productIds.length === 0) {
      // Global discount
      const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
      totalDiscount = subtotal * (percent / 100)
      applicable = true
    } else {
      // Specific products discount
      cart.forEach(item => {
        if (productIds.includes(item.product.id)) {
          totalDiscount += (item.unitPrice * item.quantity) * (percent / 100)
          applicable = true
        }
      })
    }

    if (!applicable && productIds.length > 0) {
      setDiscountError(language === 'fr'
        ? 'Ce code ne s\'applique pas aux articles de votre panier'
        : 'This code does not apply to items in your cart')
      setAppliedDiscount(null)
    } else {
      setAppliedDiscount({
        code,
        percent,
        productIds,
        amount: totalDiscount
      })
      setDiscountError('') // Clear errors
    }
  }

  function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  }

  function getDiscountValue() {
    return appliedDiscount ? appliedDiscount.amount : 0
  }

  function getCartTotal() {
    return getCartSubtotal() - getDiscountValue()
  }

  function getCartTotalTTC() {
    return getCartTotal() * 1.2
  }

  function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  // --- Order Placement ---

  async function placeOrder() {
    if (cart.length === 0 || !user || placingOrder) return

    setPlacingOrder(true)

    try {
      // Generate order number using server-side function to avoid duplicates
      // This function bypasses RLS to check the global last order number
      const { data: orderNum, error: numError } = await supabase.rpc('get_next_order_number')

      if (numError) {
        console.error('Error generating order number:', numError)
        throw numError
      }

      console.log('Generated order number:', orderNum)

      const totalHT = getCartTotal()
      const totalTTC = getCartTotalTTC()

      // For multi-product orders, use the first item's client_product_id for backward compatibility
      const primaryClientProductId = cart.length > 0 ? cart[0].clientProductId : null

      // Create the order
      const { data: orderData, error: orderError } = await (supabase
        .from('orders') as any)
        .insert([{
          order_number: orderNum,
          client_id: user.id,
          client_product_id: primaryClientProductId, // Keep for backward compatibility
          quantity: getCartItemCount(),
          unit_price: cart.length === 1 ? cart[0].unitPrice : 0,
          total_ht: totalHT,
          total_ttc: totalTTC,
          status: 'confirmed',
          payment_status: 'pending',
          discount_code: appliedDiscount?.code || null,
          discount_amount: appliedDiscount?.amount || 0,
          notes: orderNotes + (cart.length > 1 ? `\n[${cart.length} products in order]` : '')
        }])
        .select()
        .single()

      if (orderError) {
        console.error('Supabase Order Insert Error:', orderError)
        throw orderError
      }

      // Create order items for each product in cart
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        client_product_id: item.clientProductId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity
      }))

      const { error: itemsError } = await (supabase
        .from('order_items') as any)
        .insert(orderItems)

      if (itemsError) {
        console.error('Failed to insert order items:', itemsError)
        alert(`Order items error: ${itemsError.message}`)
      } else {
        console.log('Order items inserted successfully:', orderItems.length, 'items')
      }

      setOrderPlaced(true)
      setCart([])
      setAppliedDiscount(null)
      setDiscountCode('')
    } catch (error: any) {
      console.error('Order placement failed:', error)
      // Log full error object including non-enumerable properties
      console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))

      const errorMessage = error?.message || error?.details || 'Unknown error'
      alert(language === 'fr'
        ? `Erreur lors de la commande: ${errorMessage}`
        : `Error placing order: ${errorMessage}`)
    }

    setPlacingOrder(false)
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

  const categories = [
    { value: 'all', label: t('catalog.allProducts') },
    { value: 'standard', label: t('catalog.standard') },
    { value: 'window', label: t('catalog.window') },
    { value: 'special', label: t('catalog.special') },
    { value: 'seasonal', label: t('catalog.seasonal') }
  ]

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory)

  return (
    <div className="min-h-screen bg-eonite-beige dark:bg-gray-950">
      <ClientHeader profile={profile} onLogout={handleLogout} unreadMessages={unreadMessages} />

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCartModal(true)}
          className="fixed bottom-6 right-6 z-40 bg-eonite-green hover:bg-eonite-green-dark text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3"
        >
          <i className="fas fa-shopping-cart text-xl"></i>
          <span className="font-bold">{cart.length} {language === 'fr' ? 'article(s)' : 'item(s)'}</span>
          <span className="bg-white/20 px-3 py-1 rounded-lg">{formatCurrency(getCartTotalTTC())}</span>
        </button>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 dark:text-white">{t('catalog.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('catalog.subtitle')}</p>
        </div>

        {promotions.length > 0 && (
          <div className="mb-8 space-y-4">
            {promotions.map(promo => (
              <Card key={promo.id} className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
                        🎉 {promo.title}
                      </h3>
                      <p className="text-green-700 dark:text-green-400 mb-2">{promo.description}</p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t('catalog.validUntil')} {new Date(promo.valid_until).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    {promo.discount_percent && (
                      <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-2xl font-bold">
                        -{promo.discount_percent}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mb-6 dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const promo = promotions.find((p: any) => p.product_id === product.id)
            const variantId = selectedVariants[product.id]
            const discountedPrice = getProductPrice(product, variantId)
            const variant = product.variants?.find((v: any) => v.id === variantId)
            const displayMinOrder = variant ? variant.min_order_quantity : product.min_order_quantity
            const displaySize = variant ? variant.size : product.size
            const displayBasePrice = variant ? variant.price : product.base_price

            const inCart = cart.find(item => item.product.id === product.id) // Simplified check

            return (
              <Card key={product.id} className="hover:shadow-lg transition dark:bg-gray-900 dark:border-gray-700 relative flex flex-col">
                {inCart && (
                  <div className="absolute top-4 left-4 bg-eonite-green text-white px-3 py-1 rounded-full text-sm font-bold z-10 flex items-center gap-1">
                    <i className="fas fa-check"></i>
                    {language === 'fr' ? 'Dans le panier' : 'In cart'}
                  </div>
                )}
                <div className="relative">
                  {promo && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                      -{(promo as any).discount_percent}%
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 h-48 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-6xl">📦</div>
                    )}
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">{product.name}</CardTitle>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('products.format')}: {displaySize} cm
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {product.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{product.description}</p>
                    )}

                    {/* Variant Selector */}
                    {product.variants && product.variants.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {product.variants.map((v: any) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariants(prev => ({ ...prev, [product.id]: v.id }))}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${variantId === v.id
                              ? 'bg-eonite-green text-white border-eonite-green'
                              : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 hover:border-eonite-green'
                              }`}
                          >
                            {v.size}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-baseline gap-2">
                      {promo ? (
                        <>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(discountedPrice)}
                          </span>
                          <span className="text-lg text-gray-400 line-through">
                            {formatCurrency(displayBasePrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-eonite-green">
                          {formatCurrency(displayBasePrice)}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">/{t('dashboard.bags').toLowerCase()}</span>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('catalog.minOrder')}: {displayMinOrder.toLocaleString()} {t('dashboard.bags')}
                    </div>

                    <div className="pt-3 space-y-2">
                      <Button
                        className={`w-full ${inCart ? 'bg-gray-600 hover:bg-gray-700' : 'bg-eonite-green hover:bg-eonite-green-dark'}`}
                        onClick={() => openAddToCartModal(product)}
                      >
                        <i className={`fas ${inCart ? 'fa-plus' : 'fa-cart-plus'} mr-2`}></i>
                        {inCart
                          ? (language === 'fr' ? 'Ajouter plus' : 'Add more')
                          : (language === 'fr' ? 'Ajouter au panier' : 'Add to Cart')
                        }
                      </Button>
                      <Button className="w-full" variant="outline" disabled>
                        {t('catalog.bookDesignLive')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
              {t('catalog.noProductsInCategory')}
            </CardContent>
          </Card>
        )}

        <Card className="mt-8 border-eonite-green/30 dark:border-eonite-green/40 bg-eonite-green/10 dark:bg-eonite-green/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div>
                <h3 className="font-bold text-eonite-green-dark dark:text-eonite-green-light mb-2">{t('catalog.customProduct')}</h3>
                <p className="text-eonite-green dark:text-eonite-green-light/80 mb-4">
                  {t('catalog.customProductText')}
                </p>
                <Button
                  variant="outline"
                  className="dark:border-eonite-green/50 dark:text-eonite-green-light"
                  data-cal-link="eonite"
                  data-cal-config='{"layout":"month_view"}'
                >
                  📅 {t('catalog.bookNow')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Add to Cart Modal */}
      {showAddModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900/90 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-eonite-green/20 rounded-full blur-3xl pointer-events-none" />

            <CardHeader className="relative border-b border-gray-100 dark:border-white/5 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-white">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-eonite-green to-emerald-900 flex items-center justify-center text-white border border-white/10 shadow-lg">
                  <i className="fas fa-cart-plus"></i>
                </div>
                {language === 'fr' ? 'Ajouter au panier' : 'Add to Cart'}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 relative">
              <div className="space-y-6">
                {/* Product Summary */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/5">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/5">
                    {selectedProduct.image_url ? (
                      <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{selectedProduct.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProduct.size}</p>
                    <p className="text-sm font-semibold text-eonite-green">
                      {formatCurrency(getProductPrice(selectedProduct))} / {t('dashboard.bags').toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-gray-300 text-sm font-medium ml-1">
                    {language === 'fr' ? 'Quantité' : 'Quantity'}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(e.target.value)}
                      min={selectedProduct.min_order_quantity}
                      className="bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-slate-900 dark:text-white pl-4 pr-4 py-6 text-lg rounded-xl"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">
                      Min: {selectedProduct.min_order_quantity.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Subtotal */}
                {addQuantity && parseInt(addQuantity) > 0 && (
                  <div className="bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(getProductPrice(selectedProduct) * parseInt(addQuantity))}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1 text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                    onClick={() => setShowAddModal(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    className="flex-[2] bg-gradient-to-r from-eonite-green to-emerald-800 hover:from-eonite-green-dark hover:to-emerald-900 text-white font-bold py-6 rounded-xl shadow-lg"
                    onClick={addToCart}
                    disabled={!addQuantity || parseInt(addQuantity) < selectedProduct.min_order_quantity}
                  >
                    <i className="fas fa-cart-plus mr-2"></i>
                    {language === 'fr' ? 'Ajouter' : 'Add'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-white dark:bg-gray-900/90 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-eonite-green/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <CardHeader className="relative border-b border-gray-100 dark:border-white/5 pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
                {orderPlaced ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 border border-green-500/30">
                      <i className="fas fa-check text-lg"></i>
                    </div>
                    {language === 'fr' ? 'Commande Confirmée !' : 'Order Confirmed!'}
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-eonite-green to-emerald-900 flex items-center justify-center text-white border border-white/10 shadow-lg">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    {language === 'fr' ? 'Votre Panier' : 'Your Cart'} ({cart.length} {language === 'fr' ? 'article(s)' : 'item(s)'})
                  </>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 relative flex-1 overflow-y-auto">
              {orderPlaced ? (
                <div className="space-y-6 text-center py-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center text-white text-4xl shadow-green-900/50 shadow-lg animate-in zoom-in duration-500">
                    <i className="fas fa-check"></i>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                      {language === 'fr' ? 'Merci pour votre commande !' : 'Thank you for your order!'}
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">
                      {language === 'fr'
                        ? 'Votre commande a été enregistrée avec succès. Vous pouvez suivre son statut dans votre tableau de bord.'
                        : 'Your order has been successfully registered. You can track its status in your dashboard.'}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white border border-gray-200 dark:border-white/10"
                      onClick={() => { setShowCartModal(false); setOrderPlaced(false) }}
                    >
                      {t('common.close')}
                    </Button>
                    <Link href="/dashboard" className="flex-1">
                      <Button className="w-full bg-eonite-green hover:bg-eonite-green-dark text-white font-bold shadow-lg">
                        {language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={item.product.id} className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/5">
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white">{item.product.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.unitPrice)} / {t('dashboard.bags').toLowerCase()}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateCartQuantity(index, item.quantity - item.product.min_order_quantity)}
                              className="w-8 h-8 rounded bg-white hover:bg-gray-100 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white shadow-sm border border-gray-200 dark:border-transparent disabled:opacity-50"
                              disabled={item.quantity <= item.product.min_order_quantity}
                            >-</button>
                            <span className="text-slate-900 dark:text-white font-medium px-2">{item.quantity.toLocaleString()}</span>
                            <button
                              onClick={() => updateCartQuantity(index, item.quantity + item.product.min_order_quantity)}
                              className="w-8 h-8 rounded bg-white hover:bg-gray-100 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white shadow-sm border border-gray-200 dark:border-transparent"
                            >+</button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.unitPrice * item.quantity)}</div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="text-red-500 hover:text-red-400 text-sm mt-1"
                          >
                            <i className="fas fa-trash mr-1"></i>
                            {language === 'fr' ? 'Retirer' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-gray-300 text-sm font-medium ml-1">
                      {language === 'fr' ? 'Notes (optionnel)' : 'Notes (optional)'}
                    </Label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-eonite-green/50 focus:border-eonite-green outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-gray-600"
                      rows={2}
                      placeholder={language === 'fr' ? 'Précisez vos besoins...' : 'Specify your needs...'}
                    />
                  </div>

                  {/* Discount Code */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-gray-300 text-sm font-medium ml-1">
                      {language === 'fr' ? 'Code Promo' : 'Discount Code'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-mono uppercase"
                        placeholder={language === 'fr' ? 'Entrez votre code' : 'Enter your code'}
                        disabled={!!appliedDiscount || validatingDiscount}
                      />
                      {appliedDiscount ? (
                        <Button
                          onClick={() => {
                            setAppliedDiscount(null)
                            setDiscountCode('')
                          }}
                          variant="outline"
                          className="border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                        >
                          {language === 'fr' ? 'Retirer' : 'Remove'}
                        </Button>
                      ) : (
                        <Button
                          onClick={validateDiscount}
                          disabled={!discountCode || validatingDiscount}
                          className="bg-eonite-green hover:bg-eonite-green-dark text-white"
                        >
                          {validatingDiscount ? (
                            <i className="fas fa-circle-notch fa-spin"></i>
                          ) : (
                            language === 'fr' ? 'Appliquer' : 'Apply'
                          )}
                        </Button>
                      )}
                    </div>
                    {discountError && (
                      <p className="text-sm text-red-500 ml-1 animate-in fade-in slide-in-from-top-1">
                        <i className="fas fa-exclamation-circle mr-1"></i> {discountError}
                      </p>
                    )}
                    {appliedDiscount && (
                      <p className="text-sm text-green-600 dark:text-green-400 ml-1 animate-in fade-in slide-in-from-top-1">
                        <i className="fas fa-check-circle mr-1"></i>
                        {language === 'fr'
                          ? `Code ${appliedDiscount.code} appliqué : -${appliedDiscount.percent}%`
                          : `Code ${appliedDiscount.code} applied: -${appliedDiscount.percent}%`
                        }
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Sous-total HT' : 'Subtotal (excl. tax)'}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(getCartSubtotal())}</span>
                    </div>

                    {appliedDiscount && (
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span className="text-sm font-medium">
                          {language === 'fr' ? 'Réduction' : 'Discount'}
                          <span className="text-xs ml-1 opacity-70">(-{appliedDiscount.percent}%)</span>
                        </span>
                        <span className="font-medium">-{formatCurrency(appliedDiscount.amount)}</span>
                      </div>
                    )}

                    <div className="h-px w-full bg-gray-200 dark:bg-white/5"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-eonite-green">{language === 'fr' ? 'Total HT' : 'Total (excl. tax)'}</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(getCartTotal())}</span>
                    </div>
                    <div className="flex justify-between items-center opacity-80">
                      <span className="text-sm font-medium text-slate-500 dark:text-gray-400">{language === 'fr' ? 'Total TTC' : 'Total (incl. tax)'}</span>
                      <span className="text-lg font-bold text-slate-700 dark:text-gray-300">{formatCurrency(getCartTotalTTC())}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      className="flex-1 text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      onClick={() => setShowCartModal(false)}
                      disabled={placingOrder}
                    >
                      {language === 'fr' ? 'Continuer les achats' : 'Continue Shopping'}
                    </Button>
                    <Button
                      className="flex-[2] bg-gradient-to-r from-eonite-green to-emerald-800 hover:from-eonite-green-dark hover:to-emerald-900 text-white font-bold py-6 rounded-xl shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                      onClick={placeOrder}
                      disabled={placingOrder || cart.length === 0}
                    >
                      {placingOrder ? (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-circle-notch fa-spin"></i>
                          <span>{language === 'fr' ? 'Traitement...' : 'Processing...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{language === 'fr' ? 'Confirmer la commande' : 'Confirm Order'}</span>
                          <i className="fas fa-arrow-right text-xs opacity-70"></i>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
