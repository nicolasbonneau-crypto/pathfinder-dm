import { apiClient } from './client'
import type { Book, ChatMessage } from '@/types'

export async function uploadBook(file: File): Promise<Book> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<Book>('/api/knowledge/books', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listBooks(): Promise<Book[]> {
  const { data } = await apiClient.get<Book[]>('/api/knowledge/books')
  return data
}

export async function deleteBook(id: string): Promise<void> {
  await apiClient.delete(`/api/knowledge/books/${id}`)
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<{ answer: string; sources: string[]; has_context: boolean }> {
  const { data } = await apiClient.post('/api/knowledge/chat', {
    message,
    history: history.map((m) => ({ role: m.role, content: m.content })),
  })
  return data
}
