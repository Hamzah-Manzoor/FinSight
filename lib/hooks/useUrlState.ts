import { useState, useEffect, useRef, useCallback } from 'react'
import type { z } from 'zod'

type AnyZodObject = z.ZodObject<z.ZodRawShape>

export function useUrlState<T extends AnyZodObject>(
  schema: T,
  defaults: z.infer<T>,
  debounceMs: number = 300,
): [z.infer<T>, (state: z.infer<T>) => void] {
  const [initialParams, setInitialParams] = useState<z.infer<T>>(defaults)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)

  // Parse URL once after mount (client-only — window is not available on server)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const raw = Object.fromEntries(new URLSearchParams(window.location.search))
    const parsed = schema.safeParse({ ...defaults, ...raw })
    if (parsed.success) setInitialParams(parsed.data)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const syncToUrl = useCallback(
    (newState: z.infer<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const sp = new URLSearchParams()
        for (const [k, v] of Object.entries(newState as Record<string, unknown>)) {
          if (v !== undefined && v !== null) {
            sp.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
          }
        }
        history.replaceState(null, '', `?${sp.toString()}`)
      }, debounceMs)
    },
    [debounceMs],
  )

  return [initialParams, syncToUrl]
}
