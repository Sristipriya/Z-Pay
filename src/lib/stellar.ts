import * as StellarSdk from '@stellar/stellar-sdk';
import { supabaseAdmin } from './supabase';

// ─── Network Configuration ────────────────────────────────────────────────────
// Set STELLAR_NETWORK=mainnet in Vercel/production environment variables.
// Everything defaults to testnet for local dev safety.
const IS_MAINNET = process.env.STELLAR_NETWORK === 'mainnet';

const RPC_URL = IS_MAINNET
  ? (process.env.STELLAR_RPC_URL || 'https://mainnet.stellar.validationcloud.io/v1/stellar')
  : 'https://soroban-testnet.stellar.org';

const HORIZON_URL = IS_MAINNET
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

export const NETWORK_PASSPHRASE = IS_MAINNET
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

const PLATFORM_SECRET = process.env.PLATFORM_SECRET_KEY!;

// Platform wallet for merchant settlements
export const PLATFORM_MERCHANT_WALLET = IS_MAINNET
  ? (process.env.PLATFORM_MERCHANT_WALLET_MAINNET || '')
  : 'GAGN723GV7ASYX3VTXXEEJA3BDYI3HDWCXCDBYMJFTIK7TL5PJPV77LZ';

export const server = new StellarSdk.rpc.Server(RPC_URL);
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Creates a new Stellar keypair.
 *
 * MAINNET: No Friendbot. Returns keypair only — the account becomes
 * active on-chain only after the user funds it with ≥1 XLM (base reserve).
 *
 * TESTNET: Uses Friendbot to auto-fund the account (dev convenience only).
 */
export async function createStellarAccount(): Promise<{ publicKey: string; secretKey: string }> {
  const keypair = StellarSdk.Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  if (!IS_MAINNET) {
    // Testnet only: use Friendbot for auto-funding
    let retries = 3;
    while (retries > 0) {
      try {
        const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
        if (res.ok) break;
        const errText = await res.text();
        console.error(`Friendbot error (${res.status}):`, errText);
      } catch (error) {
        console.error('Friendbot network error:', error);
      }
      retries--;
      if (retries > 0) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // On mainnet, account is INACTIVE until the user sends ≥1 XLM to publicKey.
  // The calling flow must handle this: show a "Fund your wallet" screen.
  return { publicKey, secretKey };
}

/**
 * Checks if a Stellar account is funded and active on-chain.
 */
export async function isAccountFunded(publicKey: string): Promise<boolean> {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    return parseFloat(xlmBalance?.balance ?? '0') >= 1;
  } catch {
    return false;
  }
}

/**
 * Registers a username → Stellar address mapping.
 * Username ↔ address persisted via supabaseAdmin in /api/zpay/claim.
 * Returns a receipt string for the success screen.
 */
export async function registerUniversalId(username: string, address: string): Promise<string> {
  return `zpay:${username}:${address.substring(0, 8)}`;
}

/**
 * Resolves a ZPay username to its Stellar address via Supabase.
 */
export async function resolveUniversalId(username: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('stellar_address')
      .eq('universal_id', username)
      .single();
    return data?.stellar_address ?? null;
  } catch {
    return null;
  }
}

export interface PaymentOptions {
  memo?: string;
  memoType?: 'text' | 'id' | 'hash';
}

export async function sendPayment(
  fromSecret: string,
  toAddress: string,
  amount: string,
  options?: PaymentOptions
) {
  const sourceKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
  const sourceAccount = await horizonServer.loadAccount(sourceKeypair.publicKey());

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount,
      })
    )
    .setTimeout(30);

  if (options?.memo) {
    const memoText = options.memo.substring(0, 28);
    txBuilder.addMemo(StellarSdk.Memo.text(memoText));
  }

  const transaction = txBuilder.build();
  transaction.sign(sourceKeypair);

  const result = await horizonServer.submitTransaction(transaction);
  return result.hash;
}

export async function sendMerchantPayment(
  fromSecret: string,
  amount: string,
  merchantName: string
) {
  const memo = `PAY:${merchantName.substring(0, 20)}`;
  return sendPayment(fromSecret, PLATFORM_MERCHANT_WALLET, amount, { memo });
}

export async function getBalances(address: string) {
  try {
    const account = await horizonServer.loadAccount(address);
    return account.balances
      .filter(b => b.asset_type !== 'liquidity_pool_shares')
      .map(b => ({
        asset: b.asset_type === 'native' ? 'XLM' : (b as any).asset_code,
        balance: b.balance,
      }));
  } catch (error) {
    console.error('Balance fetch failed:', error);
    return [];
  }
}

/**
 * Returns the correct Stellar explorer URL for the current network.
 */
export function getExplorerUrl(txHash: string): string {
  if (IS_MAINNET) {
    return `https://stellar.expert/explorer/public/tx/${txHash}`;
  }
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

export { IS_MAINNET };
