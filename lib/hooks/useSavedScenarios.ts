import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { CalculatorParams } from '@/lib/schema/calculator'

export interface SavedScenario {
  id: string
  name: string
  createdAt: number
  route: string
  params: CalculatorParams
}

const STORAGE_KEY = 'finsight:scenarios:v1'

export function useSavedScenarios() {
  const [scenarios, setScenarios] = useLocalStorage<SavedScenario[]>(STORAGE_KEY, [])

  const save = useCallback(
    (name: string, params: CalculatorParams): void => {
      const scenario: SavedScenario = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Untitled',
        createdAt: Date.now(),
        route: '/compound-interest-calculator',
        params,
      }
      setScenarios(prev => [scenario, ...prev])
    },
    [setScenarios],
  )

  const load = useCallback(
    (id: string): CalculatorParams | undefined =>
      scenarios.find(s => s.id === id)?.params,
    [scenarios],
  )

  const remove = useCallback(
    (id: string): void => setScenarios(prev => prev.filter(s => s.id !== id)),
    [setScenarios],
  )

  return { scenarios, save, load, remove }
}
