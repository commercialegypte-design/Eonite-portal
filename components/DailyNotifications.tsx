'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyNotification } from '@/types/daily'
import { useLanguage } from '@/lib/LanguageContext'

export default function DailyNotifications() {
    const supabase = createClient()
    const { t } = useLanguage()
    const [notifications, setNotifications] = useState<DailyNotification[]>([])
    const [showNotificationCenter, setShowNotificationCenter] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        // Load initial notifications
        loadNotifications()

        // Subscribe to real-time notifications
        const channel = supabase
            .channel('daily_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'daily_notifications'
                },
                (payload) => {
                    const newNotification = payload.new as DailyNotification
                    handleNewNotification(newNotification)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadNotifications() {
        const { data, error } = await supabase
            .from('daily_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20) as { data: DailyNotification[] | null; error: any }

        if (error) {
            console.error('Error loading notifications:', error)
            return
        }

        setNotifications(data || [])
        const unread = data?.filter(n => !n.is_read).length || 0
        setUnreadCount(unread)
    }

    function handleNewNotification(notification: DailyNotification) {
        // Add notification to the list
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)

        // Play appropriate sound
        playNotificationSound(notification.notification_type)

        // Show toast notification
        showToastNotification(notification)
    }

    function playNotificationSound(type: 'participant_joined' | 'meeting_ended') {
        try {
            // Use browser's built-in audio API
            const audio = new Audio(
                type === 'participant_joined'
                    ? '/sounds/notification-join.mp3'
                    : '/sounds/notification-end.mp3'
            )
            audio.volume = 0.6
            audio.play().catch(err => console.log('Audio play failed:', err))
        } catch (error) {
            console.error('Error playing sound:', error)
        }
    }

    function showToastNotification(notification: DailyNotification) {
        // Create a toast element dynamically
        const toast = document.createElement('div')
        toast.className = `
      fixed top-20 right-6 z-50 max-w-md 
      bg-white dark:bg-gray-800 
      border-l-4 
      ${notification.notification_type === 'participant_joined'
                ? 'border-green-500'
                : 'border-blue-500'
            }
      rounded-lg shadow-2xl p-4 
      animate-slide-in-right
      transition-all duration-300
    `

        toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center ${notification.notification_type === 'participant_joined'
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }">
          <i class="fas ${notification.notification_type === 'participant_joined'
                ? 'fa-user-plus text-green-600 dark:text-green-400'
                : 'fa-phone-slash text-blue-600 dark:text-blue-400'
            }"></i>
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-gray-900 dark:text-white mb-1">
            ${notification.notification_type === 'participant_joined'
                ? 'New Participant Joined'
                : 'Call Ended'
            }
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            ${notification.notification_type === 'participant_joined'
                ? `<strong>${notification.participant_name}</strong> joined <em>${notification.room_name}</em>`
                : `Call in room <em>${notification.room_name}</em> has ended`
            }
          </p>
          <p class="text-xs text-gray-400 mt-1">
            ${new Date(notification.created_at).toLocaleTimeString()}
          </p>
        </div>
        <button 
          onclick="this.parentElement.parentElement.remove()" 
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    `

        document.body.appendChild(toast)

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0'
            toast.style.transform = 'translateX(100%)'
            setTimeout(() => toast.remove(), 300)
        }, 5000)
    }

    async function markAsRead(id: string) {
        const { error } = await (supabase
            .from('daily_notifications') as any)
            .update({ is_read: true })
            .eq('id', id)

        if (error) {
            console.error('Error marking notification as read:', error)
            return
        }

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    async function markAllAsRead() {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

        if (unreadIds.length === 0) return

        const { error } = await (supabase
            .from('daily_notifications') as any)
            .update({ is_read: true })
            .in('id', unreadIds)

        if (error) {
            console.error('Error marking all as read:', error)
            return
        }

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    return (
        <>
            {/* Notification Bell Icon */}
            <div className="relative">
                <button
                    onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                    className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    aria-label="Notifications"
                >
                    <i className="fas fa-bell text-xl"></i>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Notification Center Dropdown */}
                {showNotificationCenter && (
                    <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-video text-eonite-green"></i>
                                Daily.co Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-eonite-green hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <i className="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={`
                      p-4 border-b border-gray-100 dark:border-gray-700 
                      hover:bg-gray-50 dark:hover:bg-gray-700/50 
                      cursor-pointer transition
                      ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                    `}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${notification.notification_type === 'participant_joined'
                                                    ? 'bg-green-100 dark:bg-green-900/30'
                                                    : 'bg-blue-100 dark:bg-blue-900/30'
                                                }
                      `}>
                                                <i className={`fas ${notification.notification_type === 'participant_joined'
                                                    ? 'fa-user-plus text-green-600 dark:text-green-400'
                                                    : 'fa-phone-slash text-blue-600 dark:text-blue-400'
                                                    }`}></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                    {notification.notification_type === 'participant_joined'
                                                        ? 'Participant Joined'
                                                        : 'Call Ended'
                                                    }
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                                    {notification.notification_type === 'participant_joined'
                                                        ? `${notification.participant_name} joined ${notification.room_name}`
                                                        : `Room: ${notification.room_name}`
                                                    }
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Click outside to close */}
            {showNotificationCenter && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotificationCenter(false)}
                ></div>
            )}
        </>
    )
}
