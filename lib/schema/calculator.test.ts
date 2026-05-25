import { describe, expect, it } from 'vitest'
import { calculatorSchema, defaultParams } from './calculator'

describe('calculatorSchema', () => {
  it('parses valid URL param strings into correct types', () => {
    const result = calculatorSchema.safeParse({
      p: '5000', pmt: '200', r: '6', t: '25',
      freq: '12', timing: 'end', infl: '3', inflOn: '1',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      p: 5000, pmt: 200, r: 6, t: 25,
      freq: 12, timing: 'end', infl: 3, inflOn: true,
      mode: 'fv', target: 500000,
    })
  })

  it('inflOn: "0" parses to false', () => {
    const result = calculatorSchema.safeParse({ inflOn: '0' })
    expect(result.success).toBe(true)
    expect(result.data?.inflOn).toBe(false)
  })

  it('inflOn: "1" parses to true', () => {
    const result = calculatorSchema.safeParse({ inflOn: '1' })
    expect(result.success).toBe(true)
    expect(result.data?.inflOn).toBe(true)
  })

  it('uses defaults when called with empty object', () => {
    const result = calculatorSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual(defaultParams)
  })

  it('rejects t > 100', () => {
    const result = calculatorSchema.safeParse({ t: '101' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid compounding frequency', () => {
    const result = calculatorSchema.safeParse({ freq: '7' })
    expect(result.success).toBe(false)
  })

  it('rejects negative principal', () => {
    const result = calculatorSchema.safeParse({ p: '-1' })
    expect(result.success).toBe(false)
  })
})
