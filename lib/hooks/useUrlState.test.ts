import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUrlState } from './useUrlState'
import { calculatorSchema, defaultParams } from '@/lib/schema/calculator'

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useUrlState', () => {
  it('returns default params when URL has no search params', async () => {
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams),
    )
    await act(async () => {})
    expect(result.current[0]).toEqual(defaultParams)
  })

  it('parses URL params after hydration', async () => {
    window.history.replaceState({}, '', '?p=5000&pmt=200&r=6&t=20&freq=12&timing=end&infl=3&inflOn=1')
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams),
    )
    await act(async () => {})
    expect(result.current[0].p).toBe(5000)
    expect(result.current[0].r).toBe(6)
    expect(result.current[0].inflOn).toBe(true)
  })

  it('syncToUrl serializes boolean fields as 0/1', async () => {
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams),
    )
    await act(async () => {})
    act(() => {
      result.current[1]({ ...defaultParams, inflOn: true })
    })
    vi.runAllTimers()
    expect(window.location.search).toContain('inflOn=1')
  })

  it('syncToUrl debounces URL writes', async () => {
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams, 300),
    )
    await act(async () => {})
    act(() => {
      result.current[1]({ ...defaultParams, p: 1000 })
      result.current[1]({ ...defaultParams, p: 2000 })
    })
    // URL not yet updated
    expect(window.location.search).not.toContain('p=')
    // Advance past debounce
    vi.advanceTimersByTime(300)
    expect(window.location.search).toContain('p=2000')
  })
})
