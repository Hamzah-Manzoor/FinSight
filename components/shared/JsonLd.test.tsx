import { render } from '@testing-library/react'
import { JsonLd } from './JsonLd'

test('renders script tag with correct type', () => {
  const data = { '@type': 'WebApplication', name: 'FinSight' }
  const { container } = render(<JsonLd data={data} />)
  const script = container.querySelector('script[type="application/ld+json"]')
  expect(script).toBeTruthy()
})

test('serializes data as valid JSON', () => {
  const data = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'FinSight' }
  const { container } = render(<JsonLd data={data} />)
  const script = container.querySelector('script[type="application/ld+json"]')!
  expect(JSON.parse(script.innerHTML)).toEqual(data)
})
