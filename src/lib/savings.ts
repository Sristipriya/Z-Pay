import * as StellarSdk from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE, server } from './stellar';

const STAKING_CONTRACT_ID = process.env.STAKING_CONTRACT_ID || '';
const POOL_CONTRACT_ID    = process.env.POOL_CONTRACT_ID    || '';

// ─── Shared helpers ──────────────────────────────────────────────────────────
async function buildAndPrepare(
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.Transaction> {
  const contract = new StellarSdk.Contract(contractId);
  const account  = await server.getAccount(sourcePublicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '500000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared as StellarSdk.Transaction;
}

async function signAndSubmit(
  tx: StellarSdk.Transaction,
  keypair: StellarSdk.Keypair
): Promise<{ hash: string; result: StellarSdk.xdr.ScVal | null }> {
  tx.sign(keypair);
  const sendRes = await server.sendTransaction(tx);

  if (sendRes.status === 'ERROR') {
    const errXdr = sendRes.errorResult?.toXDR('base64') || 'unknown';
    throw new Error(`Transaction failed: ${errXdr}`);
  }

  let getRes = await server.getTransaction(sendRes.hash);
  let attempts = 0;
  while (getRes.status === 'NOT_FOUND' && attempts < 30) {
    await new Promise(r => setTimeout(r, 1000));
    getRes = await server.getTransaction(sendRes.hash);
    attempts++;
  }

  if (getRes.status !== 'SUCCESS') {
    throw new Error(`Transaction not confirmed after ${attempts}s. Status: ${getRes.status}`);
  }

  const result = (getRes as any).returnValue ?? null;
  return { hash: sendRes.hash, result };
}

// ════════════════════════════════════════════════════════════════════════════
// STAKING CONTRACT  (Phase 2)
// ════════════════════════════════════════════════════════════════════════════

/** Stake ZPAY tokens. Returns { txHash, stakeId } */
export async function stakeExpo(
  stakerSecret:  string,
  stakerAddress: string,
  amount:        bigint,   // in stroops (1 ZPAY = 10_000_000 stroops)
  durationDays:  30 | 60 | 90
): Promise<{ txHash: string; stakeId: number }> {
  const keypair = StellarSdk.Keypair.fromSecret(stakerSecret);

  const args = [
    new StellarSdk.Address(stakerAddress).toScVal(),
    StellarSdk.nativeToScVal(amount,       { type: 'i128' }),
    StellarSdk.nativeToScVal(durationDays, { type: 'u32'  }),
  ];

  const tx = await buildAndPrepare(stakerAddress, STAKING_CONTRACT_ID, 'stake', args);
  const { hash, result } = await signAndSubmit(tx, keypair);

  let stakeId = 0;
  if (result) stakeId = Number(StellarSdk.scValToNative(result));

  return { txHash: hash, stakeId };
}

/** Unstake after lock period. Returns { txHash, payout } */
export async function unstakeExpo(
  stakerSecret:  string,
  stakerAddress: string,
  stakeId:       number
): Promise<{ txHash: string; payout: bigint }> {
  const keypair = StellarSdk.Keypair.fromSecret(stakerSecret);

  const args = [
    new StellarSdk.Address(stakerAddress).toScVal(),
    StellarSdk.nativeToScVal(BigInt(stakeId), { type: 'u64' }),
  ];

  const tx = await buildAndPrepare(stakerAddress, STAKING_CONTRACT_ID, 'unstake', args);
  const { hash, result } = await signAndSubmit(tx, keypair);

  let payout = 0n;
  if (result) payout = BigInt(StellarSdk.scValToNative(result) as string);

  return { txHash: hash, payout };
}

/** Read stake details (read-only simulation). */
export async function getStake(stakeId: number): Promise<{
  stakeId: number;
  amount: bigint;
  startLedger: number;
  unlockLedger: number;
  durationDays: number;
  rewardBps: number;
  claimed: boolean;
}> {
  const contract = new StellarSdk.Contract(STAKING_CONTRACT_ID);
  const fakeSource = StellarSdk.Keypair.random().publicKey();
  const account = await server.getAccount(fakeSource).catch(() => 
    new StellarSdk.Account(fakeSource, '0')
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_stake',
      StellarSdk.nativeToScVal(BigInt(stakeId), { type: 'u64' })
    ))
    .setTimeout(30)
    .build();

  const res = await server.simulateTransaction(tx);
  if (!StellarSdk.rpc.Api.isSimulationSuccess(res)) {
    throw new Error('Stake not found');
  }
  const native = StellarSdk.scValToNative((res as any).result.retval) as any;
  return {
    stakeId:     Number(native.stake_id),
    amount:      BigInt(native.amount),
    startLedger: Number(native.start_ledger),
    unlockLedger:Number(native.unlock_ledger),
    durationDays:Number(native.duration_days),
    rewardBps:   Number(native.reward_bps),
    claimed:     Boolean(native.claimed),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// POOL CONTRACT  (Phase 3)
// ════════════════════════════════════════════════════════════════════════════

/** Deposit XLM into the yield pool. Returns { txHash, positionId } */
export async function depositToPool(
  depositorSecret:  string,
  depositorAddress: string,
  xlmAmount:        bigint   // in stroops
): Promise<{ txHash: string; positionId: number }> {
  const keypair = StellarSdk.Keypair.fromSecret(depositorSecret);

  const args = [
    new StellarSdk.Address(depositorAddress).toScVal(),
    StellarSdk.nativeToScVal(xlmAmount, { type: 'i128' }),
  ];

  const tx = await buildAndPrepare(depositorAddress, POOL_CONTRACT_ID, 'deposit', args);
  const { hash, result } = await signAndSubmit(tx, keypair);

  let positionId = 0;
  if (result) positionId = Number(StellarSdk.scValToNative(result));

  return { txHash: hash, positionId };
}

/** Withdraw XLM + ZPAY rewards. Returns { txHash, xlmAmount, expoReward } */
export async function withdrawFromPool(
  depositorSecret:  string,
  depositorAddress: string,
  positionId:       number
): Promise<{ txHash: string; xlmAmount: bigint; expoReward: bigint }> {
  const keypair = StellarSdk.Keypair.fromSecret(depositorSecret);

  const args = [
    new StellarSdk.Address(depositorAddress).toScVal(),
    StellarSdk.nativeToScVal(BigInt(positionId), { type: 'u64' }),
  ];

  const tx = await buildAndPrepare(depositorAddress, POOL_CONTRACT_ID, 'withdraw', args);
  const { hash, result } = await signAndSubmit(tx, keypair);

  let xlmAmount  = 0n;
  let expoReward = 0n;
  if (result) {
    const tuple = StellarSdk.scValToNative(result) as [string, string];
    xlmAmount  = BigInt(tuple[0]);
    expoReward = BigInt(tuple[1]);
  }

  return { txHash: hash, xlmAmount, expoReward };
}
