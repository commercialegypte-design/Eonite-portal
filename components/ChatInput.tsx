import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatInputProps {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSubmit: (e: React.FormEvent) => void
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
    onRemoveFile: () => void
    selectedFile: File | null
    loading: boolean
    placeholder?: string
    attachLabel?: string
    sendLabel?: string
    fileInputRef: React.RefObject<HTMLInputElement>
}

export default function ChatInput({
    value,
    onChange,
    onSubmit,
    onFileSelect,
    onRemoveFile,
    selectedFile,
    loading,
    placeholder = "Type a message...",
    attachLabel = "Attach",
    sendLabel = "Send",
    fileInputRef
}: ChatInputProps) {
    return (
        <div className="border-t dark:border-gray-800 p-4 bg-white dark:bg-gray-900 sticky bottom-0 z-10">
            {selectedFile && (
                <div className="mb-3 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/80 backdrop-blur border border-gray-100 dark:border-gray-700 rounded-2xl p-3 shadow-sm animate-in slide-in-from-bottom-2">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl flex items-center justify-center text-xl">
                        📄
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate dark:text-white">{selectedFile.name}</div>
                        <div className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button
                        onClick={onRemoveFile}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-2 items-end">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={onFileSelect}
                    className="hidden"
                />

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    title={attachLabel}
                    className="rounded-full h-12 w-12 text-gray-500 hover:text-eonite-green hover:bg-eonite-green/5 dark:text-gray-400 dark:hover:bg-gray-800 flex-shrink-0"
                >
                    <i className="fas fa-paperclip text-lg"></i>
                </Button>

                <div className="flex-1 relative">
                    <Input
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        disabled={loading}
                        className="w-full rounded-3xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:border-eonite-green focus:ring-4 focus:ring-eonite-green/10 transition-all py-6 px-6 shadow-sm"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={loading || (!value.trim() && !selectedFile)}
                    className={`h-12 w-12 rounded-full flex-shrink-0 shadow-md transition-all duration-300 ${loading || (!value.trim() && !selectedFile)
                            ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 scale-95'
                            : 'bg-eonite-green hover:bg-green-600 text-white hover:scale-105 hover:shadow-lg'
                        }`}
                >
                    {loading ? (
                        <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                        <i className="fas fa-paper-plane"></i>
                    )}
                </Button>
            </form>
        </div>
    )
}
