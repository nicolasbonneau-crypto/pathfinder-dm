import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, UserPlus, Pencil, Check, X } from 'lucide-react'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, addCombatantFromTemplate } from '@/api/combat'
import type { PlayerTemplate } from '@/types'

interface Props {
  encounterId: string | undefined
}

export default function PlayerTemplates({ encounterId }: Props) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
  })

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setShowForm(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<PlayerTemplate, 'name' | 'class_name' | 'max_hp' | 'ac'>> }) =>
      updateTemplate(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  const addMutation = useMutation({
    mutationFn: (templateId: string) => addCombatantFromTemplate(encounterId!, templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter', 'active'] }),
  })

  return (
    <div className="player-templates">
      <div className="pt-header">
        <span className="pt-label">Players</span>
        <button className="btn-icon" title="Add player template" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} />
        </button>
      </div>

      {templates.length === 0 && !showForm && (
        <p className="pt-empty">No players saved yet.</p>
      )}

      <div className="pt-list">
        {templates.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            canAdd={!!encounterId}
            onAdd={() => addMutation.mutate(t.id)}
            onSave={(patch) => updateMutation.mutate({ id: t.id, patch })}
            onDelete={() => deleteMutation.mutate(t.id)}
          />
        ))}
      </div>

      {showForm && (
        <TemplateForm
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      <style>{`
        .player-templates { padding: 10px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .pt-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .pt-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); }
        .pt-empty { font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 2px 0 4px; }
        .pt-list { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 3px; border-radius: 4px; flex-shrink: 0; }
        .btn-icon:hover:not(:disabled) { color: var(--text); }
        .btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

function TemplateRow({ template, canAdd, onAdd, onSave, onDelete }: {
  template: PlayerTemplate
  canAdd: boolean
  onAdd: () => void
  onSave: (patch: Partial<Pick<PlayerTemplate, 'name' | 'class_name' | 'max_hp' | 'ac'>>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.name)
  const [className, setClassName] = useState(template.class_name ?? '')
  const [maxHp, setMaxHp] = useState(String(template.max_hp))
  const [ac, setAc] = useState(template.ac != null ? String(template.ac) : '')

  const save = () => {
    onSave({
      name: name.trim() || template.name,
      class_name: className.trim() || null,
      max_hp: parseInt(maxHp) || template.max_hp,
      ac: ac ? parseInt(ac) : null,
    })
    setEditing(false)
  }

  const cancel = () => {
    setName(template.name)
    setClassName(template.class_name ?? '')
    setMaxHp(String(template.max_hp))
    setAc(template.ac != null ? String(template.ac) : '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="pt-row pt-row-editing">
        <div className="pt-edit-fields">
          <div className="pt-edit-row">
            <input className="input pt-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <input className="input pt-input" placeholder="Class" value={className} onChange={(e) => setClassName(e.target.value)} />
          </div>
          <div className="pt-edit-row">
            <input className="input pt-input" type="number" placeholder="Max HP" value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
            <input className="input pt-input" type="number" placeholder="AC" value={ac} onChange={(e) => setAc(e.target.value)} />
          </div>
        </div>
        <div className="pt-edit-actions">
          <button className="btn-icon" title="Save" onClick={save}><Check size={13} /></button>
          <button className="btn-icon" title="Cancel" onClick={cancel}><X size={13} /></button>
        </div>
        <style>{`
          .pt-row-editing { flex-direction: column; align-items: stretch; gap: 6px; padding: 8px; }
          .pt-edit-fields { display: flex; flex-direction: column; gap: 4px; }
          .pt-edit-row { display: flex; gap: 4px; }
          .pt-input { padding: 5px 8px; font-size: 0.78rem; min-width: 0; }
          .pt-edit-actions { display: flex; gap: 4px; justify-content: flex-end; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="pt-row">
      <div className="pt-info">
        <span className="pt-name">{template.name}</span>
        <span className="pt-meta">
          {template.class_name && <span className="pt-class">{template.class_name} · </span>}
          HP {template.max_hp}{template.ac != null ? ` · AC ${template.ac}` : ''}
        </span>
      </div>
      <div className="pt-actions">
        <button className="btn-icon" title={canAdd ? 'Add to encounter' : 'No active encounter'} disabled={!canAdd} onClick={onAdd}>
          <UserPlus size={13} />
        </button>
        <button className="btn-icon" title="Edit" onClick={() => setEditing(true)}>
          <Pencil size={12} />
        </button>
        <button className="btn-icon" title="Delete" onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>

      <style>{`
        .pt-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
        .pt-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
        .pt-name { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pt-meta { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pt-class { color: #60a5fa; font-weight: 600; }
        .pt-actions { display: flex; gap: 2px; margin-left: 6px; }
      `}</style>
    </div>
  )
}

function TemplateForm({ onSave, onCancel, isPending }: {
  onSave: (data: { name: string; class_name: string | null; max_hp: number; ac: number | null }) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [maxHp, setMaxHp] = useState('20')
  const [ac, setAc] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), class_name: className.trim() || null, max_hp: parseInt(maxHp) || 1, ac: ac ? parseInt(ac) : null })
  }

  return (
    <div className="pt-form">
      <div className="pt-edit-row">
        <input className="input pt-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className="input pt-input" placeholder="Class" value={className} onChange={(e) => setClassName(e.target.value)} />
      </div>
      <div className="pt-edit-row">
        <input className="input pt-input" type="number" placeholder="Max HP" value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
        <input className="input pt-input" type="number" placeholder="AC" value={ac} onChange={(e) => setAc(e.target.value)} />
      </div>
      <div className="pt-form-actions">
        <button className="btn btn-primary" onClick={submit} disabled={!name.trim() || isPending}>Save</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
      <style>{`
        .pt-form { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
        .pt-edit-row { display: flex; gap: 4px; }
        .pt-input { padding: 5px 8px; font-size: 0.78rem; min-width: 0; }
        .pt-form-actions { display: flex; gap: 6px; }
      `}</style>
    </div>
  )
}
