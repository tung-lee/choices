import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useContract, type Market } from '../hooks/useContract'
import { stroopsToXlm } from '../lib/stellar'
import toast from 'react-hot-toast'

export function Admin() {
  const { connected } = useWallet()
  const { getMarketCount, getMarket, resolveMarket } = useContract()

  const [markets, setMarkets] = useState<{ id: number; data: Market }[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const count = await getMarketCount()
        const results: { id: number; data: Market }[] = []
        for (let i = 0; i < count; i++) {
          try {
            const market = await getMarket(i)
            results.push({ id: i, data: market })
          } catch {}
        }
        setMarkets(results)
      } catch {
        toast.error('Failed to load markets')
      } finally {
        setLoading(false)
      }
    })()
  }, [getMarketCount, getMarket])

  const handleResolve = async (marketId: number, outcome: 'Yes' | 'No') => {
    if (!connected) {
      toast.error('Connect admin wallet first')
      return
    }
    setResolving(marketId)
    try {
      toast.loading(`Resolving as ${outcome}...`, { id: 'resolve' })
      await resolveMarket(marketId, outcome)
      toast.success('Market resolved!', { id: 'resolve' })
      const updated = await getMarket(marketId)
      setMarkets((prev) =>
        prev.map((m) => (m.id === marketId ? { ...m, data: updated } : m)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resolution failed', {
        id: 'resolve',
      })
    } finally {
      setResolving(null)
    }
  }

  const resolvableMarkets = markets.filter(({ data }) => {
    const isOpen = data.status.tag === 'Open'
    const isExpired = Date.now() > data.deadline * 1000
    return isOpen && isExpired
  })

  const resolvedMarkets = markets.filter(
    ({ data }) => data.status.tag === 'Resolved',
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-8">
        <Link to="/" className="text-text-dim hover:text-white transition-colors no-underline">Markets</Link>
        <span className="text-text-dim">/</span>
        <span className="text-text-secondary">Admin</span>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        {!connected && (
          <span className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium">
            Wallet not connected
          </span>
        )}
      </div>

      {!connected && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-8 text-accent text-sm text-center">
          Connect the admin wallet to resolve markets
        </div>
      )}

      {/* Awaiting Resolution */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5">
          Awaiting Resolution ({resolvableMarkets.length})
        </h2>
        {resolvableMarkets.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center text-text-dim text-sm">
            No markets to resolve
          </div>
        ) : (
          <div className="space-y-4">
            {resolvableMarkets.map(({ id, data }) => (
              <div
                key={id}
                className="bg-surface border border-border rounded-2xl p-6"
              >
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">{data.question}</h3>
                  <p className="text-xs text-text-dim">
                    Pool: {stroopsToXlm(data.pool_balance)} XLM &middot; Ended: {new Date(data.deadline * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleResolve(id, 'Yes')}
                    disabled={resolving === id}
                    className="bg-yes-green-dim hover:bg-yes-green/25 text-yes-green border border-yes-green/20 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                  >
                    {resolving === id ? 'Resolving...' : 'Resolve YES'}
                  </button>
                  <button
                    onClick={() => handleResolve(id, 'No')}
                    disabled={resolving === id}
                    className="bg-no-red-dim hover:bg-no-red/25 text-no-red border border-no-red/20 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                  >
                    {resolving === id ? 'Resolving...' : 'Resolve NO'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5">
          Resolved ({resolvedMarkets.length})
        </h2>
        {resolvedMarkets.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center text-text-dim text-sm">
            No resolved markets yet
          </div>
        ) : (
          <div className="space-y-4">
            {resolvedMarkets.map(({ id, data }) => (
              <div
                key={id}
                className="bg-surface border border-border rounded-2xl p-6 opacity-70"
              >
                <h3 className="text-white font-semibold mb-2">{data.question}</h3>
                <p className="text-xs text-text-dim">
                  Outcome: <span className="text-accent">{String(data.status.values?.[0] ?? 'Unknown')}</span> &middot; Pool: {stroopsToXlm(data.pool_balance)} XLM
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
