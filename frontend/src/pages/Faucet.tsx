import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { fundWithFriendbot } from '../lib/stellar'
import toast from 'react-hot-toast'

export function Faucet() {
  const { address, connected } = useWallet()
  const [inputAddress, setInputAddress] = useState('')
  const [funding, setFunding] = useState(false)
  const [funded, setFunded] = useState(false)

  const targetAddress = inputAddress || (connected ? address : '')

  const handleFund = async () => {
    if (!targetAddress) {
      toast.error('Enter a Stellar address')
      return
    }

    if (!targetAddress.startsWith('G') || targetAddress.length !== 56) {
      toast.error('Invalid Stellar address')
      return
    }

    setFunding(true)
    setFunded(false)
    try {
      toast.loading('Requesting testnet XLM...', { id: 'faucet' })
      await fundWithFriendbot(targetAddress)
      toast.success('10,000 XLM funded!', { id: 'faucet' })
      setFunded(true)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Faucet request failed',
        { id: 'faucet' },
      )
    } finally {
      setFunding(false)
    }
  }

  const handleUseConnected = () => {
    if (connected && address) {
      setInputAddress(address)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-8">
        <Link
          to="/"
          className="text-text-dim hover:text-white transition-colors no-underline"
        >
          Markets
        </Link>
        <span className="text-text-dim">/</span>
        <span className="text-text-secondary">Faucet</span>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Testnet Faucet</h1>
          <p className="text-text-secondary text-sm">
            Fund any Stellar testnet account with 10,000 XLM via Friendbot
          </p>
        </div>

        {/* Address input */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-text-secondary">
            Stellar Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputAddress || (connected && !inputAddress ? address ?? '' : '')}
              onChange={(e) => setInputAddress(e.target.value)}
              onFocus={() => {
                if (!inputAddress && connected && address) {
                  setInputAddress(address)
                }
              }}
              placeholder="G... (56 characters)"
              className="w-full bg-black/60 border border-border-light rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>
          {connected && address && inputAddress !== address && (
            <button
              onClick={handleUseConnected}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Use connected wallet ({address.slice(0, 6)}...{address.slice(-4)})
            </button>
          )}
        </div>

        {/* Fund button */}
        <button
          onClick={handleFund}
          disabled={funding || !targetAddress}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent text-black font-bold py-3.5 rounded-xl text-sm transition-colors"
        >
          {funding ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Funding...
            </span>
          ) : (
            'Fund Account'
          )}
        </button>

        {/* Success state */}
        {funded && (
          <div className="mt-5 bg-yes-green-dim border border-yes-green/20 rounded-xl p-4 text-center">
            <p className="text-yes-green text-sm font-medium mb-1">
              Account funded successfully!
            </p>
            <p className="text-text-dim text-xs">
              10,000 XLM has been sent to the address
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-border space-y-3">
          <div className="flex items-start gap-3">
            <svg
              className="w-4 h-4 text-text-dim shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-text-dim text-xs leading-relaxed">
              This faucet only works on the Stellar <span className="text-text-secondary">testnet</span>.
              Funded XLM has no real value and is for development and testing purposes only.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <svg
              className="w-4 h-4 text-text-dim shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <p className="text-text-dim text-xs leading-relaxed">
              You can request funds multiple times. Each request adds 10,000 XLM to the account.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
