'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClientHeader from '@/components/ClientHeader'
import { useLanguage } from '@/lib/LanguageContext'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Offer {
    id: string
    title: string
    description: string
    image_url: string
    created_at: string
    discount_code?: string
    discount_percent?: number
    products?: any[]
}

export const dynamic = 'force-dynamic'

export default function ClientOffers() {
    const [offers, setOffers] = useState<Offer[]>([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const { t } = useLanguage()

    const supabase = createClient()

    useEffect(() => {
        async function loadData() {
            try {
                // 1. Get user profile
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: userProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()
                    setProfile(userProfile)
                }

                // 2. Get offers with products
                const { data, error } = await supabase
                    .from('offers')
                    .select(`
            *,
            offer_products (
              product: products (id, name)
            )
          `)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })

                if (error) throw error

                const formattedOffers = data?.map((offer: any) => ({
                    ...offer,
                    products: offer.offer_products?.map((op: any) => op.product) || []
                })) || []

                setOffers(formattedOffers)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    async function handleLogout() {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24 min-h-screen bg-eonite-beige dark:bg-gray-950">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="bg-eonite-beige dark:bg-gray-950 min-h-screen">
            <ClientHeader
                profile={profile}
                onLogout={handleLogout}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-slate-900 mb-8 dark:text-white">
                    {t('offers.title')}
                </h1>

                {offers.length === 0 ? (
                    <div className="text-center py-24 bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-xl text-gray-500 dark:text-gray-400">
                            {t('offers.noOffers')}
                        </p>
                        <p className="mt-2 text-gray-400 dark:text-gray-500">
                            {t('offers.checkBack')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {offers.map((offer) => (
                            <div
                                key={offer.id}
                                className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1"
                            >
                                <div className="relative h-64 w-full bg-gray-100 dark:bg-gray-800">
                                    <Image
                                        src={offer.image_url}
                                        alt={offer.title}
                                        fill
                                        className="object-cover"
                                    />
                                    {offer.discount_percent && (
                                        <div className="absolute top-4 left-4 bg-eonite-green text-white font-bold px-3 py-1.5 rounded-lg shadow-lg flex flex-col items-center">
                                            <span className="text-xl leading-none">-{offer.discount_percent}%</span>
                                            <span className="text-[10px] uppercase tracking-wider">{t('offers.off')}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6">
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display">
                                        {offer.title}
                                    </h3>
                                    {offer.description && (
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                            {offer.description}
                                        </p>
                                    )}

                                    {offer.products && offer.products.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold mb-2">
                                                {t('offers.availableOn')}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {offer.products.map((p: any) => (
                                                    <span
                                                        key={p.id}
                                                        className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                                                    >
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {offer.discount_code && (
                                        <div className="mt-4 p-4 bg-eonite-green/10 dark:bg-eonite-green/10 rounded-xl border border-eonite-green/30 dark:border-eonite-green/30">
                                            <p className="text-xs text-eonite-green dark:text-eonite-green-light font-medium mb-1 uppercase tracking-wide">{t('offers.useCode')}</p>
                                            <div className="flex items-center gap-3">
                                                <code className="text-xl font-mono font-bold text-eonite-green-dark dark:text-eonite-green-light tracking-wide select-all">
                                                    {offer.discount_code}
                                                </code>
                                                {offer.discount_percent && (
                                                    <span className="text-sm text-eonite-green/70 dark:text-eonite-green-light/70">
                                                        {t('offers.getPercentOff').replace('{percent}', offer.discount_percent?.toString() || '')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
