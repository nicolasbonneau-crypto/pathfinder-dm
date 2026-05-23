import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatMessage from '@/components/knowledge/ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/types'

const userMsg: ChatMessageType = {
  id: '1',
  role: 'user',
  content: 'What is flanking?',
  timestamp: Date.now(),
}

const assistantMsg: ChatMessageType = {
  id: '2',
  role: 'assistant',
  content: 'Flanking gives you a +2 circumstance bonus to attack rolls.',
  sources: ['Core Rulebook p.476'],
  timestamp: Date.now(),
}

describe('ChatMessage', () => {
  it('renders user message content', () => {
    render(<ChatMessage message={userMsg} />)
    expect(screen.getByText('What is flanking?')).toBeInTheDocument()
  })

  it('renders assistant message with sources', () => {
    render(<ChatMessage message={assistantMsg} />)
    expect(screen.getByText(/Flanking gives you/)).toBeInTheDocument()
    expect(screen.getByText(/Core Rulebook p.476/)).toBeInTheDocument()
  })

  it('does not render sources section when absent', () => {
    render(<ChatMessage message={userMsg} />)
    expect(screen.queryByText(/Core Rulebook/)).not.toBeInTheDocument()
  })

  it('shows no-context warning when has_context is false', () => {
    const noContextMsg: ChatMessageType = {
      id: '3',
      role: 'assistant',
      content: "I couldn't find that in the uploaded rulebooks.",
      has_context: false,
      timestamp: Date.now(),
    }
    render(<ChatMessage message={noContextMsg} />)
    expect(screen.getByText(/Not found in uploaded rulebooks/)).toBeInTheDocument()
  })

  it('does not show no-context warning for normal assistant messages', () => {
    render(<ChatMessage message={assistantMsg} />)
    expect(screen.queryByText(/Not found in uploaded rulebooks/)).not.toBeInTheDocument()
  })
})
