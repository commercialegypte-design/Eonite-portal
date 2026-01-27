'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'

export default function UpdatePasswordPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères')
            setLoading(false)
            return
        }

        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        }
    }

    return (
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
                    <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        Nouveau mot de passe
                    </CardTitle>
                    <CardDescription className="text-base text-gray-500 dark:text-gray-400">
                        Entrez votre nouveau mot de passe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                    <form onSubmit={handleUpdate} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
                                Mot de passe mis à jour avec succès! Redirection...
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Nouveau mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading || success}
                                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Confirmer mot de passe</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading || success}
                                className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-eonite-green/20 focus:border-eonite-green transition-all duration-200 rounded-xl dark:text-white dark:placeholder-gray-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-eonite-green hover:bg-eonite-green-dark text-white rounded-xl shadow-md shadow-eonite-green/20 font-medium transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
                            disabled={loading || success}
                        >
                            {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
