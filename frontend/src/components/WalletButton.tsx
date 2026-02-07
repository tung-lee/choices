import { useWallet } from '../hooks/useWallet'

export function WalletButton() {
  const { address, connected, connecting, walletName, connect, disconnect } =
    useWallet()

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        {walletName && (
          <span className="text-xs text-text-dim hidden sm:block">{walletName}</span>
        )}
        <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden">
          <span className="px-3 py-1.5 text-sm font-mono text-text-secondary">
            {address.slice(0, 4)}...{address.slice(-4)}
          </span>
          <button
            onClick={disconnect}
            className="px-2 py-1.5 text-text-dim hover:text-no-red hover:bg-no-red-dim transition-colors border-l border-border"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="bg-accent hover:bg-accent-hover text-black px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
