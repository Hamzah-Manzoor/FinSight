import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default value on first render when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42))
    expect(result.current[0]).toBe(42)
  })

  it('reads a previously stored value after hydration', async () => {
    localStorage.setItem('test-key', JSON.stringify(99))
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {})
    expect(result.current[0]).toBe(99)
  })

  it('writing a value updates state and localStorage', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {
      result.current[1](77)
    })
    expect(result.current[0]).toBe(77)
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(77)
  })

  it('accepts a function updater', async () => {
    localStorage.setItem('test-key', JSON.stringify(10))
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {})
    await act(async () => {
      result.current[1](prev => prev + 5)
    })
    expect(result.current[0]).toBe(15)
  })

  it('silently falls back to default when stored JSON is corrupt', async () => {
    localStorage.setItem('test-key', 'not-json{{')
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {})
    expect(result.current[0]).toBe(0)
  })
})
