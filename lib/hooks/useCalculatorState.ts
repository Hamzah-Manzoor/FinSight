'use client'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  calculatorSchema,
  defaultParams,
  type CalculatorParams,
} from '@/lib/schema/calculator'
import { useUrlState } from './useUrlState'
import { useSavedScenarios } from './useSavedScenarios'
import {
  calcFV,
  calcRealValue,
  buildYearlyBreakdown,
  type CompoundFreq,
  type ContributionTiming,
} from '@/lib/calc/compound'

export function useCalculatorState() {
  const [initialParams, syncToUrl] = useUrlState(calculatorSchema, defaultParams)

  // Explicit third generic pins TTransformedValues to CalculatorParams,
  // working around a type incompatibility between @hookform/resolvers and Zod v4.
  const form = useForm<CalculatorParams, unknown, CalculatorParams>({
    resolver: zodResolver(calculatorSchema) as never,
    defaultValues: defaultParams,
  })

  // One-time hydration: reset form after URL params are parsed on the client.
  // initialParams starts as defaultParams and updates once after mount.
  useEffect(() => {
    form.reset(initialParams)
  }, [initialParams, form])

  // Keep URL in sync whenever form values change (debounced inside useUrlState)
  useEffect(() => {
    const sub = form.watch(data => {
      const result = calculatorSchema.safeParse(data)
      if (result.success) syncToUrl(result.data)
    })
    return () => sub.unsubscribe()
  }, [form, syncToUrl])

  const params = form.watch()

  const results = useMemo(() => {
    const annualRate = params.r / 100
    const inflationRate = params.infl / 100
    const freq = params.freq as CompoundFreq
    const timing = params.timing as ContributionTiming

    const finalBalance = calcFV(params.p, params.pmt, annualRate, params.t, freq, timing)
    const totalContributed = params.p + params.pmt * params.t * 12
    const interestEarned = finalBalance - totalContributed
    const realBalance = params.inflOn
      ? calcRealValue(finalBalance, inflationRate, params.t)
      : finalBalance
    const yearlyRows = buildYearlyBreakdown(
      params.p, params.pmt, annualRate, params.t, freq, timing,
    )

    return { finalBalance, totalContributed, interestEarned, realBalance, yearlyRows }
  }, [params])

  const savedScenarios = useSavedScenarios()

  return { form, params, results, savedScenarios }
}
