import { apiClient } from './client'
import type { Combatant, Encounter, MonsterCard, PlayerTemplate } from '@/types'

export async function getActiveEncounter(): Promise<Encounter | null> {
  const { data } = await apiClient.get<Encounter | null>('/api/combat/encounter/active')
  return data
}

export async function createEncounter(name: string): Promise<Encounter> {
  const { data } = await apiClient.post<Encounter>('/api/combat/encounter', { name })
  return data
}

export async function addCombatant(
  encounterId: string,
  combatant: Omit<Combatant, 'id' | 'conditions' | 'is_active'>,
): Promise<Combatant> {
  const { data } = await apiClient.post<Combatant>(
    `/api/combat/encounter/${encounterId}/combatants`,
    combatant,
  )
  return data
}

export async function updateCombatant(
  encounterId: string,
  combatantId: string,
  patch: Partial<Pick<Combatant, 'current_hp' | 'initiative' | 'conditions'>>,
): Promise<Combatant> {
  const { data } = await apiClient.patch<Combatant>(
    `/api/combat/encounter/${encounterId}/combatants/${combatantId}`,
    patch,
  )
  return data
}

export async function removeCombatant(encounterId: string, combatantId: string): Promise<void> {
  await apiClient.delete(`/api/combat/encounter/${encounterId}/combatants/${combatantId}`)
}

export async function nextTurn(encounterId: string): Promise<Encounter> {
  const { data } = await apiClient.post<Encounter>(`/api/combat/encounter/${encounterId}/next-turn`)
  return data
}

export async function endEncounter(encounterId: string): Promise<void> {
  await apiClient.post(`/api/combat/encounter/${encounterId}/end`)
}

export async function lookupMonster(name: string): Promise<MonsterCard> {
  const { data } = await apiClient.get<MonsterCard>(`/api/combat/monsters/${encodeURIComponent(name)}`)
  return data
}

export async function listTemplates(): Promise<PlayerTemplate[]> {
  const { data } = await apiClient.get<PlayerTemplate[]>('/api/combat/templates')
  return data
}

export async function createTemplate(
  template: Pick<PlayerTemplate, 'name' | 'class_name' | 'max_hp' | 'ac'>,
): Promise<PlayerTemplate> {
  const { data } = await apiClient.post<PlayerTemplate>('/api/combat/templates', template)
  return data
}

export async function updateTemplate(
  id: string,
  patch: Partial<Pick<PlayerTemplate, 'name' | 'class_name' | 'max_hp' | 'ac'>>,
): Promise<PlayerTemplate> {
  const { data } = await apiClient.patch<PlayerTemplate>(`/api/combat/templates/${id}`, patch)
  return data
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/api/combat/templates/${id}`)
}

export async function addCombatantFromTemplate(
  encounterId: string,
  templateId: string,
): Promise<Combatant> {
  const { data } = await apiClient.post<Combatant>(
    `/api/combat/encounter/${encounterId}/combatants/from-template/${templateId}`,
  )
  return data
}
