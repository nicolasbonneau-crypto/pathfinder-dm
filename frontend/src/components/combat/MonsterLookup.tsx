import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, Loader2 } from 'lucide-react'
import { lookupMonster } from '@/api/combat'
import { useCombatStore } from '@/store/combatStore'

export default function MonsterLookup() {
  const [query, setQuery] = useState('')
  const addMonsterCard = useCombatStore((s) => s.addMonsterCard)

  const mutation = useMutation({
    mutationFn: lookupMonster,
    onSuccess: (card) => {
      addMonsterCard(card)
      setQuery('')
    },
  })

  const handleSearch = () => {
    const q = query.trim()
    if (!q) return
    mutation.mutate(q)
  }

  return (
    <div className="monster-lookup">
      <div className="lookup-row">
        <input
          className="input"
          placeholder="Look up monster..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary" onClick={handleSearch} disabled={!query.trim() || mutation.isPending}>
          {mutation.isPending ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
        </button>
      </div>
      {mutation.isError && (
        <p className="lookup-error">{(mutation.error as Error).message}</p>
      )}

      <style>{`
        .monster-lookup { padding: 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .lookup-row { display: flex; gap: 8px; }
        .lookup-error { color: var(--accent); font-size: 0.75rem; margin-top: 6px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
