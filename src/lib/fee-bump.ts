/**
 * Fee Bump (Gasless) Transaction Builder
 *
 * Advanced Feature: Fee Sponsorship — gasless transactions using Stellar's
 * fee_bump_transaction envelope. The platform wallet pays the XLM network fee
 * so users can transact even with a near-zero XLM balance.
 *
 * Stellar docs: https://developers.stellar.org/docs/encyclopedia/fee-bump-transactions
 */
import * as StellarSdk from '@stellar/stellar-sdk';
import { horizonServer, NETWORK_PASSPHRASE } from './stellar';

const PLATFORM_SECRET = process.env.PLATFORM_SECRET_KEY!;

export interface GaslessPaymentParams {
  fromSecret: string;
  toAddress: string;
  amount: string; // XLM string e.g. "10.0000000"
  memo?: string;
}

export interface GaslessPaymentResult {
  txHash: string;
  feePaidBy: string; // platform public key
  innerTxHash: string;
  gasless: true;
}

/**
 * Builds and submits a fee-bump transaction where the platform pays the fee.
 *
 * Flow:
 * 1. Build inner transaction (signed by sender)
 * 2. Wrap in fee_bump_transaction (signed by platform)
 * 3. Submit — platform's address is fee_source on-chain
 */
export async function sendGaslessPayment(
  params: GaslessPaymentParams
): Promise<GaslessPaymentResult> {
  const { fromSecret, toAddress, amount, memo } = params;

  if (!PLATFORM_SECRET) {
    throw new Error('PLATFORM_SECRET_KEY is not configured');
  }

  const senderKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
  const platformKeypair = StellarSdk.Keypair.fromSecret(PLATFORM_SECRET);

  // 1. Load sender account for sequence number
  const senderAccount = await horizonServer.loadAccount(senderKeypair.publicKey());

  // 2. Build the inner transaction
  const innerTxBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    StellarSdk.Operation.payment({
      destination: toAddress,
      asset: StellarSdk.Asset.native(),
      amount: amount,
    })
  ).setTimeout(30);

  if (memo) {
    innerTxBuilder.addMemo(StellarSdk.Memo.text(memo.substring(0, 28)));
  }

  const innerTx = innerTxBuilder.build();

  // 3. Sender signs the inner transaction
  innerTx.sign(senderKeypair);

  // 4. Wrap in a fee bump — platform pays the fee
  const feeBumpFee = (parseInt(StellarSdk.BASE_FEE) * 10).toString();

  const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    platformKeypair,   // fee_source = platform wallet
    feeBumpFee,        // fee paid by platform
    innerTx,           // wraps the user's inner tx
    NETWORK_PASSPHRASE
  );

  // 5. Platform signs the fee bump envelope
  feeBumpTx.sign(platformKeypair);

  // 6. Submit
  const result = await horizonServer.submitTransaction(feeBumpTx);

  return {
    txHash: result.hash,
    feePaidBy: platformKeypair.publicKey(),
    innerTxHash: innerTx.hash().toString('hex'),
    gasless: true,
  };
}

/**
 * Checks if the platform wallet has sufficient XLM to sponsor fees.
 */
export async function canSponsorFees(): Promise<boolean> {
  if (!PLATFORM_SECRET) return false;
  try {
    const platformKeypair = StellarSdk.Keypair.fromSecret(PLATFORM_SECRET);
    const account = await horizonServer.loadAccount(platformKeypair.publicKey());
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    const balance = parseFloat(xlmBalance?.balance ?? '0');
    return balance >= 10; // require at least 10 XLM buffer
  } catch {
    return false;
  }
}
