'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyNotification } from '@/types/daily'
import { useLanguage } from '@/lib/LanguageContext'

export default function DailyNotificationsWidget() {
    const supabase = createClient()
    const { t } = useLanguage()
    const [notifications, setNotifications] = useState<DailyNotification[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadNotifications()

        const channel = supabase
            .channel('daily_widget')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'daily_notifications'
                },
                (payload) => {
                    setNotifications(prev => [payload.new as DailyNotification, ...prev])
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'daily_notifications'
                },
                (payload) => {
                    setNotifications(prev =>
                        prev.map(n => n.id === payload.new.id ? payload.new as DailyNotification : n)
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadNotifications() {
        try {
            const { data, error } = await supabase
                .from('daily_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50) as { data: DailyNotification[] | null; error: any }

            if (error) throw error
            setNotifications(data || [])
        } catch (error) {
            console.error('Error loading daily notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    async function markAsRead(id: string) {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )

        await (supabase
            .from('daily_notifications') as any)
            .update({ is_read: true })
            .eq('id', id)
    }

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 h-96 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-eonite-green border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg flex flex-col h-[500px]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-t-2xl">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <i className="fas fa-video text-eonite-green"></i>
                    Daily.co Activity
                </h3>
                <span className="text-xs font-bold px-3 py-1 bg-eonite-green/10 text-eonite-green rounded-full">
                    Real-time
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-video-slash text-2xl"></i>
                        </div>
                        <p>No activity recorded yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0
                    ${notification.notification_type === 'participant_joined'
                                            ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                                            : 'bg-gradient-to-br from-gray-600 to-gray-800 text-white'
                                        }
                  `}>
                                        <i className={`fas ${notification.notification_type === 'participant_joined'
                                                ? 'fa-user-plus'
                                                : 'fa-phone-slash'
                                            } text-lg`}></i>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${notification.notification_type === 'participant_joined'
                                                    ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {notification.notification_type === 'participant_joined' ? 'Joined' : 'Ended'}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                                {new Date(notification.created_at).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">
                                            {notification.room_name}
                                        </h4>

                                        {notification.participant_name && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 flex items-center gap-1.5">
                                                <i className="fas fa-user text-xs opacity-50"></i>
                                                {notification.participant_name}
                                            </p>
                                        )}

                                        {!notification.is_read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                Mark as read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
