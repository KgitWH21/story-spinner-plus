import { useState } from 'react'
import { register } from '../api/client'

export default function RegisterForm({ onSuccess, onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await register(email, password)
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user_email', data.email || email)
      onSuccess(data)
    } catch (err) {
      const msg = err.response?.data?.email?.[0]
        || err.response?.data?.password?.[0]
        || err.response?.data?.detail
        || 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-5 flex flex-col h-full">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-on-surface mb-1" style={{ fontFamily: "'Noto Serif', serif" }}>
          Save your spin
        </h2>
        <p className="text-sm text-on-surface-variant">
          Create a free account to build your story library.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
        <div>
          <label className="block text-xs text-on-surface-variant uppercase tracking-widest mb-1"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-tertiary"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-xs text-on-surface-variant uppercase tracking-widest mb-1"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-tertiary"
            placeholder="8+ characters"
          />
        </div>

        {error && (
          <p className="text-error text-xs">{error}</p>
        )}

        <div className="flex gap-2 mt-auto pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg bg-tertiary text-on-tertiary text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
