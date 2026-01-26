'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Offer {
    id: string
    title: string
    description: string
    image_url: string
    is_active: boolean
    created_at: string
    discount_code?: string
    discount_percent?: number
    products?: any[]
}

export const dynamic = 'force-dynamic'

export default function AdminOffersPage() {
    const [offers, setOffers] = useState<Offer[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [discountCode, setDiscountCode] = useState('')
    const [discountPercent, setDiscountPercent] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const supabase = createClient()
    const { t } = useLanguage()

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)

            // Fetch offers with their linked products
            const { data: offersData, error: offersError } = await supabase
                .from('offers')
                .select(`
          *,
          offer_products (
            product: products (id, name)
          )
        `)
                .order('created_at', { ascending: false })

            if (offersError) throw offersError

            const formattedOffers = offersData?.map((offer: any) => ({
                ...offer,
                products: offer.offer_products?.map((op: any) => op.product) || []
            })) || []

            setOffers(formattedOffers)

            // Fetch active products for the selector
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, name')
                .eq('is_active', true)
                .order('name')

            if (productsError) throw productsError
            setProducts(productsData || [])

        } catch (error) {
            console.error('Error fetching data:', JSON.stringify(error, null, 2))
            console.error('Full Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            setImageFile(null)
            setImagePreview(null)
            return
        }
        const file = e.target.files[0]
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }

    async function handleCreateOffer(e: React.FormEvent) {
        e.preventDefault()
        if (!title || !imageFile) {
            alert(t('common.error'))
            return
        }

        try {
            setUploading(true)

            // 1. Upload image
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('offers')
                .upload(filePath, imageFile)

            if (uploadError) throw uploadError

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('offers')
                .getPublicUrl(filePath)

            // 3. Insert offer record
            const { data: newOffer, error: insertError } = await (supabase
                .from('offers') as any)
                .insert([{
                    title: title,
                    description: description,
                    image_url: publicUrl,
                    is_active: true,
                    discount_code: discountCode || null,
                    discount_percent: discountPercent ? parseFloat(discountPercent) : null,
                    // If backend supports product_ids in one go:
                    // but schema seems to use joining table
                }])
                .select()
                .single() as any

            if (insertError) throw insertError

            // 4. Link selected products
            if (selectedProductIds.length > 0 && newOffer) {
                const productLinks = selectedProductIds.map(productId => ({
                    offer_id: newOffer.id,
                    product_id: productId
                }))

                const { error: productsError } = await (supabase
                    .from('offer_products') as any)
                    .insert(productLinks)

                if (productsError) throw productsError
            }

            // Reset and reload
            setTitle('')
            setDescription('')
            setDiscountCode('')
            setDiscountPercent('')
            setSelectedProductIds([])
            setImageFile(null)
            setImagePreview(null)
            setIsCreating(false)
            fetchData()

        } catch (error: any) {
            console.error('Error creating offer:', error)
            alert(`${t('common.error')}: ${error.message}`)
        } finally {
            setUploading(false)
        }
    }

    async function handleDeleteOffer(id: string) {
        if (!confirm(t('admin.offers.deleteConfirm'))) return

        try {
            const { error } = await supabase
                .from('offers')
                .delete()
                .eq('id', id)

            if (error) throw error

            fetchData()
        } catch (error) {
            console.error('Error deleting offer:', error)
        }
    }

    return (
        <AdminLayout>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        {t('admin.offers.title')}
                    </h1>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="bg-eonite-green hover:bg-eonite-green-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        {isCreating ? t('common.cancel') : <><Plus size={20} /> {t('admin.offers.create')}</>}
                    </button>
                </div>

                {isCreating && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 mb-8 max-w-2xl animate-in fade-in slide-in-from-top-4">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('admin.offers.newOfferDetails')}</h2>
                        <form onSubmit={handleCreateOffer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('admin.offers.offerTitle')}</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g., Summer Sale 50% Off"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('admin.offers.description')} ({t('common.optional')})</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder={t('admin.offers.description')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('admin.offers.discountCode')} ({t('common.optional')})</label>
                                    <input
                                        type="text"
                                        value={discountCode}
                                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="e.g. SUMMER24"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('admin.offers.discountPercent')} ({t('common.optional')})</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discountPercent}
                                        onChange={(e) => setDiscountPercent(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="e.g. 20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">{t('admin.offers.applicableProducts')} ({t('common.optional')})</label>
                                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 dark:bg-gray-900">
                                    <div className="space-y-2">
                                        {products.map(product => (
                                            <label key={product.id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-gray-700 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.includes(product.id)}
                                                    onChange={() => toggleProductSelection(product.id)}
                                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-gray-300">{product.name}</span>
                                            </label>
                                        ))}
                                        {products.length === 0 && (
                                            <p className="text-sm text-slate-500 dark:text-gray-400 italic text-center">{t('admin.offers.noActiveProducts')}</p>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{t('admin.offers.generalOffer')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('admin.offers.promoImage')}</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-gray-600 border-dashed rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors relative cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-1 text-center">
                                        {imagePreview ? (
                                            <div className="relative w-full h-48 mx-auto">
                                                <Image
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                                                <div className="flex text-sm text-slate-600 dark:text-gray-400 justify-center">
                                                    <span className="font-medium text-eonite-green hover:text-eonite-green-dark">
                                                        {t('admin.offers.uploadFile')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-eonite-green hover:bg-eonite-green-dark text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                            >
                                {uploading ? (
                                    <><Loader2 className="animate-spin" /> {t('admin.offers.publish')}...</>
                                ) : (
                                    t('admin.offers.publish')
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-eonite-green" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {offers.length === 0 && !isCreating && (
                            <div className="col-span-full text-center py-12 text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800 rounded-lg border border-dashed border-slate-300 dark:border-gray-700">
                                {t('admin.offers.noOffers')}
                            </div>
                        )}

                        {offers.map((offer) => (
                            <div key={offer.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden group">
                                <div className="relative h-48 w-full bg-slate-100 dark:bg-gray-700">
                                    <Image
                                        src={offer.image_url}
                                        alt={offer.title}
                                        fill
                                        className="object-cover"
                                    />
                                    {offer.discount_percent && (
                                        <div className="absolute top-2 left-2 bg-eonite-green text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                                            -{offer.discount_percent}% OFF
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDeleteOffer(offer.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{offer.title}</h3>
                                    {offer.description && (
                                        <p className="text-slate-600 dark:text-gray-400 text-sm line-clamp-2">{offer.description}</p>
                                    )}

                                    {offer.discount_code && (
                                        <div className="mt-3 p-2 bg-slate-50 dark:bg-gray-700 rounded-lg border border-dashed border-slate-300 dark:border-gray-600 flex justify-between items-center">
                                            <span className="text-xs text-slate-500 dark:text-gray-400">{t('admin.offers.discountCode')}:</span>
                                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{offer.discount_code}</span>
                                        </div>
                                    )}

                                    {offer.products && offer.products.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{t('admin.offers.validOn')}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {offer.products.map((p: any) => (
                                                    <span key={p.id} className="text-[10px] bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-gray-600">
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 flex justify-between items-center text-xs text-slate-400 dark:text-gray-500">
                                        <span>{new Date(offer.created_at).toLocaleDateString()}</span>
                                        <span className={`px-2 py-1 rounded-full ${offer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700'}`}>
                                            {offer.is_active ? t('status.active') : 'Draft'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
