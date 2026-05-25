import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSavedScenarios } from './useSavedScenarios'
import { defaultParams } from '@/lib/schema/calculator'

beforeEach(() => localStorage.clear())

describe('useSavedScenarios', () => {
  it('starts with an empty list', () => {
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios).toEqual([])
  })

  it('save adds a scenario with the correct shape', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    await act(async () => {
      result.current.save('My Plan', defaultParams)
    })
    const s = result.current.scenarios[0]
    expect(s.name).toBe('My Plan')
    expect(s.route).toBe('/compound-interest-calculator')
    expect(s.params).toEqual(defaultParams)
    expect(typeof s.id).toBe('string')
    expect(typeof s.createdAt).toBe('number')
  })

  it('remove deletes the scenario by id', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    await act(async () => {
      result.current.save('Plan A', defaultParams)
    })
    const id = result.current.scenarios[0].id
    await act(async () => {
      result.current.remove(id)
    })
    expect(result.current.scenarios).toHaveLength(0)
  })

  it('load returns params for a matching id', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    const custom = { ...defaultParams, p: 99999 }
    await act(async () => {
      result.current.save('Custom', custom)
    })
    const id = result.current.scenarios[0].id
    expect(result.current.load(id)).toEqual(custom)
  })

  it('load returns undefined for an unknown id', () => {
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.load('does-not-exist')).toBeUndefined()
  })

  it('multiple saves prepend newest first', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    await act(async () => { result.current.save('First', defaultParams) })
    await act(async () => { result.current.save('Second', defaultParams) })
    expect(result.current.scenarios[0].name).toBe('Second')
    expect(result.current.scenarios[1].name).toBe('First')
  })
})
