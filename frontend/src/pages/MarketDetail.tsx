import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="text-center py-24">
        <p className="text-no-red text-lg mb-3">Market not found</p>
        <Link to="/" className="text-accent text-sm hover:underline">Back to markets</Link>
      </div>
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

  const potentialPayout = (side: 'Yes' | 'No') => {
    if (!position) return '0'
    const shares = side === 'Yes' ? position.yes_shares : position.no_shares
    const totalSide = side === 'Yes' ? market.total_yes : market.total_no
    if (totalSide === 0n || shares === 0n) return '0'
    return stroopsToXlm((shares * market.pool_balance) / totalSide)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-8">
        <Link to="/" className="text-text-dim hover:text-white transition-colors no-underline">Markets</Link>
        <span className="text-text-dim">/</span>
        <span className="text-text-secondary">Market #{marketId}</span>
      </div>

      {/* Header */}
      <div className="bg-surface border border-border rounded-2xl p-7 mb-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <h1 className="text-2xl font-bold leading-snug">{market.question}</h1>
          <span
            className={`shrink-0 inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full ${
              isResolved
                ? 'bg-stellar-blue/15 text-stellar-purple'
                : isExpired
                  ? 'bg-accent/10 text-accent'
                  : 'bg-yes-green-dim text-yes-green'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              isResolved ? 'bg-stellar-purple' : isExpired ? 'bg-accent' : 'bg-yes-green'
            }`} />
            {isResolved
              ? `Resolved: ${market.status.values?.[0] ?? ''}`
              : isExpired
                ? 'Expired'
                : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs text-text-dim">
          <span>Creator: {market.creator.slice(0, 6)}...{market.creator.slice(-4)}</span>
          <span>Deadline: {deadlineDate.toLocaleString()}</span>
        </div>
      </div>

      {/* Probability + Stats */}
      <div className="bg-surface border border-border rounded-2xl p-7 mb-5">
        {/* Big YES/NO bars */}
        <div className="space-y-3 mb-7">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-black/60 rounded-xl overflow-hidden h-12 flex items-center relative">
              <div
                className="absolute inset-y-0 left-0 bg-yes-green/12 rounded-xl transition-all"
                style={{ width: `${yesPct}%` }}
              />
              <span className="relative text-sm font-medium text-text-secondary pl-4">Yes</span>
              <span className="relative ml-auto text-xl font-bold text-white pr-4">{yesPct}%</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-black/60 rounded-xl overflow-hidden h-12 flex items-center relative">
              <div
                className="absolute inset-y-0 left-0 bg-no-red/12 rounded-xl transition-all"
                style={{ width: `${noPct}%` }}
              />
              <span className="relative text-sm font-medium text-text-secondary pl-4">No</span>
              <span className="relative ml-auto text-xl font-bold text-white pr-4">{noPct}%</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <div className="text-text-dim text-xs mb-1.5">Pool</div>
            <div className="text-white font-bold text-lg">{stroopsToXlm(market.pool_balance)} XLM</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <div className="text-text-dim text-xs mb-1.5">Yes Volume</div>
            <div className="text-yes-green font-bold text-lg">{stroopsToXlm(market.total_yes)} XLM</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center">
            <div className="text-text-dim text-xs mb-1.5">No Volume</div>
            <div className="text-no-red font-bold text-lg">{stroopsToXlm(market.total_no)} XLM</div>
          </div>
        </div>
      </div>

      {/* Buy Section */}
      {canBuy && (
        <div className="bg-surface border border-border rounded-2xl p-7 mb-5">
          <h2 className="text-white font-bold text-lg mb-5">Place a Bet</h2>
          {!connected ? (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 text-accent text-sm text-center">
              Connect your wallet to place bets
            </div>
          ) : (
            <div>
              <div className="mb-5">
                <label className="block text-xs text-text-dim mb-2.5 uppercase tracking-wider font-medium">Amount (XLM)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10"
                  min="0.0000001"
                  step="any"
                  className="w-full bg-black/60 border border-border-light rounded-xl px-5 py-3.5 text-white text-lg placeholder-text-dim focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleBuy('Yes')}
                  disabled={submitting || !amount}
                  className="bg-yes-green-dim hover:bg-yes-green/25 text-yes-green border border-yes-green/20 py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
                >
                  {submitting ? 'Processing...' : 'Buy YES'}
                </button>
                <button
                  onClick={() => handleBuy('No')}
                  disabled={submitting || !amount}
                  className="bg-no-red-dim hover:bg-no-red/25 text-no-red border border-no-red/20 py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
                >
                  {submitting ? 'Processing...' : 'Buy NO'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Position */}
      {position && (position.yes_shares > 0n || position.no_shares > 0n) && (
        <div className="bg-surface border border-border rounded-2xl p-7 mb-5">
          <h2 className="text-white font-bold text-lg mb-5">Your Position</h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-black/40 rounded-xl p-5 border border-yes-green/10">
              <div className="text-xs text-text-dim mb-2">Yes Shares</div>
              <div className="text-yes-green font-bold text-xl">
                {stroopsToXlm(position.yes_shares)} XLM
              </div>
              {isResolved && (
                <div className="text-xs text-text-dim mt-2">
                  Payout: {potentialPayout('Yes')} XLM
                </div>
              )}
            </div>
            <div className="bg-black/40 rounded-xl p-5 border border-no-red/10">
              <div className="text-xs text-text-dim mb-2">No Shares</div>
              <div className="text-no-red font-bold text-xl">
                {stroopsToXlm(position.no_shares)} XLM
              </div>
              {isResolved && (
                <div className="text-xs text-text-dim mt-2">
                  Payout: {potentialPayout('No')} XLM
                </div>
              )}
            </div>
          </div>

          {isResolved && !position.claimed && (
            <button
              onClick={handleClaim}
              disabled={submitting}
              className="w-full bg-accent hover:bg-accent-hover text-black py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Claiming...' : 'Claim Winnings'}
            </button>
          )}
          {position.claimed && (
            <div className="text-center text-sm text-text-dim bg-black/40 rounded-xl py-4">
              Winnings already claimed
            </div>
          )}
        </div>
      )}
    </div>
  )
}
