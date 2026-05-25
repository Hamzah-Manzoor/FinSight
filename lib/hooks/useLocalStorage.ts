import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored) as T)
    } catch {
      // Corrupted storage — stay on defaultValue
    }
  }, [key])

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(prev => {
        const next =
          typeof newValue === 'function'
            ? (newValue as (p: T) => T)(prev)
            : newValue
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Private browsing or storage full — no-op
        }
        return next
      })
    },
    [key],
  )

  return [value, set]
}
