import * as StellarSdk from '@stellar/stellar-sdk'

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015'
export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || ''
export const FRIENDBOT_URL = 'https://friendbot.stellar.org'

export const rpc = new StellarSdk.rpc.Server(SOROBAN_RPC_URL)

export const STROOPS_PER_XLM = 10_000_000n

export function stroopsToXlm(stroops: bigint | number): string {
  const val = typeof stroops === 'number' ? BigInt(stroops) : stroops
  const whole = val / STROOPS_PER_XLM
  const frac = val % STROOPS_PER_XLM
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(7, '0').replace(/0+$/, '')
  return `${whole}.${fracStr}`
}

export function xlmToStroops(xlm: string): bigint {
  const parts = xlm.split('.')
  const whole = BigInt(parts[0] || '0') * STROOPS_PER_XLM
  if (parts.length === 1) return whole
  const fracStr = (parts[1] || '0').padEnd(7, '0').slice(0, 7)
  return whole + BigInt(fracStr)
}

export async function fundWithFriendbot(address: string): Promise<void> {
  await fetch(`${FRIENDBOT_URL}?addr=${address}`)
}

export async function invokeContract(
  callerAddress: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  signTransaction: (xdr: string) => Promise<string>,
): Promise<StellarSdk.rpc.Api.GetSuccessfulTransactionResponse> {
  const account = await rpc.getAccount(callerAddress)
  const contract = new StellarSdk.Contract(contractId)

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build()

  const simulated = await rpc.simulateTransaction(tx)

  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`)
  }

  const assembled = StellarSdk.rpc.assembleTransaction(tx, simulated).build()
  const signedXdr = await signTransaction(assembled.toXDR())
  const signed = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE,
  ) as StellarSdk.Transaction

  const response = await rpc.sendTransaction(signed)

  if (response.status === 'ERROR') {
    throw new Error(`Transaction failed: ${response.errorResult}`)
  }

  // Poll for result
  let getResponse = await rpc.getTransaction(response.hash)
  while (getResponse.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 1500))
    getResponse = await rpc.getTransaction(response.hash)
  }

  if (getResponse.status === 'FAILED') {
    throw new Error('Transaction failed on-chain')
  }

  return getResponse as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse
}

export async function queryContract(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
): Promise<StellarSdk.xdr.ScVal | undefined> {
  // Use a dummy source for read-only simulation
  const dummySource = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
  let account: StellarSdk.Account
  try {
    account = await rpc.getAccount(dummySource)
  } catch {
    account = new StellarSdk.Account(dummySource, '0')
  }

  const contract = new StellarSdk.Contract(contractId)
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simulated = await rpc.simulateTransaction(tx)

  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Query failed: ${simulated.error}`)
  }

  if ('result' in simulated && simulated.result) {
    return simulated.result.retval
  }

  return undefined
}

// ScVal helpers
export const toAddress = (addr: string) =>
  new StellarSdk.Address(addr).toScVal()
export const toU64 = (val: number | bigint) =>
  StellarSdk.nativeToScVal(typeof val === 'number' ? val : Number(val), {
    type: 'u64',
  })
export const toI128 = (val: bigint) =>
  StellarSdk.nativeToScVal(val, { type: 'i128' })
export const toString = (val: string) =>
  StellarSdk.nativeToScVal(val, { type: 'string' })
export const toSymbol = (val: string) =>
  StellarSdk.nativeToScVal(val, { type: 'symbol' })
export const fromScVal = StellarSdk.scValToNative
