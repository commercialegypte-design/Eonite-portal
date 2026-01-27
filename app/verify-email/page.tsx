'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import { useLanguage } from '@/lib/LanguageContext'

export default function VerifyEmailPage() {
    const { t } = useLanguage()

    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FDFCF8] to-[#F2F0E9] dark:from-gray-900 dark:to-[#0C0C0A] p-4">
            <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-white/50 dark:bg-black/20 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-sm">
                <ThemeToggle />
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <LanguageToggle />
            </div>

            <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 dark:shadow-black/20 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ring-1 ring-gray-900/5 dark:ring-white/10">
                <CardHeader className="space-y-2 text-center">
                    <div className="mx-auto mb-4 bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-600 dark:text-green-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        Vérifiez votre email
                    </CardTitle>
                    <CardDescription className="text-base text-gray-500 dark:text-gray-400">
                        Nous avons envoyé un lien de vérification à votre adresse email. Veuillez cliquer sur ce lien pour activer votre compte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 flex flex-col gap-4">
                    <div className="text-sm text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <p>Si vous ne voyez pas l'email, vérifiez vos spams ou indésirables.</p>
                    </div>

                    <Link href="/login" className="w-full">
                        <Button
                            className="w-full h-11 bg-eonite-green hover:bg-eonite-green-dark text-white rounded-xl shadow-md shadow-eonite-green/20 font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Retour à la connexion
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
