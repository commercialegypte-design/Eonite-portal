'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import ClientHeader from '@/components/ClientHeader'
import { formatDateTime } from '@/lib/utils'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'

export const dynamic = 'force-dynamic'

export default function ClientMessages() {
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useLanguage()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    loadUserAndConversation()
  }, [])

  useEffect(() => {
    if (conversation) {
      loadMessages(conversation.id)

      const channel = supabase
        .channel(`conversation-${conversation.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversation.id}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new])
            scrollToBottom()
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [conversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadUserAndConversation() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    setProfile(profileData)

    // Get single conversation for this client
    const { data: existingConv } = await supabase
      .from('conversations')
      .select(`
        *,
        profiles!conversations_admin_id_fkey (
          contact_name,
          company_name
        )
      `)
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (existingConv) {
      setConversation(existingConv)
    } else {
      await createConversation(currentUser.id)
    }

    setLoading(false)
  }

  async function createConversation(clientId: string) {
    const { data: adminId, error: adminError } = await supabase
      .rpc('get_admin_for_conversation')

    if (adminError || !adminId) {
      console.error('Failed to find admin:', adminError)
      return
    }

    const { data: newConv, error: convError } = await (supabase
      .from('conversations') as any)
      .insert([{
        client_id: clientId,
        admin_id: adminId,
        subject: language === 'fr' ? 'Support EONITE' : 'EONITE Support',
        status: 'open'
      }])
      .select(`
        *,
        profiles!conversations_admin_id_fkey (
          contact_name,
          company_name
        )
      `)
      .single()

    if (convError) {
      // If conversation already exists (race condition), fetch it
      if (convError.code === '23505') { // Postgres unique_violation code
        const { data: existing } = await supabase
          .from('conversations')
          .select(`
            *,
            profiles!conversations_admin_id_fkey (
              contact_name,
              company_name
            )
          `)
          .eq('client_id', clientId)
          .single()

        if (existing) {
          setConversation(existing)
        }
      } else {
        console.error('Failed to create conversation:', convError)
      }
      return
    }

    if (newConv) {
      setConversation(newConv)
    }
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_sender_id_fkey (
          contact_name,
          role
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setMessages(data || [])

    const { error: updateError } = await (supabase
      .from('conversations') as any)
      .update({ unread_count: 0 })
      .eq('id', conversationId) // Assuming conversationId is the correct ID here
      .eq('client_id', user?.id)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else if (file) {
      alert(language === 'fr' ? 'Seuls les fichiers PDF sont acceptés' : 'Only PDF files are accepted')
    }
  }

  function removeFile() {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !conversation || sending) return

    setSending(true)
    let attachmentUrl = null
    let attachmentName = null

    // Upload file if selected
    if (selectedFile) {
      setUploading(true)
      try {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, selectedFile)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(language === 'fr' ? 'Erreur lors du téléchargement du fichier' : 'Error uploading file')
        } else {
          // Store the file path instead of public URL for more reliable access
          attachmentUrl = filePath
          attachmentName = selectedFile.name
        }
      } catch (error) {
        console.error('Upload failed:', error)
      }
      setUploading(false)
    }

    const { error } = await (supabase
      .from('messages') as any)
      .insert([{
        conversation_id: conversation.id, // Using 'conversation.id' as 'selectedConversation' is not defined
        sender_id: user.id,
        content: newMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : ''), // Using 'selectedFile' as 'attachment' is not defined
        attachment_url: attachmentUrl,
        attachment_name: selectedFile ? selectedFile.name : null // Using 'selectedFile' as 'attachment' is not defined
      }])

    if (error) {
      console.error('Failed to send message:', error)
      setSending(false)
      return
    }

    setNewMessage('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    await (supabase
      .from('conversations') as any)
      .update({
        last_message_at: new Date().toISOString(),
        status: 'open',
        unread_count: (conversation?.unread_count || 0) + 1 // Using existing unread_count + 1 as 'currentUnread' is not defined
      })
      .eq('id', conversation.id) // Using 'conversation.id' as 'selectedConversation' is not defined

    await loadMessages(conversation.id)
    setSending(false)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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

  // Helper to Group Messages by Date
  function groupMessagesByDate(msgs: any[]) {
    const groups: { [key: string]: any[] } = {}
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(msg)
    })
    return groups
  }

  function getDateLabel(dateStr: string) {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toLocaleDateString() === today.toLocaleDateString()) {
      return language === 'fr' ? "Aujourd'hui" : "Today"
    } else if (date.toLocaleDateString() === yesterday.toLocaleDateString()) {
      return language === 'fr' ? "Hier" : "Yesterday"
    } else {
      return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    }
  }

  const messageGroups = groupMessagesByDate(messages)

  const handleAttachmentClick = async (url: string) => {
    const { data } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(url, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-eonite-beige dark:bg-gray-950 pb-20 sm:pb-0">
      <ClientHeader profile={profile} onLogout={handleLogout} unreadMessages={unreadMessages} />

      <main className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6 h-[calc(100vh-64px)] sm:h-auto">

        <Card className="flex flex-col h-full sm:h-[80vh] border-0 sm:border dark:bg-gray-900/50 dark:border-gray-800 shadow-none sm:shadow-xl rounded-none sm:rounded-2xl overflow-hidden backdrop-blur-sm bg-white/80">
          <CardHeader className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b dark:border-gray-800 p-4 sticky top-0 z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-tr from-eonite-green to-emerald-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white dark:ring-gray-900">
                  <i className="fas fa-headset"></i>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold dark:text-white flex items-center gap-2">
                  {t('messages.support')}
                  <span className="px-2 py-0.5 rounded-full bg-eonite-green/10 text-eonite-green text-[10px] font-bold uppercase tracking-wider">
                    Official
                  </span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'fr' ? 'Réponse habituelle en quelques heures' : 'Typically replies within a few hours'}
                </p>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-gray-50/50 dark:bg-black/20">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <i className="fas fa-comments text-4xl text-gray-300 dark:text-gray-600"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('messages.noMessages')}</h3>
                <p className="text-gray-500 max-w-xs">{language === 'fr' ? 'Envoyez un message pour démarrer la conversation.' : 'Send a message to start the conversation.'}</p>
              </div>
            ) : (
              <>
                {Object.keys(messageGroups).map(date => (
                  <div key={date}>
                    <div className="flex justify-center mb-6 sticky top-0 z-0">
                      <span className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                        {getDateLabel(date)}
                      </span>
                    </div>
                    {messageGroups[date].map((msg) => {
                      const isOwn = msg.sender_id === user?.id
                      return (
                        <MessageBubble
                          key={msg.id}
                          content={msg.content}
                          isOwn={isOwn}
                          senderName={!isOwn ? (msg.profiles?.contact_name || t('messages.support')) : undefined}
                          timestamp={msg.created_at}
                          attachmentUrl={msg.attachment_url}
                          attachmentName={msg.attachment_name}
                          onAttachmentClick={handleAttachmentClick}
                          showAvatar={!isOwn}
                          avatarChar="S"
                        />
                      )
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>

          {/* Input Area */}
          <ChatInput
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onSubmit={sendMessage}
            onFileSelect={handleFileSelect}
            onRemoveFile={removeFile}
            selectedFile={selectedFile}
            loading={sending || uploading}
            placeholder={t('messages.typeMessage')}
            fileInputRef={fileInputRef}
          />
        </Card>
      </main>
    </div>
  )
}

