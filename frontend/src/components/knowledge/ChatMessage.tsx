import { BookOpen } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types'

interface Props {
  message: ChatMessageType
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className="msg-bubble">
        <p className="msg-content">{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="msg-sources">
            <BookOpen size={11} />
            {message.sources.join(', ')}
          </div>
        )}
      </div>

      <style>{`
        .msg { display: flex; }
        .msg-user { justify-content: flex-end; }
        .msg-assistant { justify-content: flex-start; }
        .msg-bubble { max-width: 75%; padding: 10px 14px; border-radius: 12px; }
        .msg-user .msg-bubble { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
        .msg-assistant .msg-bubble { background: var(--bg-card); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
        .msg-content { white-space: pre-wrap; word-break: break-word; font-size: 0.9rem; line-height: 1.5; }
        .msg-sources { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 0.7rem; color: var(--text-muted); }
      `}</style>
    </div>
  )
}
