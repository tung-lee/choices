import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketCard } from '../components/MarketCard'
import { useContract, type Market } from '../hooks/useContract'

export function Markets() {
  const { getMarketCount, getMarket } = useContract()
  const [markets, setMarkets] = useState<{ id: number; data: Market }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          } catch {
            // Skip markets that fail to load
          }
        }
        setMarkets(results)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load markets')
      } finally {
        setLoading(false)
      }
    })()
  }, [getMarketCount, getMarket])

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        Loading markets...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <p className="text-gray-500 text-sm">
          Make sure the contract is deployed and VITE_CONTRACT_ID is set.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prediction Markets</h1>
        <Link
          to="/create"
          className="bg-stellar-blue hover:bg-stellar-purple text-white px-4 py-2 rounded-lg font-medium transition-colors no-underline text-sm"
        >
          + New Market
        </Link>
      </div>

      {markets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No markets yet</p>
          <p className="text-sm">Create the first prediction market!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {markets.map(({ id, data }) => (
            <MarketCard key={id} marketId={id} market={data} />
          ))}
        </div>
      )}
    </div>
  )
}
