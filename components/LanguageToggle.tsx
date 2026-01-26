'use client'

import { useLanguage } from '@/lib/LanguageContext'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
      <button
        onClick={() => setLanguage('fr')}
        className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${language === 'fr'
            ? 'bg-eonite-green text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
      >
        🇫🇷 FR
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${language === 'en'
            ? 'bg-eonite-green text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
      >
        🇬🇧 EN
      </button>
    </div>
  )
}
