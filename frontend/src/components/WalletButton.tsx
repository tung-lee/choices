import { useWallet } from '../hooks/useWallet'

export function WalletButton() {
  const { address, connected, connecting, connect, disconnect } = useWallet()

  if (connected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="bg-surface-light px-3 py-1.5 rounded-lg text-sm font-mono">
          {address.slice(0, 4)}...{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="bg-stellar-blue hover:bg-stellar-purple text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
