import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Market</h1>

      {!connected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-yellow-400 text-sm">
          Connect your wallet to create a market.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will BTC exceed $100k by June 2026?"
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-stellar-blue"
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {question.length}/200 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deadline
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-stellar-blue"
          />
          <p className="text-xs text-gray-500 mt-1">
            After this time, no more bets. Admin can then resolve the market.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !connected}
          className="w-full bg-stellar-blue hover:bg-stellar-purple text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Market'}
        </button>
      </form>
    </div>
  )
}
