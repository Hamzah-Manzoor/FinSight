import { describe, it, expect } from 'vitest'
import { formatCurrency } from './currency'

describe('formatCurrency', () => {
  it('formats USD with dollar sign and no decimals', () => {
    expect(formatCurrency(1234567, 'USD', 'en-US')).toBe('$1,234,567')
  })

  it('formats EUR in en-US locale with euro sign prefix', () => {
    expect(formatCurrency(1000, 'EUR', 'en-US')).toBe('€1,000')
  })

  it('formats JPY with yen sign', () => {
    expect(formatCurrency(100000, 'JPY', 'en-US')).toBe('¥100,000')
  })

  it('rounds fractional values (no decimals)', () => {
    expect(formatCurrency(999.75, 'USD', 'en-US')).toBe('$1,000')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD', 'en-US')).toBe('$0')
  })

  it('defaults to en-US locale when none provided', () => {
    expect(formatCurrency(500, 'USD')).toBe('$500')
  })
})
