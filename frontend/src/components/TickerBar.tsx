import { useEffect, useState } from 'react'
import { useContract } from '../hooks/useContract'
import { stroopsToXlm } from '../lib/stellar'

interface TickerItem {
  id: number
  question: string
  yesPercent: number
  volume: string
}

export function TickerBar() {
  const { getMarketCount, getMarket } = useContract()
  const [items, setItems] = useState<TickerItem[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const count = await getMarketCount()
        const results: TickerItem[] = []
        for (let i = 0; i < Math.min(count, 10); i++) {
          try {
            const m = await getMarket(i)
            const total = m.total_yes + m.total_no
            const yesPct = total > 0n ? Number((m.total_yes * 100n) / total) : 50
            results.push({
              id: i,
              question: m.question.length > 40 ? m.question.slice(0, 40) + '...' : m.question,
              yesPercent: yesPct,
              volume: stroopsToXlm(m.pool_balance),
            })
          } catch {}
        }
        setItems(results)
      } catch {}
    })()
  }, [getMarketCount, getMarket])

  if (items.length === 0) return null

  const doubled = [...items, ...items]

  return (
    <div className="bg-surface/80 border-b border-border overflow-hidden h-9">
      <div className="animate-ticker flex items-center h-full whitespace-nowrap px-4">
        {doubled.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2.5 px-5 text-xs">
            <span className="text-text-secondary">{item.question}</span>
            <span className="text-yes-green font-semibold">YES {item.yesPercent}%</span>
            {Number(item.volume) > 0 && (
              <span className="text-text-dim">Vol: {item.volume} XLM</span>
            )}
            <span className="text-border-light ml-3">|</span>
          </span>
        ))}
      </div>
    </div>
  )
}
