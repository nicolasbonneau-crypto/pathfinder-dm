import { create } from 'zustand'
import type { Encounter, MonsterCard } from '@/types'

interface CombatState {
  encounter: Encounter | null
  monsterCards: MonsterCard[]
  setEncounter: (encounter: Encounter | null) => void
  addMonsterCard: (card: MonsterCard) => void
  removeMonsterCard: (name: string) => void
}

export const useCombatStore = create<CombatState>((set) => ({
  encounter: null,
  monsterCards: [],
  setEncounter: (encounter) => set({ encounter }),
  addMonsterCard: (card) =>
    set((state) => ({
      monsterCards: state.monsterCards.some((c) => c.name === card.name)
        ? state.monsterCards
        : [...state.monsterCards, card],
    })),
  removeMonsterCard: (name) =>
    set((state) => ({
      monsterCards: state.monsterCards.filter((c) => c.name !== name),
    })),
}))
