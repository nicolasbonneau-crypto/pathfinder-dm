import { X, Globe, BookOpen } from 'lucide-react'
import { useCombatStore } from '@/store/combatStore'
import type { MonsterCard } from '@/types'

interface Props {
  cards: MonsterCard[]
}

export default function MonsterCardPanel({ cards }: Props) {
  const removeMonsterCard = useCombatStore((s) => s.removeMonsterCard)

  if (cards.length === 0) {
    return (
      <div className="panel-empty">
        <p>Search a monster to see its stat block.</p>
      </div>
    )
  }

  return (
    <div className="monster-panel">
      {cards.map((card) => (
        <MonsterCard key={card.name} card={card} onClose={() => removeMonsterCard(card.name)} />
      ))}

      <style>{`
        .monster-panel { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; }
        .panel-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px; text-align: center; }
      `}</style>
    </div>
  )
}

function MonsterCard({ card, onClose }: { card: MonsterCard; onClose: () => void }) {
  return (
    <div className="monster-card">
      <div className="mc-header">
        <div>
          <div className="mc-name">{card.name}</div>
          <div className="mc-level">Creature {card.level}</div>
        </div>
        <div className="mc-header-right">
          {card.source === 'web' ? <Globe size={13} title="From web" /> : <BookOpen size={13} title="From rulebook" />}
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
      </div>

      <div className="mc-traits">
        {card.traits.map((t) => <span key={t} className="trait">{t}</span>)}
      </div>

      <div className="mc-stats">
        <Stat label="AC" value={card.ac} />
        <Stat label="HP" value={card.hp} />
        <Stat label="Speed" value={card.speed} />
        <Stat label="Perc" value={`+${card.perception}`} />
      </div>

      <div className="mc-saves">
        <Stat label="Fort" value={`+${card.saves.fort}`} />
        <Stat label="Ref" value={`+${card.saves.ref}`} />
        <Stat label="Will" value={`+${card.saves.will}`} />
      </div>

      <div className="mc-abilities">
        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ab) => (
          <div key={ab} className="ability">
            <span className="ability-label">{ab.toUpperCase()}</span>
            <span>{card.abilities[ab] >= 0 ? '+' : ''}{card.abilities[ab]}</span>
          </div>
        ))}
      </div>

      {card.attacks.length > 0 && (
        <div className="mc-attacks">
          <div className="mc-section-title">Attacks</div>
          {card.attacks.map((atk, i) => (
            <div key={i} className="attack-row">
              <span className="attack-name">{atk.name}</span>
              <span className="attack-bonus">+{atk.bonus}</span>
              <span className="attack-damage">{atk.damage}</span>
            </div>
          ))}
        </div>
      )}

      {card.abilities_special.length > 0 && (
        <div className="mc-specials">
          <div className="mc-section-title">Abilities</div>
          {card.abilities_special.map((ab, i) => (
            <div key={i} className="special-row">
              <span className="special-name">{ab.name}</span>
              <p className="special-desc">{ab.description}</p>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .monster-card { background: var(--bg-card); border-bottom: 1px solid var(--border); padding: 12px; font-size: 0.8rem; }
        .mc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .mc-header-right { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
        .mc-name { font-weight: 700; font-size: 0.95rem; color: var(--gold); }
        .mc-level { font-size: 0.7rem; color: var(--text-muted); }
        .mc-traits { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
        .trait { padding: 2px 8px; background: var(--accent); color: #fff; border-radius: 10px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
        .mc-stats, .mc-saves { display: flex; gap: 12px; margin-bottom: 6px; }
        .mc-abilities { display: flex; gap: 8px; margin-bottom: 8px; }
        .ability { display: flex; flex-direction: column; align-items: center; font-size: 0.7rem; }
        .ability-label { color: var(--text-muted); font-size: 0.6rem; font-weight: 700; text-transform: uppercase; }
        .mc-section-title { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 4px; }
        .mc-attacks, .mc-specials { margin-bottom: 6px; }
        .attack-row { display: flex; gap: 8px; padding: 3px 0; border-bottom: 1px solid var(--border); }
        .attack-name { flex: 1; font-weight: 600; }
        .attack-bonus { color: var(--gold); }
        .attack-damage { color: var(--accent); }
        .special-row { margin-bottom: 6px; }
        .special-name { font-weight: 700; }
        .special-desc { color: var(--text-muted); margin-top: 2px; font-size: 0.75rem; line-height: 1.4; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 2px; border-radius: 4px; }
        .btn-icon:hover { color: var(--text); }
      `}</style>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <style>{`
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
        .stat-value { font-weight: 700; }
      `}</style>
    </div>
  )
}
