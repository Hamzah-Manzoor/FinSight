'use client'
import dynamic from 'next/dynamic'
import { useState, useCallback, useMemo } from 'react'
import { useCalculatorState } from '@/lib/hooks/useCalculatorState'
import { useScenarios } from '@/lib/hooks/useScenarios'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { CURRENCY_LOCALES } from '@/types'
import { CalculatorShell } from '@/components/calculator/CalculatorShell'
import { InputPanel } from '@/components/calculator/InputPanel'
import { ResultCard } from '@/components/calculator/ResultCard'
import { BreakdownTable } from '@/components/calculator/BreakdownTable'
import { ShareButton } from '@/components/calculator/ShareButton'
import { SavedScenariosPanel } from '@/components/calculator/SavedScenariosPanel'
import { ScenarioManager } from '@/components/calculator/ScenarioManager'
import { ComparisonTable } from '@/components/calculator/ComparisonTable'
import { Disclaimer } from '@/components/shared/Disclaimer'

const GrowthChart = dynamic(
  () => import('@/components/calculator/GrowthChart').then(m => ({ default: m.GrowthChart })),
  { ssr: false },
)

const ScenarioComparisonChart = dynamic(
  () => import('@/components/calculator/ScenarioComparisonChart').then(m => ({ default: m.ScenarioComparisonChart })),
  { ssr: false },
)

export function CompoundCalculator() {
  const { form, params, results, savedScenarios } = useCalculatorState()
  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const [savedOpen, setSavedOpen] = useState(false)

  const { scenarios, scenarioResults, addScenario, removeScenario, updateScenario, updateScenarioParams, canAdd } = useScenarios(params)

  const handleLoad = useCallback((id: string) => {
    const loaded = savedScenarios.load(id)
    if (loaded) form.reset(loaded)
    setSavedOpen(false)
  }, [savedScenarios, form])

  // Build a ScenarioResult shape for the base (main) calculator so comparison components can treat all scenarios uniformly
  const baseResult = useMemo(() => ({
    id: 'base',
    name: 'Base Scenario',
    color: '#059669',
    finalBalance: results.finalBalance,
    totalContributed: results.totalContributed,
    interestEarned: results.interestEarned,
    cagr: results.totalContributed > 0
      ? Math.pow(results.finalBalance / results.totalContributed, 1 / params.t) - 1
      : 0,
    yearlyRows: results.yearlyRows,
  }), [results, params.t])

  const hasComparison = scenarios.length > 0

  return (
    <>
      <CalculatorShell
        inputPanel={
          <InputPanel form={form} onOpenSaved={() => setSavedOpen(true)} />
        }
        resultPanel={
          <>
            <div className="flex justify-end">
              <ShareButton />
            </div>
            <ResultCard
              finalBalance={results.finalBalance}
              totalContributed={results.totalContributed}
              interestEarned={results.interestEarned}
              realBalance={results.realBalance}
              inflationOn={params.inflOn}
              currency={currency}
              locale={locale}
              mode={params.mode as 'fv' | 'pmt' | 'time'}
              solvedPmt={results.solvedPmt}
              solvedMonths={results.solvedMonths}
            />
            {!hasComparison && (
              <GrowthChart
                yearlyRows={results.yearlyRows}
                p={params.p}
                inflationOn={params.inflOn}
                inflationRate={params.infl / 100}
                years={params.t}
                currency={currency}
              />
            )}
          </>
        }
        breakdownPanel={
          !hasComparison ? (
            <BreakdownTable
              rows={results.yearlyRows}
              currency={currency}
              locale={locale}
            />
          ) : null
        }
      />

      {/* Scenario comparison section */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <ScenarioManager
          scenarios={scenarios}
          canAdd={canAdd}
          onAdd={addScenario}
          onRemove={removeScenario}
          onParamsChange={updateScenarioParams}
          onRename={(id, name) => updateScenario(id, { name })}
        />

        {hasComparison && (
          <div className="mt-8 flex flex-col gap-6">
            <ScenarioComparisonChart
              baseResult={baseResult}
              scenarioResults={scenarioResults}
              currency={currency}
            />
            <ComparisonTable
              baseResult={baseResult}
              scenarioResults={scenarioResults}
              currency={currency}
              locale={locale}
            />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <Disclaimer />
      </div>

      <SavedScenariosPanel
        open={savedOpen}
        onOpenChange={setSavedOpen}
        scenarios={savedScenarios.scenarios}
        onSave={name => savedScenarios.save(name, params)}
        onLoad={handleLoad}
        onRemove={savedScenarios.remove}
      />
    </>
  )
}
