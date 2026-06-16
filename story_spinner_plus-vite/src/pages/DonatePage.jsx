import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { processDonation } from '../api/client'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const PRESET_AMOUNTS = [
  { label: '$5', cents: 500 },
  { label: '$10', cents: 1000 },
  { label: '$25', cents: 2500 },
  { label: '$50', cents: 5000 },
]

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()

  const [selectedAmount, setSelectedAmount] = useState(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'success' | 'error' | 'network-error'
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCustomAmountChange = (e) => {
    const value = e.target.value
    setCustomAmount(value)
    if (value) {
      const cents = Math.round(parseFloat(value) * 100)
      if (!isNaN(cents) && cents > 0) {
        setSelectedAmount(cents)
      }
    }
  }

  const handlePresetClick = (cents) => {
    setSelectedAmount(cents)
    setCustomAmount('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsLoading(true)
    try {
      const { data } = await processDonation(selectedAmount)
      const clientSecret = data.client_secret
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      })
      if (result.error) {
        setStatus('error')
        setErrorMsg(result.error.message)
      } else if (result.paymentIntent?.status === 'succeeded') {
        setStatus('success')
      }
    } catch {
      setStatus('network-error')
    } finally {
      setIsLoading(false)
    }
  }

  const resetState = () => {
    setStatus('idle')
    setErrorMsg('')
    setSelectedAmount(1000)
    setCustomAmount('')
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-5xl">🎉</div>
        <p className="text-lg text-center text-green-400 font-semibold">
          Thank you for your donation of ${(selectedAmount / 100).toFixed(2)}! Story Spinner Plus thanks you.
        </p>
        <button
          onClick={resetState}
          className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-900 font-bold transition-colors"
        >
          Donate Again
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Preset amount buttons */}
      <div>
        <p className="text-sm uppercase tracking-widest text-neutral-400 mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          Select Amount
        </p>
        <div className="flex flex-wrap gap-3">
          {PRESET_AMOUNTS.map(({ label, cents }) => (
            <button
              key={cents}
              type="button"
              onClick={() => handlePresetClick(cents)}
              className={`px-5 py-2 rounded-full font-semibold border transition-colors ${
                selectedAmount === cents && !customAmount
                  ? 'bg-amber-500 border-amber-500 text-neutral-900'
                  : 'bg-neutral-800 border-neutral-600 text-white hover:border-amber-500 hover:text-amber-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount input */}
      <div>
        <input
          type="number"
          min={1}
          max={10000}
          placeholder="Custom amount (USD)"
          value={customAmount}
          onChange={handleCustomAmountChange}
          className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Stripe card element */}
      <div>
        <p className="text-sm uppercase tracking-widest text-neutral-400 mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          Card Details
        </p>
        <div
          data-testid="stripe-card-element"
          className="px-4 py-4 rounded-lg bg-neutral-800 border border-neutral-600"
        >
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': { color: '#737373' },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Error messages */}
      {status === 'error' && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
      {status === 'network-error' && (
        <div className="flex flex-col gap-3">
          <p className="text-red-400 text-sm">Something went wrong. Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="self-start px-5 py-2 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-4 rounded-xl font-bold text-lg tracking-wider uppercase transition-colors ${
          isLoading
            ? 'bg-amber-700 opacity-60 cursor-not-allowed text-neutral-900'
            : 'bg-amber-500 hover:bg-amber-400 text-neutral-900'
        }`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {isLoading ? 'Processing...' : 'Donate'}
      </button>
    </form>
  )
}

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors text-sm"
        >
          <span>&#8592;</span> Back to Spinner
        </button>

        {/* Heading */}
        <h1
          data-testid="donate-heading"
          className="text-3xl font-bold mb-3"
          style={{ fontFamily: "'Noto Serif', serif" }}
        >
          Support Story Spinner Plus
        </h1>

        {/* Description */}
        <p className="text-neutral-400 mb-8 leading-relaxed">
          Help keep the story spinning. Your one-time donation supports new features and keeps the app free.
        </p>

        {/* Checkout form wrapped in Stripe Elements */}
        <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 shadow-xl">
          <Elements stripe={stripePromise}>
            <CheckoutForm />
          </Elements>
        </div>
      </div>
    </div>
  )
}
