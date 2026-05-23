import { BookOpen, AlertTriangle } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types'

interface Props {
  message: ChatMessageType
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  const noContext = message.role === 'assistant' && message.has_context === false

  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className={`msg-bubble ${noContext ? 'msg-no-context' : ''}`}>
        <p className="msg-content">{message.content}</p>
        {noContext && (
          <div className="msg-warning">
            <AlertTriangle size={11} /> Not found in uploaded rulebooks
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="msg-sources">
            <BookOpen size={11} />
            {message.sources.join(' · ')}
          </div>
        )}
      </div>

      <style>{`
        .msg { display: flex; }
        .msg-user { justify-content: flex-end; }
        .msg-assistant { justify-content: flex-start; }
        .msg-bubble { max-width: min(75%, 560px); min-width: 0; padding: 10px 14px; border-radius: 12px; word-break: break-word; }
        .msg-user .msg-bubble { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
        .msg-assistant .msg-bubble { background: var(--bg-card); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
        .msg-no-context { border-color: #78350f !important; background: #1c1208 !important; }
        .msg-content { white-space: pre-wrap; word-break: break-word; font-size: 0.9rem; line-height: 1.5; }
        .msg-sources { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 0.7rem; color: var(--text-muted); }
        .msg-warning { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 0.7rem; color: #f59e0b; }
      `}</style>
    </div>
  )
}
