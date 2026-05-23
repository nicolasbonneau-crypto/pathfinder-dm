import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, ChevronUp, ChevronDown, Trash2, CheckCircle } from 'lucide-react'
import { addCombatant, updateCombatant, removeCombatant, nextTurn } from '@/api/combat'
import type { Combatant, Encounter } from '@/types'

interface Props {
  encounter: Encounter
}

export default function InitiativeTracker({ encounter }: Props) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingInit, setEditingInit] = useState<{ id: string; value: string } | null>(null)

  const sorted = [...encounter.combatants].sort(
    (a, b) => (b.initiative ?? -999) - (a.initiative ?? -999),
  )
  // Mirror the backend's advance_turn logic: active index is into the living-only sorted list
  const liveSorted = sorted.filter((c) => c.current_hp > 0)
  const activeCombatantId = encounter.is_running
    ? liveSorted[encounter.active_combatant_index]?.id
    : null

  const invalidate = () => qc.invalidateQueries({ queryKey: ['encounter', 'active'] })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Combatant, 'current_hp' | 'initiative' | 'conditions'>> }) =>
      updateCombatant(encounter.id, id, patch),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeCombatant(encounter.id, id),
    onSuccess: invalidate,
  })

  const nextMutation = useMutation({
    mutationFn: () => nextTurn(encounter.id),
    onSuccess: invalidate,
  })

  const applyDamage = (c: Combatant, delta: number) => {
    const next = Math.max(0, Math.min(c.max_hp, c.current_hp + delta))
    updateMutation.mutate({ id: c.id, patch: { current_hp: next } })
  }

  const saveInitiative = (id: string, value: string) => {
    setEditingInit(null)
    const trimmed = value.trim()
    if (trimmed === '') return
    const parsed = parseInt(trimmed)
    if (isNaN(parsed)) return
    updateMutation.mutate({ id, patch: { initiative: parsed } })
  }

  return (
    <div className="tracker">
      {encounter.is_running && (
        <div className="round-header">Round {encounter.round}</div>
      )}
      <div className="tracker-list">
        {sorted.map((c) => {
          const isActive = c.id === activeCombatantId
          const hpPct = Math.round((c.current_hp / c.max_hp) * 100)
          const isEditingInit = editingInit?.id === c.id
          return (
            <div key={c.id} className={`combatant-row ${isActive ? 'combatant-active' : ''} ${c.current_hp === 0 ? 'combatant-dead' : ''}`}>
              <div className="combatant-init">
                {isEditingInit ? (
                  <input
                    className="init-input"
                    type="number"
                    value={editingInit.value}
                    onChange={(e) => setEditingInit({ id: c.id, value: e.target.value })}
                    onBlur={() => saveInitiative(c.id, editingInit.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveInitiative(c.id, editingInit.value)
                      if (e.key === 'Escape') setEditingInit(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className="init-display"
                    onClick={() => setEditingInit({ id: c.id, value: String(c.initiative ?? '') })}
                    title="Click to set initiative"
                  >
                    {c.initiative ?? '—'}
                  </span>
                )}
              </div>
              <div className="combatant-info">
                <span className="combatant-name">{c.name}</span>
                <span className={`combatant-type type-${c.type}`}>{c.type}</span>
              </div>
              <div className="combatant-hp">
                <button className="btn-icon" onClick={() => applyDamage(c, -1)}><ChevronDown size={14} /></button>
                <span className="hp-text" title={`${hpPct}%`}>{c.current_hp}/{c.max_hp}</span>
                <button className="btn-icon" onClick={() => applyDamage(c, 1)}><ChevronUp size={14} /></button>
                <div className="hp-bar"><div className="hp-bar-fill" style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--gold)' : hpPct > 25 ? '#f59e0b' : 'var(--accent)' }} /></div>
              </div>
              {c.ac != null && <div className="combatant-ac"><Shield size={12} /> {c.ac}</div>}
              {isActive && (
                <button
                  className="btn-icon btn-done"
                  onClick={() => nextMutation.mutate()}
                  disabled={nextMutation.isPending}
                  title="Done — advance turn"
                >
                  <CheckCircle size={16} />
                </button>
              )}
              <button className="btn-icon" onClick={() => removeMutation.mutate(c.id)}><Trash2 size={13} /></button>
            </div>
          )
        })}
      </div>

      <button className="btn btn-ghost add-btn" onClick={() => setShowAdd(!showAdd)}>
        <Plus size={15} /> Add Combatant
      </button>

      {showAdd && (
        <AddCombatantForm
          encounterId={encounter.id}
          onAdded={() => { qc.invalidateQueries({ queryKey: ['encounter', 'active'] }); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <style>{`
        .tracker { display: flex; flex-direction: column; overflow: hidden; flex: 1; }
        .round-header { padding: 6px 16px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--gold); border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
        .combatant-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); transition: border-color 0.15s; }
        .combatant-active { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
        .combatant-dead { opacity: 0.45; }
        .combatant-init { width: 32px; text-align: center; font-weight: 700; color: var(--gold); font-size: 0.9rem; flex-shrink: 0; }
        .init-display { cursor: pointer; display: block; width: 100%; text-align: center; border-radius: 4px; padding: 2px; }
        .init-display:hover { background: var(--border); }
        .init-input { width: 100%; background: var(--bg); border: 1px solid var(--gold); border-radius: 4px; color: var(--gold); font-weight: 700; font-size: 0.9rem; text-align: center; padding: 2px 0; outline: none; }
        .init-input::-webkit-inner-spin-button, .init-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .init-input[type=number] { -moz-appearance: textfield; }
        .combatant-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .combatant-name { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .combatant-type { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
        .type-player { color: #60a5fa; }
        .type-monster { color: var(--accent); }
        .combatant-hp { display: flex; align-items: center; gap: 4px; position: relative; flex-shrink: 0; }
        .hp-text { font-size: 0.8rem; min-width: 52px; text-align: center; }
        .hp-bar { position: absolute; bottom: -4px; left: 0; right: 0; height: 3px; background: var(--border); border-radius: 2px; }
        .hp-bar-fill { height: 100%; border-radius: 2px; transition: width 0.2s; }
        .combatant-ac { display: flex; align-items: center; gap: 3px; font-size: 0.8rem; color: var(--text-muted); flex-shrink: 0; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 3px; border-radius: 4px; flex-shrink: 0; }
        .btn-icon:hover { color: var(--text); }
        .btn-icon:disabled { opacity: 0.4; cursor: default; }
        .btn-done { color: var(--gold) !important; }
        .btn-done:hover:not(:disabled) { color: #fff !important; }
        .add-btn { margin: 12px 16px; align-self: flex-start; }
      `}</style>
    </div>
  )
}

function AddCombatantForm({ encounterId, onAdded, onCancel }: { encounterId: string; onAdded: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'monster' as 'player' | 'monster', max_hp: 20, current_hp: 20, initiative: '', ac: '' })

  const mutation = useMutation({
    mutationFn: () => addCombatant(encounterId, {
      name: form.name,
      type: form.type,
      max_hp: form.max_hp,
      current_hp: form.max_hp,
      initiative: form.initiative ? parseInt(form.initiative) : null,
      ac: form.ac ? parseInt(form.ac) : null,
    }),
    onSuccess: onAdded,
  })

  return (
    <div className="add-form card">
      <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <div className="add-form-row">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'player' | 'monster' })}>
          <option value="monster">Monster</option>
          <option value="player">Player</option>
        </select>
        <input className="input" type="number" placeholder="Max HP" value={form.max_hp} onChange={(e) => setForm({ ...form, max_hp: parseInt(e.target.value) || 0 })} />
        <input className="input" type="number" placeholder="Init" value={form.initiative} onChange={(e) => setForm({ ...form, initiative: e.target.value })} />
        <input className="input" type="number" placeholder="AC" value={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.value })} />
      </div>
      <div className="add-form-actions">
        <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}>Add</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
      <style>{`
        .add-form { margin: 0 12px 12px; display: flex; flex-direction: column; gap: 6px; }
        .add-form-row { display: flex; gap: 6px; min-width: 0; }
        .add-form-row .input { min-width: 0; }
        .add-form-actions { display: flex; gap: 6px; }
      `}</style>
    </div>
  )
}
