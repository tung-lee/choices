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
  const pool = stroopsToXlm(market.pool_balance)

  return (
    <Link
      to={`/market/${marketId}`}
      className="block bg-surface hover:bg-surface-hover border border-border hover:border-border-light rounded-2xl p-6 transition-all no-underline group"
    >
      {/* Question */}
      <h3 className="text-white font-semibold text-[15px] leading-relaxed mb-5 group-hover:text-accent-hover transition-colors line-clamp-2 min-h-[3rem]">
        {market.question}
      </h3>

      {/* Options with YES/NO pills */}
      <div className="space-y-2.5 mb-5">
        {/* YES option */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-black/60 rounded-lg overflow-hidden h-9 flex items-center relative">
            <div
              className="absolute inset-y-0 left-0 bg-yes-green/12 rounded-lg"
              style={{ width: `${yesPct}%` }}
            />
            <span className="relative text-sm text-text-secondary pl-3 font-medium">
              Yes
            </span>
            <span className="relative ml-auto text-sm font-bold text-white pr-3">
              {yesPct}%
            </span>
          </div>
          <span className="shrink-0 bg-yes-green-dim text-yes-green text-xs font-bold px-3.5 py-1.5 rounded-lg">
            YES
          </span>
        </div>

        {/* NO option */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-black/60 rounded-lg overflow-hidden h-9 flex items-center relative">
            <div
              className="absolute inset-y-0 left-0 bg-no-red/12 rounded-lg"
              style={{ width: `${noPct}%` }}
            />
            <span className="relative text-sm text-text-secondary pl-3 font-medium">
              No
            </span>
            <span className="relative ml-auto text-sm font-bold text-white pr-3">
              {noPct}%
            </span>
          </div>
          <span className="shrink-0 bg-no-red-dim text-no-red text-xs font-bold px-3.5 py-1.5 rounded-lg">
            NO
          </span>
        </div>
      </div>

      {/* Footer: status + volume + deadline */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isResolved
              ? 'bg-stellar-blue/15 text-stellar-purple'
              : isExpired
                ? 'bg-accent/10 text-accent'
                : 'bg-yes-green-dim text-yes-green'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${
            isResolved ? 'bg-stellar-purple' : isExpired ? 'bg-accent' : 'bg-yes-green'
          }`} />
          {isResolved
            ? `${market.status.values?.[0] ?? 'Resolved'}`
            : isExpired
              ? 'Expired'
              : 'Live'}
        </span>
        <div className="flex items-center gap-3 text-xs text-text-dim">
          {Number(pool) > 0 && (
            <span>
              Vol: <span className="text-text-secondary">{pool} XLM</span>
            </span>
          )}
          <span>{deadlineDate.toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  )
}
