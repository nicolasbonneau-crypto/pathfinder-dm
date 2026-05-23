// Knowledge / RAG
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  has_context?: boolean
  timestamp: number
}

export interface Book {
  id: string
  filename: string
  title: string
  page_count: number
  indexed_at: string
}

// Combat
export type CombatantType = 'player' | 'monster'

export interface Combatant {
  id: string
  name: string
  type: CombatantType
  max_hp: number
  current_hp: number
  initiative: number | null
  ac: number | null
  conditions: string[]
  is_active: boolean
}

export interface Encounter {
  id: string
  name: string
  round: number
  active_combatant_index: number
  is_running: boolean
  combatants: Combatant[]
  created_at: string
}

export interface PlayerTemplate {
  id: string
  name: string
  class_name: string | null
  max_hp: number
  ac: number | null
  created_at: string
}

export interface MonsterCard {
  name: string
  level: number
  traits: string[]
  ac: number
  hp: number
  speed: string
  perception: number
  skills: Record<string, number>
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number }
  saves: { fort: number; ref: number; will: number }
  attacks: Array<{ name: string; bonus: number; damage: string }>
  abilities_special: Array<{ name: string; description: string }>
  source: 'rag' | 'web'
}
