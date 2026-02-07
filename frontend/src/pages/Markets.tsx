import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketCard } from '../components/MarketCard'
import { useContract, type Market } from '../hooks/useContract'

const categories = ['All', 'Open', 'Expired', 'Resolved'] as const
type Category = (typeof categories)[number]

export function Markets() {
  const { getMarketCount, getMarket } = useContract()
  const [markets, setMarkets] = useState<{ id: number; data: Market }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Category>('All')

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load markets')
      } finally {
        setLoading(false)
      }
    })()
  }, [getMarketCount, getMarket])

  const filteredMarkets = markets.filter(({ data }) => {
    if (filter === 'All') return true
    const isResolved = data.status.tag === 'Resolved'
    const isExpired = Date.now() > data.deadline * 1000
    if (filter === 'Resolved') return isResolved
    if (filter === 'Expired') return !isResolved && isExpired
    if (filter === 'Open') return !isResolved && !isExpired
    return true
  })

  const newestMarkets = [...markets].reverse().slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Loading markets...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <div className="inline-flex items-center gap-2.5 bg-no-red-dim text-no-red rounded-xl px-5 py-3 text-sm mb-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
        <p className="text-text-dim text-sm">
          Make sure the contract is deployed and VITE_CONTRACT_ID is set.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Top bar: filters + actions */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === cat
                  ? 'bg-accent text-black'
                  : 'bg-surface text-text-secondary hover:text-white border border-border-light hover:border-text-dim'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {markets.length > 0 && (
            <span className="text-xs text-text-dim bg-surface border border-border-light rounded-full px-4 py-2">
              {markets.length} Markets
            </span>
          )}
          <Link
            to="/create"
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-black px-5 py-2 rounded-full font-semibold text-sm transition-colors no-underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Market
          </Link>
        </div>
      </div>

      {/* Grid + Sidebar */}
      <div className="flex gap-8">
        {/* Market Grid */}
        <div className="flex-1 min-w-0">
          {filteredMarkets.length === 0 ? (
            <div className="text-center py-24 bg-surface border border-border rounded-2xl">
              <div className="text-5xl mb-4">
                {filter === 'All' ? '📊' : '🔍'}
              </div>
              <p className="text-white font-semibold text-lg mb-2">
                {filter === 'All' ? 'No markets yet' : `No ${filter.toLowerCase()} markets`}
              </p>
              <p className="text-text-dim text-sm">
                {filter === 'All'
                  ? 'Create the first prediction market!'
                  : 'Try a different filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMarkets.map(({ id, data }) => (
                <MarketCard key={id} marketId={id} market={data} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - New Markets */}
        {newestMarkets.length > 0 && (
          <div className="hidden lg:block w-80 shrink-0">
            <div className="bg-surface border border-border rounded-2xl p-5 sticky top-24">
              <h3 className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
                New Markets
                <span className="text-accent">✦</span>
              </h3>
              <div className="space-y-4">
                {newestMarkets.map(({ id, data }) => {
                  const deadlineDate = new Date(data.deadline * 1000)
                  return (
                    <Link
                      key={id}
                      to={`/market/${id}`}
                      className="flex items-start gap-3.5 group no-underline p-2 -mx-2 rounded-xl hover:bg-surface-hover transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-accent text-sm font-bold mt-0.5">
                        {id + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-text-secondary text-sm leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                          {data.question}
                        </p>
                        <p className="text-text-dim text-xs mt-1">
                          {deadlineDate.toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
