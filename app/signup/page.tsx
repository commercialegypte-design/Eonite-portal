'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import { getURL } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LanguageToggle from '@/components/LanguageToggle'
import ThemeToggle from '@/components/ThemeToggle'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    contactName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          company_name: formData.companyName,
          contact_name: formData.contactName,
          phone: formData.phone,
        },
        emailRedirectTo: getURL(),
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await (supabase
          .from('profiles') as any)
          .update({
            company_name: formData.companyName,
            contact_name: formData.contactName,
            phone: formData.phone,
          })
          .eq('id', user.id)
      }

      router.push('/verify-email')
      router.refresh()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    // Updated background: delicate radial gradient for light mode, deep charcoal for dark mode
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FDFCF8] to-[#F2F0E9] dark:from-gray-900 dark:to-[#0C0C0A] p-4">
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-white/50 dark:bg-black/20 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-sm">
        <ThemeToggle />
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <LanguageToggle />
      </div>

      <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 dark:shadow-black/20 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ring-1 ring-gray-900/5 dark:ring-white/10">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-4">
            <img src="/logo.png" alt="EONITE" className="h-16 w-auto mx-auto" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{t('auth.signupTitle')}</CardTitle>
          <CardDescription className="text-base text-gray-500 dark:text-gray-400">
            {t('auth.signupDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('auth.companyName')} *</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Boulangerie Le Bon Pain"
                value={formData.companyName}
                onChange={handleChange}
                required
                disabled={loading}
                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('auth.contactName')} *</Label>
              <Input
                id="contactName"
                name="contactName"
                type="text"
                placeholder="Jean Dupont"
                value={formData.contactName}
                onChange={handleChange}
                required
                disabled={loading}
                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('auth.email')} *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contact@bonpain.fr"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('auth.phone')} *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={loading}
                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('auth.password')} *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('auth.confirmPassword')} *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-eonite-green hover:bg-eonite-green-dark text-white rounded-xl shadow-md shadow-eonite-green/20 font-medium transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.signUp')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t('auth.hasAccount')}{' '}
              <Link href="/login" className="text-eonite-green hover:underline font-semibold">
                {t('auth.signInLink')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
