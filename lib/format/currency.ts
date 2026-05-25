// lib/format/currency.ts

export function formatCurrency(
  value: number,
  currency: string,
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}
