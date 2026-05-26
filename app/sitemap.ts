import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/compound-interest-calculator`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/historical-simulator`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/dca-vs-lump-sum`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/about`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
