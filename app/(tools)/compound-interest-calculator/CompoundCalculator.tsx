'use client'
import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { useCalculatorState } from '@/lib/hooks/useCalculatorState'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { CURRENCY_LOCALES } from '@/types'
import { CalculatorShell } from '@/components/calculator/CalculatorShell'
import { InputPanel } from '@/components/calculator/InputPanel'
import { ResultCard } from '@/components/calculator/ResultCard'
import { BreakdownTable } from '@/components/calculator/BreakdownTable'
import { ShareButton } from '@/components/calculator/ShareButton'
import { SavedScenariosPanel } from '@/components/calculator/SavedScenariosPanel'
import { Disclaimer } from '@/components/shared/Disclaimer'

const GrowthChart = dynamic(
  () => import('@/components/calculator/GrowthChart').then(m => ({ default: m.GrowthChart })),
  { ssr: false },
)

export function CompoundCalculator() {
  const { form, params, results, savedScenarios } = useCalculatorState()
  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const [savedOpen, setSavedOpen] = useState(false)

  const handleLoad = useCallback((id: string) => {
    const loaded = savedScenarios.load(id)
    if (loaded) form.reset(loaded)
    setSavedOpen(false)
  }, [savedScenarios, form])

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
            />
            <GrowthChart
              yearlyRows={results.yearlyRows}
              p={params.p}
              inflationOn={params.inflOn}
              inflationRate={params.infl / 100}
              years={params.t}
              currency={currency}
            />
          </>
        }
        breakdownPanel={
          <BreakdownTable
            rows={results.yearlyRows}
            currency={currency}
            locale={locale}
          />
        }
      />
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
