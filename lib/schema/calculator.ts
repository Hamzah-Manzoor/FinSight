import { z } from 'zod'

export const calculatorSchema = z.object({
  p:      z.coerce.number().min(0).default(10000),
  pmt:    z.coerce.number().min(0).default(500),
  r:      z.coerce.number().default(7),
  t:      z.coerce.number().min(1).max(100).default(30),
  freq:   z.coerce.number()
            .pipe(z.union([z.literal(1), z.literal(4), z.literal(12), z.literal(365)]))
            .default(12),
  timing: z.enum(['start', 'end']).default('end'),
  infl:   z.coerce.number().min(0).default(2.5),
  // Boolean URL params — "false" string is truthy so we cannot use z.coerce.boolean()
  inflOn: z.preprocess(v => v === '1' || v === true, z.boolean()).default(false),
})

export type CalculatorParams = z.infer<typeof calculatorSchema>

export const defaultParams: CalculatorParams = calculatorSchema.parse({})
