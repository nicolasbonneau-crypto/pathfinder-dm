import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import BookUploader from '@/components/knowledge/BookUploader'
import BookList from '@/components/knowledge/BookList'
import ChatMessage from '@/components/knowledge/ChatMessage'
import { sendChatMessage, listBooks } from '@/api/knowledge'
import type { ChatMessage as ChatMessageType } from '@/types'

export default function KnowledgePage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: listBooks,
  })

  const chatMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatMessageType[] }) =>
      sendChatMessage(message, history),
    onSuccess: (data) => {
      const assistantMsg: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        has_context: data.has_context,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    },
  })

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || chatMutation.isPending) return

    const userMsg: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInput('')
    chatMutation.mutate({ message: trimmed, history: messages })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="knowledge-page">
      <aside className="knowledge-sidebar">
        <BookUploader onUploaded={() => qc.invalidateQueries({ queryKey: ['books'] })} />
        <BookList books={books} onDeleted={() => qc.invalidateQueries({ queryKey: ['books'] })} />
      </aside>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>Ask anything about your Pathfinder 2e rulebooks.</p>
              {books.length === 0 && (
                <p className="chat-empty-hint">Upload a PDF to get started.</p>
              )}
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {chatMutation.isPending && (
            <div className="chat-loading">
              <Loader2 size={16} className="spin" /> Thinking...
            </div>
          )}
          {chatMutation.isError && (
            <div className="chat-error">{(chatMutation.error as Error).message}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="input"
            placeholder="Ask a rules question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={chatMutation.isPending}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .knowledge-page { display: flex; height: 100%; overflow: hidden; }
        .knowledge-sidebar { width: 280px; flex-shrink: 0; padding: 16px; overflow-y: auto; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; }
        .chat-container { flex: 1; display: flex; flex-direction: column; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .chat-empty { text-align: center; color: var(--text-muted); margin-top: 80px; }
        .chat-empty-hint { font-size: 0.8rem; margin-top: 8px; color: var(--accent); }
        .chat-loading { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.85rem; }
        .chat-error { color: var(--accent); font-size: 0.85rem; padding: 8px; }
        .chat-input-row { display: flex; gap: 8px; padding: 16px; border-top: 1px solid var(--border); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
