'use client'
import { useState, useCallback, useMemo } from 'react'
import {
  calcFV,
  buildYearlyBreakdown,
  type CompoundFreq,
  type ContributionTiming,
} from '@/lib/calc/compound'
import { defaultParams, type CalculatorParams } from '@/lib/schema/calculator'

export interface Scenario {
  id: string
  name: string
  params: CalculatorParams
  color: string
}

export interface ScenarioResult {
  id: string
  name: string
  color: string
  finalBalance: number
  totalContributed: number
  interestEarned: number
  cagr: number
  yearlyRows: ReturnType<typeof buildYearlyBreakdown>
}

const SCENARIO_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6']

function computeScenario(scenario: Scenario): ScenarioResult {
  const { params } = scenario
  const annualRate = params.r / 100
  const freq = params.freq as CompoundFreq
  const timing = params.timing as ContributionTiming

  const finalBalance = calcFV(params.p, params.pmt, annualRate, params.t, freq, timing)
  const totalContributed = params.p + params.pmt * params.t * 12
  const interestEarned = finalBalance - totalContributed
  const cagr =
    totalContributed > 0
      ? Math.pow(finalBalance / totalContributed, 1 / params.t) - 1
      : 0
  const yearlyRows = buildYearlyBreakdown(params.p, params.pmt, annualRate, params.t, freq, timing)

  return {
    id: scenario.id,
    name: scenario.name,
    color: scenario.color,
    finalBalance,
    totalContributed,
    interestEarned,
    cagr,
    yearlyRows,
  }
}

export function useScenarios(baseParams: CalculatorParams) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])

  const addScenario = useCallback(() => {
    setScenarios(prev => {
      if (prev.length >= 3) return prev
      const idx = prev.length
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: `Scenario ${idx + 2}`,
          params: { ...baseParams },
          color: SCENARIO_COLORS[idx],
        },
      ]
    })
  }, [baseParams])

  const removeScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }, [])

  const updateScenario = useCallback((id: string, patch: Partial<Scenario>) => {
    setScenarios(prev =>
      prev.map(s => (s.id === id ? { ...s, ...patch } : s)),
    )
  }, [])

  const updateScenarioParams = useCallback((id: string, params: CalculatorParams) => {
    setScenarios(prev =>
      prev.map(s => (s.id === id ? { ...s, params } : s)),
    )
  }, [])

  const scenarioResults = useMemo<ScenarioResult[]>(
    () => scenarios.map(computeScenario),
    [scenarios],
  )

  return {
    scenarios,
    scenarioResults,
    addScenario,
    removeScenario,
    updateScenario,
    updateScenarioParams,
    canAdd: scenarios.length < 3,
  }
}

export { defaultParams }
