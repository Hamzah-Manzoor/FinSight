import sitemap from './sitemap'

test('sitemap contains all 5 routes', () => {
  const entries = sitemap()
  const paths = entries.map(e => new URL(e.url).pathname)
  expect(paths).toContain('/')
  expect(paths).toContain('/compound-interest-calculator')
  expect(paths).toContain('/historical-simulator')
  expect(paths).toContain('/dca-vs-lump-sum')
  expect(paths).toContain('/about')
  expect(paths).not.toContain('/savings-goal-calculator')
})

test('homepage has highest priority', () => {
  const entries = sitemap()
  const home = entries.find(e => new URL(e.url).pathname === '/')
  expect(home?.priority).toBe(1.0)
})

test('all entries have changeFrequency', () => {
  const entries = sitemap()
  for (const entry of entries) {
    expect(entry.changeFrequency).toBe('monthly')
  }
})
