export interface UPIDetails {
  pa: string;
  pn: string;
  mc?: string;
  tid?: string;
  tr?: string;
  tn?: string;
  am?: string;
  cu?: string;
  mode?: string;
}

export interface ParsedUPIQR {
  merchantName: string;
  merchantUpiId: string;
  amount?: number;
  transactionNote?: string;
  merchantCategory?: string;
  isValid: boolean;
  rawData?: string;
}

export function parseUPIQRCode(qrData: string): ParsedUPIQR {
  const result: ParsedUPIQR = {
    merchantName: '',
    merchantUpiId: '',
    isValid: false,
    rawData: qrData,
  };

  try {
    const trimmedData = qrData.trim();

    // Handle direct UPI ID (contains @)
    if (!trimmedData.toLowerCase().startsWith('upi://') && trimmedData.includes('@')) {
      result.merchantUpiId = trimmedData;
      result.merchantName = trimmedData.split('@')[0];
      result.isValid = true;
      return result;
    }

    // Handle UPI URL format
    if (trimmedData.toLowerCase().startsWith('upi://')) {
      const queryStart = trimmedData.indexOf('?');
      if (queryStart === -1) {
        return result;
      }

      const queryString = trimmedData.substring(queryStart + 1);
      const params = new URLSearchParams(queryString);

      result.merchantUpiId = params.get('pa') || '';
      result.merchantName =
        decodeURIComponent(params.get('pn') || '') ||
        params.get('pa')?.split('@')[0] ||
        'Merchant';
      result.merchantCategory = params.get('mc') || undefined;

      const amount = params.get('am');
      if (amount) {
        result.amount = parseFloat(amount);
      }

      result.transactionNote =
        decodeURIComponent(params.get('tn') || '') || undefined;
      result.isValid =
        !!result.merchantUpiId && result.merchantUpiId.includes('@');

      return result;
    }

    // Try to extract UPI ID from any text containing @
    const upiMatch = trimmedData.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/);
    if (upiMatch) {
      result.merchantUpiId = upiMatch[1];
      result.merchantName = upiMatch[1].split('@')[0];
      result.isValid = true;
      return result;
    }
  } catch (error) {
    console.error('UPI QR parsing error:', error);
  }

  return result;
}

/**
 * UPI Settlement — COMING SOON
 *
 * Real UPI payouts require integration with a licensed Payment Aggregator
 * (e.g., Cashfree Payouts, Razorpay X, PayU). This feature is currently
 * disabled on mainnet and will be enabled in Phase 2.
 *
 * DO NOT call this in production flows — it throws to prevent accidental use.
 */
export async function processUPISettlement(
  merchantUpiId: string,
  merchantName: string,
  amountINR: number
): Promise<{
  success: boolean;
  utrNumber: string;
  settlementTime: string;
  message: string;
}> {
  // Safety guard: never silently succeed with fake data on mainnet
  throw new Error(
    'UPI merchant settlement is not yet available. ' +
    'This feature requires a licensed Payment Aggregator integration (Phase 2).'
  );
}

/**
 * @deprecated Use processUPISettlement — the simulate* name was misleading.
 * Kept for backwards compatibility with existing imports; now throws the same error.
 */
export async function simulateUPISettlement(
  merchantUpiId: string,
  merchantName: string,
  amountINR: number
) {
  return processUPISettlement(merchantUpiId, merchantName, amountINR);
}

export function generateUPIDeepLink(params: {
  pa: string;
  pn: string;
  am?: number;
  tn?: string;
  cu?: string;
}): string {
  const upiUrl = new URL('upi://pay');
  upiUrl.searchParams.set('pa', params.pa);
  upiUrl.searchParams.set('pn', params.pn);
  if (params.am) upiUrl.searchParams.set('am', params.am.toString());
  if (params.tn) upiUrl.searchParams.set('tn', params.tn);
  upiUrl.searchParams.set('cu', params.cu || 'INR');

  return upiUrl.toString();
}
