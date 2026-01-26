import { formatDateTime } from '@/lib/utils'

interface MessageBubbleProps {
    content: string
    isOwn: boolean
    senderName?: string
    timestamp: string
    attachmentUrl?: string | null
    attachmentName?: string | null
    onAttachmentClick?: (url: string) => void
    showAvatar?: boolean
    avatarChar?: string // Character to show in avatar if no image
    className?: string
}

export default function MessageBubble({
    content,
    isOwn,
    senderName,
    timestamp,
    attachmentUrl,
    attachmentName,
    onAttachmentClick,
    showAvatar = true,
    avatarChar = 'User',
    className = ''
}: MessageBubbleProps) {
    return (
        <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${className} mb-4 group`}>
            <div className={`flex max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>

                {/* Avatar */}
                {showAvatar && !isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 mb-1">
                        {avatarChar?.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Bubble */}
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && senderName && (
                        <span className="text-[10px] text-gray-500 ml-1 mb-1">{senderName}</span>
                    )}

                    <div
                        className={`px-4 py-2 sm:px-5 sm:py-3 shadow-sm relative text-sm sm:text-base break-words 
              ${isOwn
                                ? 'bg-eonite-green text-white rounded-2xl rounded-tr-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm'
                            }`}
                    >
                        <div className="whitespace-pre-wrap">{content}</div>

                        {attachmentUrl && (
                            <button
                                onClick={() => onAttachmentClick?.(attachmentUrl)}
                                className={`flex items-center gap-3 mt-3 p-2.5 rounded-xl text-sm transition-all w-full
                    ${isOwn
                                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-600'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm
                    ${isOwn ? 'bg-white/20' : 'bg-white dark:bg-gray-800'}`}>
                                    📄
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="font-medium truncate">{attachmentName || 'Document'}</div>
                                    <div className="text-[10px] opacity-70 uppercase tracking-wider">PDF</div>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Timestamp - visible on hover or always if mobile? Let's hide and show on hover for cleanliness or keep small */}
                    <span className={`text-[10px] text-gray-400 mt-1 px-1 transition-opacity ${isOwn ? 'text-right' : 'text-left'}`}>
                        {formatDateTime(timestamp)}
                    </span>
                </div>
            </div>
        </div>
    )
}
