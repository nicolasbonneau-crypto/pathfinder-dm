import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createEncounter } from '@/api/combat'
import type { Encounter } from '@/types'

interface Props {
  onCreated: (enc: Encounter) => void
  onClose: () => void
}

export default function NewEncounterModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState('')

  const mutation = useMutation({
    mutationFn: createEncounter,
    onSuccess: onCreated,
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">New Encounter</h3>
        <input
          className="input"
          placeholder="Encounter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && mutation.mutate(name.trim())}
          autoFocus
        />
        {mutation.isError && <p className="modal-error">{(mutation.error as Error).message}</p>}
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => mutation.mutate(name.trim())} disabled={!name.trim() || mutation.isPending}>
            Create
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>

      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 360px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow); }
        .modal-title { font-weight: 700; font-size: 1rem; color: var(--gold); }
        .modal-error { color: var(--accent); font-size: 0.8rem; }
        .modal-actions { display: flex; gap: 8px; }
      `}</style>
    </div>
  )
}
