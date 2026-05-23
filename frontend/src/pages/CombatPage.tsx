import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Flag } from 'lucide-react'
import InitiativeTracker from '@/components/combat/InitiativeTracker'
import MonsterLookup from '@/components/combat/MonsterLookup'
import MonsterCardPanel from '@/components/combat/MonsterCardPanel'
import NewEncounterModal from '@/components/combat/NewEncounterModal'
import PlayerTemplates from '@/components/combat/PlayerTemplates'
import { getActiveEncounter, endEncounter } from '@/api/combat'
import { useCombatStore } from '@/store/combatStore'
import { useState } from 'react'

export default function CombatPage() {
  const qc = useQueryClient()
  const { encounter, setEncounter, monsterCards } = useCombatStore()
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: activeEncounter } = useQuery({
    queryKey: ['encounter', 'active'],
    queryFn: getActiveEncounter,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (activeEncounter !== undefined) setEncounter(activeEncounter)
  }, [activeEncounter, setEncounter])

  const endMutation = useMutation({
    mutationFn: () => endEncounter(encounter!.id),
    onSuccess: () => {
      setEncounter(null)
      qc.invalidateQueries({ queryKey: ['encounter', 'active'] })
    },
  })

  return (
    <div className="combat-page">
      <div className="combat-left">
        <div className="combat-header">
          <h2 className="combat-title">
            {encounter ? encounter.name : 'No Active Encounter'}
          </h2>
          {encounter?.is_running && (
            <span className="round-badge">Round {encounter.round}</span>
          )}
          <div className="combat-actions">
            {!encounter && (
              <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
                <PlusCircle size={15} /> New Encounter
              </button>
            )}
            {encounter?.is_running && (
              <button className="btn btn-ghost" onClick={() => endMutation.mutate()} disabled={endMutation.isPending}>
                <Flag size={15} /> End
              </button>
            )}
          </div>
        </div>

        {encounter && (
          <InitiativeTracker encounter={encounter} />
        )}
      </div>

      <div className="combat-right">
        <PlayerTemplates encounterId={encounter?.id} />
        <MonsterLookup />
        <MonsterCardPanel cards={monsterCards} />
      </div>

      {showNewModal && (
        <NewEncounterModal
          onCreated={(enc) => { setEncounter(enc); setShowNewModal(false) }}
          onClose={() => setShowNewModal(false)}
        />
      )}

      <style>{`
        .combat-page { display: flex; height: 100%; overflow: hidden; min-width: 0; }
        .combat-left { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
        .combat-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 8px; min-width: 0; }
        .combat-title { font-size: 1rem; font-weight: 700; color: var(--gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; }
        .round-badge { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--gold); background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; padding: 2px 8px; white-space: nowrap; flex-shrink: 0; }
        .combat-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .combat-right { width: clamp(260px, 28vw, 340px); flex-shrink: 0; border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
      `}</style>
    </div>
  )
}
