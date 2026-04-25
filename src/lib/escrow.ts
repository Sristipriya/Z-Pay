import * as StellarSdk from '@stellar/stellar-sdk';

const { Server } = StellarSdk.rpc;

const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
const CONTRACT_ID = process.env.ESCROW_CONTRACT_ID || 'CAGMD6PBDSOSB2NDOE5ZGYCWH74EOBJFHM627WTGLZZF66DBRUFWYSPT';
const TOKEN_CONTRACT_ID = process.env.TOKEN_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const server = new Server(SOROBAN_RPC_URL);

export type EscrowStatus = 'Funded' | 'Delivered' | 'Released' | 'Disputed' | 'Refunded';

export interface EscrowData {
  buyer: string;
  seller: string;
  token: string;
  amount: bigint;
  deadline: bigint;
  status: EscrowStatus;
}

async function buildAndPrepareTransaction(
  sourcePublicKey: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.Transaction> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(sourcePublicKey);
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .setTimeout(60)
    .addOperation(contract.call(method, ...args))
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared as StellarSdk.Transaction;
}

async function signAndSubmitTransaction(
  transaction: StellarSdk.Transaction,
  keypair: StellarSdk.Keypair
): Promise<{ hash: string; result?: StellarSdk.xdr.ScVal }> {
  transaction.sign(keypair);
  
  const sendRes = await server.sendTransaction(transaction);
  
  if (sendRes.status === 'ERROR') {
    throw new Error(`Transaction failed: ${sendRes.errorResult?.toXDR('base64') || 'Unknown error'}`);
  }

  let getRes = await server.getTransaction(sendRes.hash);
  while (getRes.status === 'NOT_FOUND') {
    await new Promise(r => setTimeout(r, 1000));
    getRes = await server.getTransaction(sendRes.hash);
  }

  if (getRes.status !== 'SUCCESS') {
    throw new Error(`Transaction failed: ${getRes.status}`);
  }

  let resultVal: StellarSdk.xdr.ScVal | undefined;
  if (getRes.returnValue) {
    resultVal = getRes.returnValue;
  }

  return { hash: sendRes.hash, result: resultVal };
}

export async function createEscrow(
  buyerSecret: string,
  buyerAddress: string,
  sellerAddress: string,
  amount: bigint,
  tokenAddress: string,
  arbiterAddress: string,
  escrowId: string,
  deadlineLedger: bigint
): Promise<{ txHash: string }> {
  const keypair = StellarSdk.Keypair.fromSecret(buyerSecret);

  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
    new StellarSdk.Address(buyerAddress).toScVal(),
    new StellarSdk.Address(sellerAddress).toScVal(),
    StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    new StellarSdk.Address(tokenAddress).toScVal(),
    new StellarSdk.Address(arbiterAddress).toScVal(),
    StellarSdk.nativeToScVal(deadlineLedger, { type: 'u64' }),
  ];

  const tx = await buildAndPrepareTransaction(buyerAddress, 'create', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  
  return { txHash: hash };
}

export async function fundEscrow(escrowId: string, buyerSecret: string): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(buyerSecret);
  const buyerAddress = keypair.publicKey();
  
  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
  ];
  
  const tx = await buildAndPrepareTransaction(buyerAddress, 'fund', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  return hash;
}

export async function deliverEscrow(escrowId: string, sellerSecret: string): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(sellerSecret);
  const sellerAddress = keypair.publicKey();
  
  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
  ];
  
  const tx = await buildAndPrepareTransaction(sellerAddress, 'deliver', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  return hash;
}

export async function releaseEscrow(escrowId: string, buyerSecret: string): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(buyerSecret);
  const buyerAddress = keypair.publicKey();
  
  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
  ];
  
  const tx = await buildAndPrepareTransaction(buyerAddress, 'release_funds', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  return hash;
}

export async function disputeEscrow(escrowId: string, callerSecret: string): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(callerSecret);
  const callerAddress = keypair.publicKey();
  
  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
    new StellarSdk.Address(callerAddress).toScVal(),
  ];
  
  const tx = await buildAndPrepareTransaction(callerAddress, 'dispute', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  return hash;
}

export async function refundEscrow(escrowId: string, buyerSecret: string): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(buyerSecret);
  const buyerAddress = keypair.publicKey();
  
  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
  ];
  
  const tx = await buildAndPrepareTransaction(buyerAddress, 'cancel_escrow', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  return hash;
}

export async function resolveEscrow(escrowId: string, arbiterSecret: string, payFreelancer: boolean): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(arbiterSecret);
  const arbiterAddress = keypair.publicKey();
  
  const args = [
    StellarSdk.nativeToScVal(escrowId, { type: 'string' }),
    StellarSdk.nativeToScVal(payFreelancer, { type: 'bool' }),
  ];
  
  const tx = await buildAndPrepareTransaction(arbiterAddress, 'resolve', args);
  const { hash } = await signAndSubmitTransaction(tx, keypair);
  return hash;
}

export async function getEscrow(escrowId: number): Promise<EscrowData | null> {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const randomAccount = StellarSdk.Keypair.random().publicKey();
    
    const account = await server.getAccount(randomAccount).catch(() => null);
    if (!account) {
      const fundedAccount = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF').catch(() => null);
      if (!fundedAccount) return null;
    }
    
    const sourceAccount = account || await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .setTimeout(30)
      .addOperation(contract.call('get', StellarSdk.nativeToScVal(escrowId, { type: 'u64' })))
      .build();

    const simRes = await server.simulateTransaction(tx);
    
    if ('result' in simRes && simRes.result) {
      const raw = StellarSdk.scValToNative(simRes.result.retval);
      
      const statusMap: Record<string, EscrowStatus> = {
        'Funded': 'Funded',
        'Delivered': 'Delivered', 
        'Released': 'Released',
        'Disputed': 'Disputed',
        'Refunded': 'Refunded',
      };
      
      return {
        buyer: raw.buyer,
        seller: raw.seller,
        token: raw.token,
        amount: BigInt(raw.amount),
        deadline: BigInt(raw.deadline),
        status: statusMap[Object.keys(raw.status)[0]] || 'Funded',
      };
    }
    return null;
  } catch (e) {
    console.error('Get escrow error:', e);
    return null;
  }
}

export async function getCurrentLedger(): Promise<number> {
  try {
    const health = await server.getHealth();
    return health.latestLedger || 0;
  } catch {
    return 0;
  }
}

export function calculateDeadlineLedger(daysFromNow: number): bigint {
  const ledgersPerDay = 17280;
  return BigInt(Math.floor(daysFromNow * ledgersPerDay));
}
