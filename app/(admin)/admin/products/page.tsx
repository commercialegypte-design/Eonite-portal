'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface ProductVariant {
  id?: string
  size: string
  price: number
  min_order_quantity: number
  is_default: boolean
}

interface ProductImage {
  id?: string
  image_url: string
  display_order: number
  is_primary: boolean
}

interface Product {
  id: string
  name: string
  category: string
  is_active: boolean
  description: string | null
  image_url: string | null
  size: string
  base_price: number
  min_order_quantity: number
  variants?: ProductVariant[]
  images?: ProductImage[]
}

interface ProductCategory {
  id: string
  name: string
  display_name_fr: string | null
  display_name_en: string | null
  icon: string
  color: string
  display_order: number
  is_active: boolean
}

export const dynamic = 'force-dynamic'

export default function AdminProducts() {
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const multiFileInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'variants' | 'images'>('basic')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'standard',
    is_active: true,
    description: ''
  })
  const [variants, setVariants] = useState<ProductVariant[]>([
    { size: '', price: 0, min_order_quantity: 5000, is_default: true }
  ])
  const [images, setImages] = useState<ProductImage[]>([])
  const [newVariant, setNewVariant] = useState({ size: '', price: '', min_order_quantity: '5000' })
  const [newCategory, setNewCategory] = useState({ name: '', display_name_fr: '', display_name_en: '', icon: 'fa-tag' })
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)

  useEffect(() => {
    checkAdminAndLoadProducts()
  }, [])

  async function checkAdminAndLoadProducts() {
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

    await loadProducts()
    await loadCategories()
    setLoading(false)
  }

  async function loadProducts() {
    // Load products with variants and images
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (productsData) {
      // Load variants for each product
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .order('is_default', { ascending: false })

      // Load images for each product
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('*')
        .order('display_order', { ascending: true })

      const productsWithDetails = productsData.map((product: any) => ({
        ...product,
        variants: variantsData?.filter((v: any) => v.product_id === product.id) || [],
        images: imagesData?.filter((i: any) => i.product_id === product.id) || []
      }))

      setProducts(productsWithDetails)
    }
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (data) {
      setProductCategories(data)
    }
  }

  async function createCategory() {
    if (!newCategory.name) return

    const { error } = await (supabase
      .from('product_categories') as any)
      .insert([{
        name: newCategory.name.toLowerCase().replace(/\s+/g, '_'),
        display_name_fr: newCategory.display_name_fr || newCategory.name,
        display_name_en: newCategory.display_name_en || newCategory.name,
        icon: newCategory.icon,
        display_order: productCategories.length + 1
      }])

    if (!error) {
      setNewCategory({ name: '', display_name_fr: '', display_name_en: '', icon: 'fa-tag' })
      await loadCategories()
    } else {
      alert(language === 'fr' ? 'Erreur lors de la création' : 'Error creating category')
    }
  }

  async function deleteCategory(categoryId: string, categoryName: string) {
    // Check if any products use this category
    const productsInCategory = products.filter(p => p.category === categoryName)
    if (productsInCategory.length > 0) {
      alert(language === 'fr'
        ? `Impossible de supprimer: ${productsInCategory.length} produit(s) utilisent cette catégorie`
        : `Cannot delete: ${productsInCategory.length} product(s) use this category`)
      return
    }

    if (!confirm(language === 'fr' ? 'Supprimer cette catégorie ?' : 'Delete this category?')) return

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId)

    if (!error) {
      await loadCategories()
    }
  }

  async function updateCategory() {
    if (!editingCategory) return

    const { error } = await (supabase
      .from('product_categories') as any)
      .update({
        display_name_fr: editingCategory.display_name_fr,
        display_name_en: editingCategory.display_name_en,
        icon: editingCategory.icon
      })
      .eq('id', editingCategory.id)

    if (!error) {
      setEditingCategory(null)
      await loadCategories()
    } else {
      alert(language === 'fr' ? 'Erreur lors de la modification' : 'Error updating category')
    }
  }

  function openModal(product?: Product) {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        category: product.category,
        is_active: product.is_active,
        description: product.description || ''
      })
      setVariants(product.variants?.length ? product.variants : [
        { size: product.size, price: product.base_price, min_order_quantity: product.min_order_quantity, is_default: true }
      ])
      setImages(product.images || [])
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        category: 'standard',
        is_active: true,
        description: ''
      })
      setVariants([{ size: '', price: 0, min_order_quantity: 5000, is_default: true }])
      setImages([])
    }
    setActiveTab('basic')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingProduct(null)
    setNewVariant({ size: '', price: '', min_order_quantity: '5000' })
  }

  function addVariant() {
    console.log("Adding variant:", newVariant)
    if (!newVariant.size || !newVariant.price) {
      console.warn("Missing size or price", newVariant)
      alert(language === 'fr' ? 'Veuillez remplir la taille et le prix' : 'Please fill in size and price')
      return
    }

    const priceString = newVariant.price.toString().replace(',', '.')
    const price = parseFloat(priceString)

    if (isNaN(price)) {
      console.warn("Invalid price", priceString)
      alert("Invalid price format")
      return
    }

    try {
      const isFirst = variants.length === 0
      const variant = {
        size: newVariant.size,
        price: price,
        min_order_quantity: parseInt(newVariant.min_order_quantity),
        is_default: isFirst
      }

      console.log("New variant object:", variant)
      setVariants([...variants, variant])
      setNewVariant({ size: '', price: '', min_order_quantity: '5000' })
      // alert("Variant added!") // Optional: uncomment if needed, but list update should be visible
    } catch (error) {
      console.error("Error adding variant:", error)
      alert("Error adding variant: " + error)
    }
  }

  function removeVariant(index: number) {
    const newVariants = variants.filter((_, i) => i !== index)
    // If we removed the default, make the first one default
    if (variants[index].is_default && newVariants.length > 0) {
      newVariants[0].is_default = true
    }
    setVariants(newVariants)
  }

  function setDefaultVariant(index: number) {
    setVariants(variants.map((v, i) => ({ ...v, is_default: i === index })))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        const isFirst = images.length === 0 && i === 0
        setImages(prev => [...prev, {
          image_url: publicUrl,
          display_order: prev.length,
          is_primary: isFirst
        }])
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }

    setUploading(false)
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = ''
    }
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index)
    // If we removed the primary, make the first one primary
    if (images[index].is_primary && newImages.length > 0) {
      newImages[0].is_primary = true
    }
    setImages(newImages)
  }

  function setPrimaryImage(index: number) {
    setImages(images.map((img, i) => ({ ...img, is_primary: i === index })))
  }

  async function handleSubmit() {
    if (!formData.name || variants.length === 0) {
      alert(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill in all required fields')
      return
    }

    // Get default variant for the main product record
    const defaultVariant = variants.find(v => v.is_default) || variants[0]
    const primaryImage = images.find(img => img.is_primary)

    const productData = {
      name: formData.name,
      size: defaultVariant.size,
      base_price: defaultVariant.price,
      category: formData.category,
      is_active: formData.is_active,
      min_order_quantity: defaultVariant.min_order_quantity,
      description: formData.description || null,
      image_url: primaryImage?.image_url || null
    }

    let productId = editingProduct?.id

    // Verify unique constraints if needed
    if (editingProduct) {
      // Update logic usually somewhere else? No function saveEditProduct?
      // Wait, handleSaveProduct handles both create and update?
      // Let's check handleSaveProduct logic below
      // Update existing product
      const { error } = await (supabase
        .from('products') as any)
        .update(productData)
        .eq('id', editingProduct.id)

      if (error) {
        alert('Error updating product')
        return
      }
    } else {
      // Create new product
      const { data: newProduct, error } = await (supabase
        .from('products') as any)
        .insert([productData])
        .select()
        .single() as any

      if (error || !newProduct) {
        alert('Error creating product')
        return
      }
      productId = newProduct.id
    }

    // Handle variants
    if (productId) {
      // Delete existing variants
      await supabase.from('product_variants').delete().eq('product_id', productId)

      // Insert new variants
      const variantsToInsert = variants.map(v => ({
        product_id: productId,
        size: v.size,
        price: v.price,
        min_order_quantity: v.min_order_quantity,
        is_default: v.is_default
      }))
      const { error: variantsError } = await (supabase.from('product_variants') as any).insert(variantsToInsert)

      // Handle images
      await supabase.from('product_images').delete().eq('product_id', productId)

      if (images.length > 0) {
        const imagesToInsert = images.map((img, idx) => ({
          product_id: productId,
          image_url: img.image_url,
          display_order: idx,
          is_primary: img.is_primary
        }))
        const { error: imagesError } = await (supabase.from('product_images') as any).insert(imagesToInsert)
      }
    }

    closeModal()
    await loadProducts()
  }

  async function toggleActive(productId: string, currentStatus: boolean) {
    const { error } = await (supabase
      .from('products') as any)
      .update({ is_active: !currentStatus })
      .eq('id', productId)

    if (!error) {
      await loadProducts()
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

  const activeProducts = products.filter(p => p.is_active)
  const avgPrice = products.length > 0
    ? products.reduce((sum, p) => sum + p.base_price, 0) / products.length
    : 0
  const uniqueCategories = new Set(products.map(p => p.category))

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('admin.products.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('admin.products.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCategoryModal(true)}
              variant="outline"
              className="px-4 py-3 rounded-xl"
            >
              <i className="fas fa-tags mr-2"></i>
              {language === 'fr' ? 'Catégories' : 'Categories'}
            </Button>
            <Button
              onClick={() => openModal()}
              className="bg-eonite-green hover:bg-eonite-green-dark text-white px-6 py-3 rounded-xl shadow-lg"
            >
              <i className="fas fa-plus mr-2"></i>
              {t('admin.products.addProduct')}
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
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.products.total')}</p>
            <p className="text-3xl font-black text-eonite-green">{products.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-check-circle text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.products.activeProducts')}</p>
            <p className="text-3xl font-black text-eonite-green">{activeProducts.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-euro-sign text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.products.avgPrice')}</p>
            <p className="text-3xl font-black text-eonite-green">{formatCurrency(avgPrice)}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border-l-4 border-eonite-green">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg shadow-eonite-green/30">
                <i className="fas fa-tags text-white text-xl"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('admin.products.categories')}</p>
            <p className="text-3xl font-black text-eonite-green">{productCategories.length}</p>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-boxes-stacked text-eonite-green"></i>
              {t('admin.products.list')} ({products.length})
            </h3>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-box-open text-5xl mb-4 text-gray-300"></i>
              <p className="font-semibold">{t('admin.products.noProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div
                  key={product.id}
                  className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${!product.is_active ? 'opacity-60 border-gray-200' : 'border-gray-100 dark:border-gray-700 hover:border-eonite-green/30'
                    }`}
                >
                  {/* Product Image */}
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 relative">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images.find(i => i.is_primary)?.image_url || product.images[0]?.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="fas fa-box text-4xl text-gray-400"></i>
                      </div>
                    )}
                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${product.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}>
                      {product.is_active ? t('status.active') : t('status.inactive')}
                    </span>
                    {/* Image count badge */}
                    {product.images && product.images.length > 1 && (
                      <span className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white rounded-lg text-xs">
                        <i className="fas fa-images mr-1"></i>{product.images.length}
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-5">
                    <div className="mb-4">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h4>
                      {product.variants && product.variants.length > 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {product.variants.length} {language === 'fr' ? 'tailles' : 'sizes'}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{product.size}</p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{t('admin.products.basePrice')}:</span>
                        <span className="font-bold text-lg text-eonite-green">
                          {product.variants && product.variants.length > 0
                            ? `${formatCurrency(Math.min(...product.variants.map(v => v.price)))} - ${formatCurrency(Math.max(...product.variants.map(v => v.price)))}`
                            : formatCurrency(product.base_price)
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{t('admin.products.category')}:</span>
                        <span className="px-2 py-1 bg-eonite-green/10 text-eonite-green rounded-lg text-xs font-semibold capitalize">
                          {product.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openModal(product)}
                        className="flex-1"
                      >
                        <i className="fas fa-edit mr-2"></i> {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(product.id, product.is_active)}
                        className={product.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                      >
                        <i className={`fas ${product.is_active ? 'fa-ban' : 'fa-check'} mr-2`}></i>
                        {product.is_active ? t('admin.products.deactivate') : t('admin.products.activate')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-box text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingProduct ? t('admin.products.editProduct') : t('admin.products.newProduct')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {editingProduct ? editingProduct.name : (language === 'fr' ? 'Créer un nouveau produit' : 'Create a new product')}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'basic'
                  ? 'border-eonite-green text-eonite-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                <i className="fas fa-info-circle mr-2"></i>
                {language === 'fr' ? 'Informations' : 'Basic Info'}
              </button>
              <button
                onClick={() => setActiveTab('variants')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'variants'
                  ? 'border-eonite-green text-eonite-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                <i className="fas fa-ruler mr-2"></i>
                {language === 'fr' ? 'Tailles & Prix' : 'Sizes & Prices'} ({variants.length})
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'images'
                  ? 'border-eonite-green text-eonite-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                <i className="fas fa-images mr-2"></i>
                Images ({images.length})
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.products.productName')} *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Sac kraft 26x32 cm"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.products.category')} *</Label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-xs text-eonite-green hover:underline"
                      >
                        <i className="fas fa-plus mr-1"></i>
                        {language === 'fr' ? 'Nouvelle catégorie' : 'New category'}
                      </button>
                    </div>
                    <select
                      className="w-full mt-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-eonite-green focus:outline-none transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {productCategories.length > 0 ? (
                        productCategories.map((cat: ProductCategory) => (
                          <option key={cat.id} value={cat.name}>
                            {language === 'fr' ? cat.display_name_fr : cat.display_name_en}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="standard">{t('catalog.standard')}</option>
                          <option value="window">{t('catalog.window')}</option>
                          <option value="special">{t('catalog.special')}</option>
                          <option value="seasonal">{t('catalog.seasonal')}</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.products.description')}</Label>
                    <textarea
                      className="w-full mt-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-eonite-green focus:outline-none transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-eonite-green focus:ring-eonite-green"
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('admin.products.active')}
                    </Label>
                  </div>
                </div>
              )}

              {/* Variants Tab */}
              {activeTab === 'variants' && (
                <div className="space-y-6">
                  {/* Add new variant */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      <i className="fas fa-plus-circle mr-2 text-eonite-green"></i>
                      {language === 'fr' ? 'Ajouter une taille' : 'Add Size'}
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Taille' : 'Size'}</Label>
                        <Input
                          value={newVariant.size}
                          onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                          placeholder="26x32"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Prix (€)' : 'Price (€)'}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newVariant.price}
                          onChange={e => setNewVariant({ ...newVariant, price: e.target.value })}
                          placeholder="0.10"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Min. commande' : 'Min. order'}</Label>
                        <Input
                          type="number"
                          value={newVariant.min_order_quantity}
                          onChange={e => setNewVariant({ ...newVariant, min_order_quantity: e.target.value })}
                          placeholder="5000"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" onClick={addVariant} className="w-full bg-eonite-green hover:bg-eonite-green-dark">
                          <i className="fas fa-plus mr-2"></i>
                          {language === 'fr' ? 'Ajouter' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Variants list */}
                  {variants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-ruler text-4xl mb-3 text-gray-300"></i>
                      <p>{language === 'fr' ? 'Aucune taille ajoutée' : 'No sizes added'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((variant, index) => (
                        <div key={index} className={`flex items-center gap-4 p-4 rounded-xl border-2 ${variant.is_default ? 'border-eonite-green bg-eonite-green/5' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Taille' : 'Size'}</span>
                              <p className="font-semibold text-gray-900 dark:text-white">{variant.size}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Prix' : 'Price'}</span>
                              <p className="font-semibold text-eonite-green">{formatCurrency(variant.price)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'fr' ? 'Min. commande' : 'Min. order'}</span>
                              <p className="font-semibold text-gray-900 dark:text-white">{variant.min_order_quantity.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {variant.is_default ? (
                              <span className="px-3 py-1 bg-eonite-green text-white text-xs font-bold rounded-full">
                                {language === 'fr' ? 'Par défaut' : 'Default'}
                              </span>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setDefaultVariant(index)} className="text-gray-500 hover:text-eonite-green">
                                <i className="fas fa-star"></i>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Images Tab */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  {/* Upload area */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                    <input
                      ref={multiFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="multi-image-upload"
                    />
                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {language === 'fr' ? 'Glissez vos images ici ou' : 'Drag images here or'}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => multiFileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i> {language === 'fr' ? 'Téléchargement...' : 'Uploading...'}</>
                      ) : (
                        <><i className="fas fa-upload mr-2"></i> {language === 'fr' ? 'Sélectionner des images' : 'Select Images'}</>
                      )}
                    </Button>
                  </div>

                  {/* Images grid */}
                  {images.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-images text-4xl mb-3 text-gray-300"></i>
                      <p>{language === 'fr' ? 'Aucune image ajoutée' : 'No images added'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${image.is_primary ? 'border-eonite-green' : 'border-gray-200 dark:border-gray-700'}`}>
                          <img src={image.image_url} alt="" className="w-full h-full object-cover" />
                          {image.is_primary && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-eonite-green text-white text-xs font-bold rounded">
                              {language === 'fr' ? 'Principal' : 'Primary'}
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            {!image.is_primary && (
                              <button
                                onClick={() => setPrimaryImage(index)}
                                className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-gray-600 hover:text-eonite-green"
                                title={language === 'fr' ? 'Définir comme principal' : 'Set as primary'}
                              >
                                <i className="fas fa-star"></i>
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(index)}
                              className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-gray-600 hover:text-red-500"
                              title={language === 'fr' ? 'Supprimer' : 'Delete'}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={closeModal} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-eonite-green hover:bg-eonite-green-dark">
                <i className={`fas ${editingProduct ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {editingProduct ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-eonite-green rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-tags text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {language === 'fr' ? 'Gérer les catégories' : 'Manage Categories'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'fr' ? 'Créer et supprimer des catégories' : 'Create and delete categories'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Add new category */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  <i className="fas fa-plus-circle mr-2 text-eonite-green"></i>
                  {language === 'fr' ? 'Nouvelle catégorie' : 'New Category'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Nom (identifiant)' : 'Name (identifier)'}</Label>
                    <Input
                      value={newCategory.name}
                      onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="my_category"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Nom (FR)' : 'Display name (FR)'}</Label>
                      <Input
                        value={newCategory.display_name_fr}
                        onChange={e => setNewCategory({ ...newCategory, display_name_fr: e.target.value })}
                        placeholder="Ma catégorie"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Nom (EN)' : 'Display name (EN)'}</Label>
                      <Input
                        value={newCategory.display_name_en}
                        onChange={e => setNewCategory({ ...newCategory, display_name_en: e.target.value })}
                        placeholder="My Category"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button onClick={createCategory} className="w-full bg-eonite-green hover:bg-eonite-green-dark">
                    <i className="fas fa-plus mr-2"></i>
                    {language === 'fr' ? 'Créer la catégorie' : 'Create Category'}
                  </Button>
                </div>
              </div>

              {/* Existing categories */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {language === 'fr' ? 'Catégories existantes' : 'Existing Categories'} ({productCategories.length})
                </h4>
                {productCategories.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <i className="fas fa-tags text-3xl mb-2 text-gray-300"></i>
                    <p>{language === 'fr' ? 'Aucune catégorie' : 'No categories'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productCategories.map((cat: ProductCategory) => {
                      const productCount = products.filter(p => p.category === cat.name).length
                      const isEditing = editingCategory?.id === cat.id

                      return (
                        <div key={cat.id} className={`p-3 rounded-xl ${isEditing ? 'bg-eonite-green/10 border-2 border-eonite-green' : 'bg-gray-50 dark:bg-gray-800'}`}>
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Nom (FR)' : 'Display (FR)'}</Label>
                                  <Input
                                    value={editingCategory.display_name_fr || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory, display_name_fr: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600 dark:text-gray-400">{language === 'fr' ? 'Nom (EN)' : 'Display (EN)'}</Label>
                                  <Input
                                    value={editingCategory.display_name_en || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory, display_name_en: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={updateCategory} className="bg-eonite-green hover:bg-eonite-green-dark">
                                  <i className="fas fa-check mr-1"></i>
                                  {language === 'fr' ? 'Enregistrer' : 'Save'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-eonite-green/10 rounded-lg flex items-center justify-center">
                                  <i className={`fas ${cat.icon} text-eonite-green`}></i>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {language === 'fr' ? cat.display_name_fr : cat.display_name_en}
                                  </p>
                                  <p className="text-xs text-gray-500">{cat.name} • {productCount} {language === 'fr' ? 'produits' : 'products'}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingCategory(cat)}
                                  className="text-gray-500 hover:text-eonite-green hover:bg-eonite-green/10"
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteCategory(cat.id, cat.name)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  disabled={productCount > 0}
                                  title={productCount > 0 ? (language === 'fr' ? 'Catégorie utilisée' : 'Category in use') : ''}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowCategoryModal(false)} className="flex-1">
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
