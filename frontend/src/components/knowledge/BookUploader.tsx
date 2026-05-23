import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload, Loader2 } from 'lucide-react'
import { uploadBook } from '@/api/knowledge'

interface Props {
  onUploaded: () => void
}

export default function BookUploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const mutation = useMutation({
    mutationFn: uploadBook,
    onSuccess: onUploaded,
  })

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') return
    mutation.mutate(file)
  }

  return (
    <div
      className={`uploader ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {mutation.isPending ? (
        <><Loader2 size={20} className="spin" /> Indexing...</>
      ) : (
        <><Upload size={20} /> Drop PDF or click</>
      )}
      {mutation.isError && (
        <span className="upload-error">{(mutation.error as Error).message}</span>
      )}

      <style>{`
        .uploader { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; border: 2px dashed var(--border); border-radius: var(--radius); cursor: pointer; color: var(--text-muted); font-size: 0.85rem; transition: border-color 0.15s, color 0.15s; }
        .uploader:hover, .uploader.drag-over { border-color: var(--accent); color: var(--text); }
        .upload-error { color: var(--accent); font-size: 0.75rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
