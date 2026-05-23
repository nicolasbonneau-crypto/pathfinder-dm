import { describe, it, expect, beforeEach } from 'vitest'
import { useCombatStore } from '@/store/combatStore'
import type { MonsterCard, Encounter } from '@/types'

const mockCard: MonsterCard = {
  name: 'Goblin Warrior',
  level: 1,
  traits: ['goblin', 'humanoid'],
  ac: 16,
  hp: 12,
  speed: '25 feet',
  perception: 3,
  skills: { stealth: 5 },
  abilities: { str: 0, dex: 3, con: 1, int: -1, wis: 0, cha: 1 },
  saves: { fort: 4, ref: 6, will: 3 },
  attacks: [{ name: 'Dogslicer', bonus: 7, damage: '1d6+0 slashing' }],
  abilities_special: [],
  source: 'rag',
}

const mockEncounter: Encounter = {
  id: 'enc-1',
  name: 'Test Encounter',
  round: 1,
  active_combatant_index: 0,
  is_running: false,
  combatants: [],
  created_at: new Date().toISOString(),
}

describe('combatStore', () => {
  beforeEach(() => {
    useCombatStore.setState({ encounter: null, monsterCards: [] })
  })

  it('sets encounter', () => {
    useCombatStore.getState().setEncounter(mockEncounter)
    expect(useCombatStore.getState().encounter).toEqual(mockEncounter)
  })

  it('clears encounter', () => {
    useCombatStore.getState().setEncounter(mockEncounter)
    useCombatStore.getState().setEncounter(null)
    expect(useCombatStore.getState().encounter).toBeNull()
  })

  it('adds a monster card', () => {
    useCombatStore.getState().addMonsterCard(mockCard)
    expect(useCombatStore.getState().monsterCards).toHaveLength(1)
    expect(useCombatStore.getState().monsterCards[0].name).toBe('Goblin Warrior')
  })

  it('does not add duplicate monster cards', () => {
    useCombatStore.getState().addMonsterCard(mockCard)
    useCombatStore.getState().addMonsterCard(mockCard)
    expect(useCombatStore.getState().monsterCards).toHaveLength(1)
  })

  it('removes a monster card by name', () => {
    useCombatStore.getState().addMonsterCard(mockCard)
    useCombatStore.getState().removeMonsterCard('Goblin Warrior')
    expect(useCombatStore.getState().monsterCards).toHaveLength(0)
  })

  it('removing non-existent card is a no-op', () => {
    useCombatStore.getState().addMonsterCard(mockCard)
    useCombatStore.getState().removeMonsterCard('Dragon')
    expect(useCombatStore.getState().monsterCards).toHaveLength(1)
  })
})
