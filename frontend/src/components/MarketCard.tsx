import { Link } from 'react-router-dom'
import type { Market } from '../hooks/useContract'
import { stroopsToXlm } from '../lib/stellar'

interface Props {
  market: Market
  marketId: number
}

export function MarketCard({ market, marketId }: Props) {
  const totalShares = market.total_yes + market.total_no
  const yesPct =
    totalShares > 0n
      ? Number((market.total_yes * 100n) / totalShares)
      : 50
  const noPct = 100 - yesPct

  const isResolved = market.status.tag === 'Resolved'
  const deadlineDate = new Date(market.deadline * 1000)
  const isExpired = Date.now() > deadlineDate.getTime()

  return (
    <Link
      to={`/market/${marketId}`}
      className="block bg-surface border border-border rounded-xl p-5 hover:border-stellar-blue/50 transition-colors no-underline"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-medium text-lg leading-snug pr-4">
          {market.question}
        </h3>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
            isResolved
              ? 'bg-blue-500/20 text-blue-400'
              : isExpired
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
          }`}
        >
          {isResolved ? `Resolved: ${market.status.values?.[0] ?? ''}` : isExpired ? 'Expired' : 'Open'}
        </span>
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-yes-green">Yes {yesPct}%</span>
          <span className="text-no-red">No {noPct}%</span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden flex">
          <div
            className="bg-yes-green transition-all"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="bg-no-red transition-all"
            style={{ width: `${noPct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-400">
        <span>Pool: {stroopsToXlm(market.pool_balance)} XLM</span>
        <span>
          {isExpired ? 'Ended' : 'Ends'}{' '}
          {deadlineDate.toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
