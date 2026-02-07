import { useEffect, useState } from 'react'
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
      // Reload
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

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>
  }

  const resolvableMarkets = markets.filter(({ data }) => {
    const isOpen = data.status.tag === 'Open'
    const isExpired = Date.now() > data.deadline * 1000
    return isOpen && isExpired
  })

  const resolvedMarkets = markets.filter(
    ({ data }) => data.status.tag === 'Resolved',
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {!connected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-yellow-400 text-sm">
          Connect the admin wallet to resolve markets.
        </div>
      )}

      {/* Resolvable Markets */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4 text-gray-300">
          Awaiting Resolution ({resolvableMarkets.length})
        </h2>
        {resolvableMarkets.length === 0 ? (
          <p className="text-gray-500 text-sm">No markets to resolve.</p>
        ) : (
          <div className="space-y-3">
            {resolvableMarkets.map(({ id, data }) => (
              <div
                key={id}
                className="bg-surface border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{data.question}</h3>
                    <p className="text-sm text-gray-400">
                      Pool: {stroopsToXlm(data.pool_balance)} XLM | Ended:{' '}
                      {new Date(data.deadline * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleResolve(id, 'Yes')}
                    disabled={resolving === id}
                    className="bg-yes-green/20 hover:bg-yes-green/30 text-yes-green border border-yes-green/30 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {resolving === id ? '...' : 'Resolve YES'}
                  </button>
                  <button
                    onClick={() => handleResolve(id, 'No')}
                    disabled={resolving === id}
                    className="bg-no-red/20 hover:bg-no-red/30 text-no-red border border-no-red/30 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {resolving === id ? '...' : 'Resolve NO'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved Markets */}
      <section>
        <h2 className="text-lg font-medium mb-4 text-gray-300">
          Resolved Markets ({resolvedMarkets.length})
        </h2>
        {resolvedMarkets.length === 0 ? (
          <p className="text-gray-500 text-sm">No resolved markets yet.</p>
        ) : (
          <div className="space-y-3">
            {resolvedMarkets.map(({ id, data }) => (
              <div
                key={id}
                className="bg-surface border border-border rounded-xl p-4 opacity-70"
              >
                <h3 className="font-medium">{data.question}</h3>
                <p className="text-sm text-gray-400">
                  Outcome: {String(data.status.values?.[0] ?? 'Unknown')} | Pool:{' '}
                  {stroopsToXlm(data.pool_balance)} XLM
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
