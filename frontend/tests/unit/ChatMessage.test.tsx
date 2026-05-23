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
})
