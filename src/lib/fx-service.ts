// ─── FX Service ───────────────────────────────────────────────────────────────
// Live exchange rates via CoinGecko free API (no API key required).
// Falls back to cached/hardcoded rates if the API is unavailable.
// Cache TTL: 60 seconds to avoid rate limiting.

export type SupportedCurrency = 'XLM' | 'USDC' | 'INR' | 'USD' | 'EUR' | 'GBP';

export interface FXQuote {
  id?: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source_amount: number;
  target_amount: number;
  expires_at: string;
  seconds_remaining: number;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

// Fallback rates (used if CoinGecko is unreachable)
const FALLBACK_RATES: Record<string, number> = {
  'XLM_INR': 13.52,
  'XLM_USD': 0.16,
  'XLM_EUR': 0.15,
  'XLM_GBP': 0.13,
  'USDC_INR': 83.50,
  'USDC_USD': 1.00,
  'USDC_EUR': 0.92,
  'USDC_GBP': 0.79,
  'INR_XLM': 0.074,
  'INR_USDC': 0.012,
  'USD_INR': 83.50,
  'EUR_INR': 90.80,
  'GBP_INR': 105.60,
};

/**
 * Fetches live rates from CoinGecko free API and builds a normalised rates map.
 * CoinGecko free tier: 30 calls/min — safe with 60s cache.
 */
async function fetchLiveRates(): Promise<Record<string, number>> {
  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar%2Cusd-coin&vs_currencies=inr%2Cusd%2Ceur%2Cgbp';

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Next.js fetch caching: revalidate every 60s on the server side too
      next: { revalidate: 60 },
    } as RequestInit);

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data = await res.json();

    // data shape:
    // { stellar: { inr: 13.5, usd: 0.16, eur: 0.15, gbp: 0.13 },
    //   'usd-coin': { inr: 83.5, usd: 1.0, eur: 0.92, gbp: 0.79 } }

    const xlm = data['stellar'] || {};
    const usdc = data['usd-coin'] || {};

    const rates: Record<string, number> = {
      'XLM_INR':  xlm.inr  || FALLBACK_RATES['XLM_INR'],
      'XLM_USD':  xlm.usd  || FALLBACK_RATES['XLM_USD'],
      'XLM_EUR':  xlm.eur  || FALLBACK_RATES['XLM_EUR'],
      'XLM_GBP':  xlm.gbp  || FALLBACK_RATES['XLM_GBP'],
      'USDC_INR': usdc.inr || FALLBACK_RATES['USDC_INR'],
      'USDC_USD': usdc.usd || FALLBACK_RATES['USDC_USD'],
      'USDC_EUR': usdc.eur || FALLBACK_RATES['USDC_EUR'],
      'USDC_GBP': usdc.gbp || FALLBACK_RATES['USDC_GBP'],
    };

    // Derive inverses
    for (const [key, rate] of Object.entries(rates)) {
      if (rate > 0) {
        const [from, to] = key.split('_');
        const reverseKey = `${to}_${from}`;
        if (!rates[reverseKey]) {
          rates[reverseKey] = 1 / rate;
        }
      }
    }

    return rates;
  } catch (err) {
    console.error('[fx-service] CoinGecko fetch failed, using fallback rates:', err);
    return FALLBACK_RATES;
  }
}

async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRates;
  }
  cachedRates = await fetchLiveRates();
  cacheTimestamp = now;
  return cachedRates;
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const rates = await getRates();
  const key = `${from}_${to}`;
  const reverseKey = `${to}_${from}`;

  if (rates[key]) return rates[key];
  if (rates[reverseKey]) return 1 / rates[reverseKey];

  return 1;
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return amount * rate;
}

export async function generateQuote(
  fromCurrency: string,
  toCurrency: string,
  sourceAmount: number,
  expirySeconds: number = 45
): Promise<FXQuote> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  const targetAmount = sourceAmount * rate;
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  return {
    from_currency: fromCurrency,
    to_currency: toCurrency,
    rate,
    source_amount: sourceAmount,
    target_amount: targetAmount,
    expires_at: expiresAt.toISOString(),
    seconds_remaining: expirySeconds,
  };
}

export function isQuoteExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    XLM: '',
    USDC: '$',
  };

  const symbol = symbols[currency] || '';
  const decimals = 2;

  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function getSupportedCurrencies() {
  return [
    { code: 'USDC', name: 'USD Coin', symbol: '$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];
}
