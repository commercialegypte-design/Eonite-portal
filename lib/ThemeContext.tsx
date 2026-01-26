'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Initialize with the current state from DOM (set by inline script)
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        }
        return 'light'
    })

    // Sync state with localStorage on mount (in case DOM and localStorage are out of sync)
    useEffect(() => {
        const savedTheme = localStorage.getItem('eonite-theme') as Theme
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            if (savedTheme !== theme) {
                setThemeState(savedTheme)
                applyTheme(savedTheme)
            }
        } else {
            // Check system preference if no saved theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            const systemTheme = prefersDark ? 'dark' : 'light'
            if (systemTheme !== theme) {
                setThemeState(systemTheme)
                applyTheme(systemTheme)
            }
        }
    }, [])

    const applyTheme = (newTheme: Theme) => {
        const root = document.documentElement
        if (newTheme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
    }

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem('eonite-theme', newTheme)
        applyTheme(newTheme)
    }

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

