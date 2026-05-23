import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, SkipForward, Flag } from 'lucide-react'
import InitiativeTracker from '@/components/combat/InitiativeTracker'
import MonsterLookup from '@/components/combat/MonsterLookup'
import MonsterCardPanel from '@/components/combat/MonsterCardPanel'
import NewEncounterModal from '@/components/combat/NewEncounterModal'
import { getActiveEncounter, nextTurn, endEncounter } from '@/api/combat'
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

  const nextMutation = useMutation({
    mutationFn: () => nextTurn(encounter!.id),
    onSuccess: (updated) => {
      setEncounter(updated)
      qc.invalidateQueries({ queryKey: ['encounter', 'active'] })
    },
  })

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
          <div className="combat-actions">
            {!encounter && (
              <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
                <PlusCircle size={15} /> New Encounter
              </button>
            )}
            {encounter?.is_running && (
              <>
                <button className="btn btn-ghost" onClick={() => nextMutation.mutate()} disabled={nextMutation.isPending}>
                  <SkipForward size={15} /> Next Turn
                </button>
                <button className="btn btn-ghost" onClick={() => endMutation.mutate()} disabled={endMutation.isPending}>
                  <Flag size={15} /> End
                </button>
              </>
            )}
          </div>
        </div>

        {encounter && (
          <InitiativeTracker
            encounter={encounter}
            onUpdated={(updated) => setEncounter(updated)}
          />
        )}
      </div>

      <div className="combat-right">
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
        .combat-page { display: flex; height: 100%; overflow: hidden; }
        .combat-left { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .combat-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .combat-title { font-size: 1.1rem; font-weight: 700; color: var(--gold); }
        .combat-actions { display: flex; gap: 8px; }
        .combat-right { width: 340px; flex-shrink: 0; border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
      `}</style>
    </div>
  )
}
