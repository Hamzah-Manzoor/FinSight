import { describe, it, expect } from 'vitest'
import { formatCompact, formatNumber } from './number'

describe('formatCompact', () => {
  it('formats millions with one decimal', () => {
    expect(formatCompact(1200000)).toBe('1.2M')
  })

  it('formats thousands with K suffix', () => {
    expect(formatCompact(450000)).toBe('450K')
  })

  it('formats hundreds as plain number', () => {
    expect(formatCompact(999)).toBe('999')
  })

  it('formats billions', () => {
    expect(formatCompact(2500000000)).toBe('2.5B')
  })
})

describe('formatNumber', () => {
  it('formats with zero decimals by default', () => {
    expect(formatNumber(12345)).toBe('12,345')
  })

  it('formats with specified decimals', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})
