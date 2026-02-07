import { useCallback } from 'react'
import * as StellarSdk from '@stellar/stellar-sdk'
import { useWallet } from './useWallet'
import {
  CONTRACT_ID,
  invokeContract,
  queryContract,
  toAddress,
  toU64,
  toI128,
  toString,
  fromScVal,
} from '../lib/stellar'

export interface Market {
  creator: string
  question: string
  deadline: number
  status: { tag: string; values?: unknown[] }
  total_yes: bigint
  total_no: bigint
  pool_balance: bigint
}

export interface Position {
  yes_shares: bigint
  no_shares: bigint
  claimed: boolean
}

// Helper to create Soroban enum ScVal (e.g., Side::Yes -> Vec[Sym("Yes")])
function sideScVal(side: 'Yes' | 'No'): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvVec([
    StellarSdk.xdr.ScVal.scvSymbol(side),
  ])
}

export function useContract() {
  const { address, signTransaction } = useWallet()

  const getMarketCount = useCallback(async (): Promise<number> => {
    const result = await queryContract(CONTRACT_ID, 'get_market_count', [])
    if (!result) return 0
    return Number(fromScVal(result))
  }, [])

  const getMarket = useCallback(async (marketId: number): Promise<Market> => {
    const result = await queryContract(CONTRACT_ID, 'get_market', [
      toU64(marketId),
    ])
    if (!result) throw new Error('Market not found')
    const raw = fromScVal(result)
    return {
      creator: raw.creator,
      question: raw.question,
      deadline: Number(raw.deadline),
      status: parseStatus(raw.status),
      total_yes: BigInt(raw.total_yes),
      total_no: BigInt(raw.total_no),
      pool_balance: BigInt(raw.pool_balance),
    }
  }, [])

  const getPosition = useCallback(
    async (marketId: number, user: string): Promise<Position> => {
      const result = await queryContract(CONTRACT_ID, 'get_position', [
        toU64(marketId),
        toAddress(user),
      ])
      if (!result) return { yes_shares: 0n, no_shares: 0n, claimed: false }
      const raw = fromScVal(result)
      return {
        yes_shares: BigInt(raw.yes_shares),
        no_shares: BigInt(raw.no_shares),
        claimed: raw.claimed,
      }
    },
    [],
  )

  const createMarket = useCallback(
    async (question: string, deadline: number) => {
      if (!address) throw new Error('Wallet not connected')
      return invokeContract(
        address,
        CONTRACT_ID,
        'create_market',
        [toAddress(address), toString(question), toU64(deadline)],
        signTransaction,
      )
    },
    [address, signTransaction],
  )

  const buyShares = useCallback(
    async (marketId: number, side: 'Yes' | 'No', amount: bigint) => {
      if (!address) throw new Error('Wallet not connected')
      return invokeContract(
        address,
        CONTRACT_ID,
        'buy_shares',
        [toAddress(address), toU64(marketId), sideScVal(side), toI128(amount)],
        signTransaction,
      )
    },
    [address, signTransaction],
  )

  const resolveMarket = useCallback(
    async (marketId: number, outcome: 'Yes' | 'No') => {
      if (!address) throw new Error('Wallet not connected')
      return invokeContract(
        address,
        CONTRACT_ID,
        'resolve_market',
        [toU64(marketId), sideScVal(outcome)],
        signTransaction,
      )
    },
    [address, signTransaction],
  )

  const claimWinnings = useCallback(
    async (marketId: number) => {
      if (!address) throw new Error('Wallet not connected')
      return invokeContract(
        address,
        CONTRACT_ID,
        'claim_winnings',
        [toAddress(address), toU64(marketId)],
        signTransaction,
      )
    },
    [address, signTransaction],
  )

  return {
    getMarketCount,
    getMarket,
    getPosition,
    createMarket,
    buyShares,
    resolveMarket,
    claimWinnings,
  }
}

function parseStatus(raw: unknown): { tag: string; values?: unknown[] } {
  if (typeof raw === 'string') return { tag: raw }
  if (Array.isArray(raw) && raw.length >= 1)
    return { tag: String(raw[0]), values: raw.slice(1) }
  if (typeof raw === 'object' && raw !== null) {
    const entries = Object.entries(raw)
    if (entries.length > 0)
      return { tag: entries[0][0], values: [entries[0][1]] }
  }
  return { tag: 'Open' }
}
