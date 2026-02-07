import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useContract } from '../hooks/useContract'
import toast from 'react-hot-toast'

export function CreateMarket() {
  const { connected } = useWallet()
  const { createMarket } = useContract()
  const navigate = useNavigate()

  const [question, setQuestion] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!question.trim()) {
      toast.error('Enter a question')
      return
    }
    if (!deadline) {
      toast.error('Set a deadline')
      return
    }

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000)
    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      toast.error('Deadline must be in the future')
      return
    }

    setSubmitting(true)
    try {
      toast.loading('Creating market...', { id: 'create' })
      await createMarket(question.trim(), deadlineTimestamp)
      toast.success('Market created!', { id: 'create' })
      navigate('/')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create market',
        { id: 'create' },
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-8">
        <Link to="/" className="text-text-dim hover:text-white transition-colors no-underline">Markets</Link>
        <span className="text-text-dim">/</span>
        <span className="text-text-secondary">Create</span>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">Create Market</h1>
        <p className="text-text-dim text-sm mb-8">Create a binary prediction market for others to bet on.</p>

        {!connected && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-8 text-accent text-sm text-center">
            Connect your wallet to create a market
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs text-text-dim mb-2.5 uppercase tracking-wider font-medium">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will BTC exceed $100k by June 2026?"
              className="w-full bg-black/60 border border-border-light rounded-xl px-5 py-3.5 text-white placeholder-text-dim focus:outline-none focus:border-accent transition-colors"
              maxLength={200}
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-text-dim">{question.length}/200</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-2.5 uppercase tracking-wider font-medium">
              Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-black/60 border border-border-light rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-xs text-text-dim mt-2">
              After this time, betting closes and admin can resolve.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !connected}
            className="w-full bg-accent hover:bg-accent-hover text-black py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 mt-2"
          >
            {submitting ? 'Creating...' : 'Create Market'}
          </button>
        </form>
      </div>
    </div>
  )
}
