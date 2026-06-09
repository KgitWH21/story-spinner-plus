import { useState } from 'react'
import { login, register } from '../api/client'

export default function AuthModal({ onSuccess, onClose }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const call = tab === 'login' ? login(email, password) : register(email, password)
      const { data } = await call
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user_email', email)
      onSuccess(email)
    } catch (err) {
      const d = err.response?.data
      const msg = d?.error || d?.email?.[0] || d?.password?.[0] || d?.detail
        || (tab === 'login' ? 'Login failed' : 'Registration failed')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative bg-surface-container-high rounded-2xl border border-outline-variant shadow-2xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
        </button>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 rounded-xl overflow-hidden border border-outline-variant">
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'bg-tertiary text-on-tertiary mode-transition'
                  : 'bg-transparent text-on-surface-variant hover:text-on-surface'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-on-surface-variant uppercase tracking-widest mb-1.5"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-tertiary mode-transition"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant uppercase tracking-widest mb-1.5"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-tertiary mode-transition"
              placeholder="8+ characters"
            />
          </div>

          {error && <p className="text-error text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-tertiary text-on-tertiary text-sm font-bold uppercase tracking-wider mode-transition hover:opacity-90 disabled:opacity-50 mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.08em' }}
          >
            {loading ? 'Working…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
