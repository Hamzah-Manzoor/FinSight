// types/index.ts

export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'PKR'
  | 'JPY'
  | 'CAD'
  | 'AUD'

export const SUPPORTED_CURRENCIES: Currency[] = [
  'USD', 'EUR', 'GBP', 'INR', 'PKR', 'JPY', 'CAD', 'AUD',
]

export const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  PKR: 'ur-PK',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  INR: 'Indian Rupee',
  PKR: 'Pakistani Rupee',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
}

// Maps navigator.language values to Currency codes for auto-detection
export const LOCALE_TO_CURRENCY: Record<string, Currency> = {
  'en-US': 'USD',
  'en-GB': 'GBP',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'es-ES': 'EUR',
  'ja-JP': 'JPY',
  'en-IN': 'INR',
  'hi-IN': 'INR',
  'ur-PK': 'PKR',
  'en-CA': 'CAD',
  'en-AU': 'AUD',
}
