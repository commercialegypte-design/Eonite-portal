'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/LanguageContext'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/utils'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'

export const dynamic = 'force-dynamic'

export default function AdminMessages() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientIdParam = searchParams.get('client')
  const { t, language } = useLanguage()

  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    checkAdminAndLoadConversations()
  }, [clientIdParam])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)

      // Subscribe to new messages
      const channel = supabase
        .channel(`admin-conversation-${selectedConversation.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
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
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function checkAdminAndLoadConversations() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single() as any

    if (profile?.role !== 'admin' && profile?.role !== 'designer') {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        profiles!conversations_client_id_fkey (
          id,
          contact_name,
          company_name,
          email
        )
      `)
      .order('last_message_at', { ascending: false })

    console.log('Admin conversations:', { data, error, userId: currentUser.id })

    if (error) {
      console.error('Failed to load conversations:', error)
    }

    // logic handling
    let finalConversations: any[] = data || []
    let conversationToSelect = null

    if (clientIdParam) {
      const targetConv = finalConversations.find((c: any) => c.client_id === clientIdParam)
      if (targetConv) {
        conversationToSelect = targetConv
      } else {
        // Fetch client details to start new conversation
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('id, company_name, contact_name, email, role')
          .eq('id', clientIdParam)
          .single<any>()

        if (clientProfile) {
          const newConv: any = {
            id: 'new',
            client_id: clientProfile.id,
            subject: 'New Conversation',
            status: 'open',
            unread_count: 0,
            last_message_at: new Date().toISOString(),
            profiles: clientProfile
          }
          finalConversations = [newConv, ...finalConversations]
          conversationToSelect = newConv
        }
      }
    }

    if (!conversationToSelect && finalConversations.length > 0) {
      conversationToSelect = finalConversations[0]
    }

    setConversations(finalConversations)
    if (conversationToSelect) {
      setSelectedConversation(conversationToSelect)
    }

    setLoading(false)
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabase
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

    console.log('Admin messages load:', { conversationId, data, error })

    if (error) {
      console.error('Failed to load messages:', error)
    }

    setMessages(data || [])

    // Mark as read for admin
    const { error: updateError } = await (supabase
      .from('conversations') as any)
      .update({ unread_count: 0 })
      .eq('id', selectedConversation.id)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else if (file) {
      alert(t('messages.pdfOnly') || 'Only PDF files are accepted')
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
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || sending) return

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
          alert('Error uploading file')
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

    let conversationId = selectedConversation.id

    // If new conversation, create it first
    if (conversationId === 'new') {
      const { data: newConvData, error: createError } = await (supabase
        .from('conversations') as any)
        .insert([{
          client_id: selectedConversation.client_id,
          subject: 'Support', // Default subject
          status: 'open',
          last_message_at: new Date().toISOString(),
          unread_count: 0
        }])
        .select()
        .single()

      if (createError) {
        console.error('Failed to create conversation:', createError)
        setSending(false)
        return
      }

      conversationId = newConvData.id
      // Update selected conversation with real ID
      const realConv = { ...selectedConversation, id: conversationId }
      setSelectedConversation(realConv)
      setConversations(prev => prev.map(c => c.id === 'new' ? realConv : c))
    }

    const { error } = await (supabase
      .from('messages') as any)
      .insert([{
        conversation_id: conversationId,
        sender_id: user.id,
        content: newMessage,
        attachment_url: attachmentUrl,
        attachment_name: selectedFile ? selectedFile.name : null
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

    // Update conversation - increment unread count for client
    const { error: convError } = await (supabase
      .from('conversations') as any)
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: 1 // Increment/Set unread for client (since admin is sending)
      })
      .eq('id', conversationId)

    // Manually reload messages (fallback if realtime doesn't work)
    await loadMessages(conversationId)

    setSending(false)
  }

  async function markAsClosed(convId: string) {
    const { error } = await (supabase
      .from('conversations') as any)
      .update({ status: 'closed' })
      .eq('id', convId)

    await checkAdminAndLoadConversations()
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ... inside AdminMessages component
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

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
      return t('common.today') || (language === 'fr' ? "Aujourd'hui" : "Today")
    } else if (date.toLocaleDateString() === yesterday.toLocaleDateString()) {
      return t('common.yesterday') || (language === 'fr' ? "Hier" : "Yesterday")
    } else {
      return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    }
  }

  const messageGroups = groupMessagesByDate(messages)

  // Handle conversation selection with mobile logic
  const handleSelectConversation = (conv: any) => {
    setSelectedConversation(conv)
    setMobileView('chat')
    // Reset scroll or anything else needed
  }

  const handleBackToList = () => {
    setMobileView('list')
    setSelectedConversation(null)
  }

  const handleAttachmentClick = async (url: string) => {
    const { data } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(url, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-eonite-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </div>
    )
  }

  const unreadCount = conversations.filter(c => c.unread_count > 0).length

  return (
    <AdminLayout disablePadding={true}>
      {/* Full width container filling the remaining height */}
      <div className="h-full flex flex-col bg-white dark:bg-gray-950 border-l dark:border-gray-800">

        {/* Title Bar (Desktop Only - Minimal) */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{t('messages.title')}</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5 opacity-80">{t('messages.adminSubtitle')}</p>
          </div>
          {unreadCount > 0 && (
            <span className="bg-eonite-green/10 text-eonite-green text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount} {t('messages.newMessages')}
            </span>
          )}
        </div>

        <div className="flex flex-1 min-h-0 relative">

          {/* Conversations List Pane */}
          <div className={`
                    w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 absolute md:relative inset-y-0 z-20
                    ${mobileView === 'chat' ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
                `}>
            {/* Search / Filter could go here */}

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                  <i className="fas fa-inbox text-2xl mb-2 opacity-50"></i>
                  <span>{t('messages.noMessages')}</span>
                </div>
              ) : (
                conversations.map(conv => {
                  const isActive = selectedConversation?.id === conv.id
                  const isUnread = conv.unread_count > 0
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`
                                            group px-5 py-4 cursor-pointer transition-all duration-200 border-b border-gray-50 dark:border-gray-800/50 relative
                                            ${isActive ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'}
                                        `}
                    >
                      {/* Active Accent Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-eonite-green"></div>
                      )}

                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className={`text-[15px] font-medium truncate pr-2 ${isActive || isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {conv.profiles?.company_name || conv.profiles?.contact_name || 'Unknown'}
                        </h4>
                        <span className={`text-[11px] flex-shrink-0 ${isUnread ? 'text-eonite-green font-bold' : 'text-gray-400'}`}>
                          {formatDateTime(conv.last_message_at)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className={`text-[13px] truncate flex-1 pr-4 leading-relaxed ${isUnread ? 'text-gray-900 font-medium dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {conv.subject}
                        </p>

                        {isUnread && (
                          <div className="w-2.5 h-2.5 bg-eonite-green rounded-full shadow-sm flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Chat Area Pane */}
          <div className={`
                    flex-1 flex flex-col bg-white dark:bg-gray-950 md:bg-gray-50/30 transition-transform duration-300 absolute md:static inset-0 z-30 md:z-0
                    ${mobileView === 'list' ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}
                `}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToList}
                      className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300"
                    >
                      <i className="fas fa-arrow-left"></i>
                    </button>

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white dark:ring-gray-800">
                      {selectedConversation.profiles?.company_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {selectedConversation.profiles?.company_name || selectedConversation.profiles?.contact_name}
                      </h2>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Active Support
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsClosed(selectedConversation.id)}
                        className="text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 h-9"
                        title={t('messages.markResolved')}
                      >
                        <i className="fas fa-check text-lg"></i>
                        <span className="hidden sm:inline ml-2 text-sm font-medium">Resolve</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-white dark:bg-gray-950">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <p>{t('messages.noMessages')}</p>
                    </div>
                  ) : (
                    <>
                      {Object.keys(messageGroups).map(date => (
                        <div key={date} className="relative">
                          <div className="flex justify-center mb-8">
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                              {getDateLabel(date)}
                            </span>
                          </div>
                          {messageGroups[date].map((msg, index) => {
                            const isAdmin = msg.profiles?.role === 'admin' || msg.profiles?.role === 'designer'
                            const isConsecutive = index > 0 && messageGroups[date][index - 1].sender_id === msg.sender_id
                            return (
                              <MessageBubble
                                key={msg.id}
                                content={msg.content}
                                isOwn={isAdmin}
                                senderName={(!isAdmin && !isConsecutive) ? (msg.profiles?.contact_name) : undefined}
                                timestamp={msg.created_at}
                                attachmentUrl={msg.attachment_url}
                                attachmentName={msg.attachment_name}
                                onAttachmentClick={handleAttachmentClick}
                                showAvatar={!isAdmin && !isConsecutive}
                                avatarChar={msg.profiles?.contact_name?.charAt(0) || 'U'}
                                className={isConsecutive ? '-mt-2' : ''}
                              />
                            )
                          })}
                        </div>
                      ))}
                      <div ref={messagesEndRef} className="h-2" />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 sm:px-6 sticky bottom-0 z-20">
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
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <i className="fas fa-paper-plane text-3xl text-gray-300 dark:text-gray-600 transform -rotate-12 translate-x-1 translate-y-1"></i>
                </div>
                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Select a Conversation</h3>
                <p className="max-w-xs text-sm leading-relaxed">Choose a client from the list to view history or send a new message.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
