import { useMutation } from '@tanstack/react-query'
import { BookOpen, Trash2 } from 'lucide-react'
import { deleteBook } from '@/api/knowledge'
import type { Book } from '@/types'

interface Props {
  books: Book[]
  onDeleted: () => void
}

export default function BookList({ books, onDeleted }: Props) {
  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: onDeleted,
  })

  if (books.length === 0) {
    return <p className="book-empty">No books indexed yet.</p>
  }

  return (
    <div className="book-list">
      <h3 className="book-list-title">Indexed Books</h3>
      {books.map((book) => (
        <div key={book.id} className="book-item">
          <BookOpen size={14} />
          <span className="book-name" title={book.filename}>{book.title}</span>
          <button
            className="btn-icon"
            onClick={() => deleteMutation.mutate(book.id)}
            disabled={deleteMutation.isPending}
            title="Remove book"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <style>{`
        .book-empty { color: var(--text-muted); font-size: 0.8rem; }
        .book-list-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 8px; }
        .book-list { display: flex; flex-direction: column; gap: 4px; }
        .book-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius); background: var(--bg-input); font-size: 0.8rem; color: var(--text); }
        .book-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 2px; border-radius: 4px; }
        .btn-icon:hover { color: var(--accent); }
      `}</style>
    </div>
  )
}
