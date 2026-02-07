import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useContract, type Market, type Position } from '../hooks/useContract'
import { stroopsToXlm, xlmToStroops } from '../lib/stellar'
import toast from 'react-hot-toast'

export function MarketDetail() {
  const { id } = useParams<{ id: string }>()
  const marketId = Number(id)
  const { address, connected } = useWallet()
  const { getMarket, getPosition, buyShares, claimWinnings } = useContract()

  const [market, setMarket] = useState<Market | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const m = await getMarket(marketId)
      setMarket(m)
      if (address) {
        const p = await getPosition(marketId, address)
        setPosition(p)
      }
    } catch (err) {
      toast.error('Failed to load market')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [marketId, address])

  const handleBuy = async (side: 'Yes' | 'No') => {
    if (!connected || !amount) return
    const stroops = xlmToStroops(amount)
    if (stroops <= 0n) {
      toast.error('Enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      toast.loading(`Buying ${side} shares...`, { id: 'buy' })
      await buyShares(marketId, side, stroops)
      toast.success(`Bought ${side} shares!`, { id: 'buy' })
      setAmount('')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transaction failed', {
        id: 'buy',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClaim = async () => {
    if (!connected) return
    setSubmitting(true)
    try {
      toast.loading('Claiming winnings...', { id: 'claim' })
      await claimWinnings(marketId)
      toast.success('Winnings claimed!', { id: 'claim' })
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed', {
        id: 'claim',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>
  }

  if (!market) {
    return (
      <div className="text-center py-16 text-red-400">Market not found</div>
    )
  }

  const totalShares = market.total_yes + market.total_no
  const yesPct = totalShares > 0n ? Number((market.total_yes * 100n) / totalShares) : 50
  const noPct = 100 - yesPct
  const isOpen = market.status.tag === 'Open'
  const isResolved = market.status.tag === 'Resolved'
  const deadlineDate = new Date(market.deadline * 1000)
  const isExpired = Date.now() > deadlineDate.getTime()
  const canBuy = isOpen && !isExpired

  // Calculate potential payout
  const potentialPayout = (side: 'Yes' | 'No') => {
    if (!position) return '0'
    const shares = side === 'Yes' ? position.yes_shares : position.no_shares
    const totalSide = side === 'Yes' ? market.total_yes : market.total_no
    if (totalSide === 0n || shares === 0n) return '0'
    return stroopsToXlm((shares * market.pool_balance) / totalSide)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold">{market.question}</h1>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
              isResolved
                ? 'bg-blue-500/20 text-blue-400'
                : isExpired
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
            }`}
          >
            {isResolved
              ? `Resolved: ${market.status.values?.[0] ?? ''}`
              : isExpired
                ? 'Expired'
                : 'Open'}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Deadline: {deadlineDate.toLocaleString()}
        </p>
      </div>

      {/* Probability */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-yes-green font-medium">Yes {yesPct}%</span>
          <span className="text-no-red font-medium">No {noPct}%</span>
        </div>
        <div className="h-3 bg-surface-light rounded-full overflow-hidden flex mb-4">
          <div className="bg-yes-green transition-all" style={{ width: `${yesPct}%` }} />
          <div className="bg-no-red transition-all" style={{ width: `${noPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-gray-400">Pool</div>
            <div className="font-medium">{stroopsToXlm(market.pool_balance)} XLM</div>
          </div>
          <div>
            <div className="text-gray-400">Yes Volume</div>
            <div className="font-medium text-yes-green">{stroopsToXlm(market.total_yes)} XLM</div>
          </div>
          <div>
            <div className="text-gray-400">No Volume</div>
            <div className="font-medium text-no-red">{stroopsToXlm(market.total_no)} XLM</div>
          </div>
        </div>
      </div>

      {/* Buy Section */}
      {canBuy && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="font-medium mb-4">Place a Bet</h2>
          {!connected ? (
            <p className="text-gray-400 text-sm">Connect your wallet to place bets.</p>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Amount (XLM)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10"
                  min="0.0000001"
                  step="any"
                  className="w-full bg-surface-light border border-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-stellar-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleBuy('Yes')}
                  disabled={submitting || !amount}
                  className="bg-yes-green/20 hover:bg-yes-green/30 text-yes-green border border-yes-green/30 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? '...' : 'Buy Yes'}
                </button>
                <button
                  onClick={() => handleBuy('No')}
                  disabled={submitting || !amount}
                  className="bg-no-red/20 hover:bg-no-red/30 text-no-red border border-no-red/30 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? '...' : 'Buy No'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Position */}
      {position && (position.yes_shares > 0n || position.no_shares > 0n) && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="font-medium mb-4">Your Position</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-surface-light rounded-lg p-3">
              <div className="text-sm text-gray-400">Yes Shares</div>
              <div className="font-medium text-yes-green">
                {stroopsToXlm(position.yes_shares)} XLM
              </div>
              {isResolved && (
                <div className="text-xs text-gray-500 mt-1">
                  Payout: {potentialPayout('Yes')} XLM
                </div>
              )}
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <div className="text-sm text-gray-400">No Shares</div>
              <div className="font-medium text-no-red">
                {stroopsToXlm(position.no_shares)} XLM
              </div>
              {isResolved && (
                <div className="text-xs text-gray-500 mt-1">
                  Payout: {potentialPayout('No')} XLM
                </div>
              )}
            </div>
          </div>

          {isResolved && !position.claimed && (
            <button
              onClick={handleClaim}
              disabled={submitting}
              className="w-full bg-stellar-blue hover:bg-stellar-purple text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Claiming...' : 'Claim Winnings'}
            </button>
          )}
          {position.claimed && (
            <p className="text-center text-sm text-gray-400">
              Winnings already claimed.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
