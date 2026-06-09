import { useState, useEffect, useCallback } from 'react'
import TopAppBar from './components/TopAppBar'
import ModeToggle from './components/ModeToggle'
import SpinnerWheel from './components/SpinnerWheel'
import OutputOverlay from './components/OutputOverlay'
import ShuffleDrawer from './components/ShuffleDrawer'
import LibraryView from './components/LibraryView'
import AuthModal from './components/AuthModal'
import Toast from './components/Toast'
import { getMatrix, generateSpin, getMe } from './api/client'

const MODE_PROMPTS = {
  character: 'Spin up a character!',
  story: 'Spin a story!',
  music: 'Spin a song!',
}

const MODE_TOKENS = {
  character: {
    '--color-tertiary': '#e7c365',
    '--color-tertiary-container': '#c9a74d',
    '--color-on-tertiary': '#3e2e00',
    '--color-pointer': '#503d00',   // deep amber — visible against both golden wheel segments
  },
  story: {
    '--color-tertiary': '#52b788',
    '--color-tertiary-container': '#40916c',
    '--color-on-tertiary': '#1a3329',
    '--color-pointer': '#0f3320',
  },
  music: {
    '--color-tertiary': '#c77dff',
    '--color-tertiary-container': '#9d4edd',
    '--color-on-tertiary': '#2d0050',
    '--color-pointer': '#1e0042',
  },
}

function applyModeTokens(mode) {
  const tokens = MODE_TOKENS[mode]
  if (!tokens) return
  const root = document.documentElement
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v))
}

const CATEGORY_LABELS = {
  'plot.archetypes': 'Plot Archetype',
  'plot.genres': 'Genre',
  'plot.perspectives': 'Perspective',
  'plot.social_issues': 'Social Issue',
  'plot.universal_human_questions': 'Core Question',
  'character.descriptors': 'Character Trait',
  'character.theories_of_control': 'Control Theory',
  'character.relationship': 'Relationship',
}

export default function App() {
  const [mode, setMode] = useState('character')
  const [wedges, setWedges] = useState([])
  const [customWedges, setCustomWedges] = useState([])   // set by Reshuffle; overrides wheel
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinRotation, setSpinRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [pendingSpin, setPendingSpin] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access_token'))
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email') || '')

  // If logged in but no cached email (pre-existing session), fetch from API
  useEffect(() => {
    if (isLoggedIn && !localStorage.getItem('user_email')) {
      getMe()
        .then(({ data }) => {
          localStorage.setItem('user_email', data.email)
          setUserEmail(data.email)
        })
        .catch(console.error)
    }
  }, [])
  const [showShuffle, setShowShuffle] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [view, setView] = useState('spinner') // 'spinner' | 'library'

  // Load default matrix + update CSS vars on mode change; clear custom wedges
  useEffect(() => {
    applyModeTokens(mode)
    setCustomWedges([])
    getMatrix(mode)
      .then(({ data }) => setWedges(data.wedges))
      .catch(console.error)
  }, [mode])

  // The active wedge set shown on the wheel
  const activeWedges = customWedges.length === 8 ? customWedges : wedges

  const handleSpin = useCallback(() => {
    if (isSpinning) return
    setIsSpinning(true)
    setShowOverlay(false)
    setIsFlipped(false)

    const idx = Math.floor(Math.random() * 8)

    const targetMod = (360 - idx * 45) % 360
    const currentMod = ((spinRotation % 360) + 360) % 360
    let delta = targetMod - currentMod
    if (delta <= 0) delta += 360
    const newRotation = spinRotation + 4 * 360 + delta
    setSpinRotation(newRotation)

    setTimeout(() => {
      if (customWedges.length === 8) {
        // Custom / shuffled wheel — use the element label directly, no template expansion
        const wedge = customWedges[idx]
        const spinResult = {
          is_element: true,
          archetype: wedge.full_label || wedge.label,
          category: CATEGORY_LABELS[wedge.category] || wedge.category,
          statement: wedge.metadata?.statement || null,
        }
        setResult(spinResult)
        setPendingSpin({ mode, result: spinResult })
        setShowOverlay(true)
        setIsSpinning(false)
      } else {
        generateSpin(mode, idx)
          .then(({ data }) => {
            setResult(data.result)
            setPendingSpin({ mode, result: data.result })
            setShowOverlay(true)
          })
          .catch(console.error)
          .finally(() => setIsSpinning(false))
      }
    }, 4100)
  }, [isSpinning, spinRotation, mode, customWedges])

  const handleModeChange = (newMode) => {
    if (isSpinning) return
    setMode(newMode)
    setShowOverlay(false)
    setResult(null)
  }

  const handleAuthSuccess = (authData) => {
    setIsLoggedIn(true)
    setUserEmail(authData?.email || localStorage.getItem('user_email') || '')
    setIsFlipped(false)
    setPendingSpin(null)
  }

  const handleAuthModalSuccess = (email) => {
    setIsLoggedIn(true)
    setUserEmail(email)
    setShowAuthModal(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    setIsLoggedIn(false)
    setUserEmail('')
  }

  if (view === 'library') {
    return (
      <LibraryView
        onBack={() => setView('spinner')}
        onSpinNow={(type) => { setMode(type); setView('spinner') }}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-background text-on-surface flex flex-col"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <TopAppBar
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onLibrary={() => setView('library')}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
      />

      <main className="flex flex-col items-center flex-1 pb-4">
        <ModeToggle mode={mode} onModeChange={handleModeChange} />

        <p
          className="text-xl md:text-3xl font-bold text-center px-4 mb-1 mode-transition"
          style={{ fontFamily: "'Noto Serif', serif", color: 'var(--color-tertiary)' }}
        >
          {MODE_PROMPTS[mode]}
        </p>

        <SpinnerWheel wedges={activeWedges} rotation={spinRotation} isSpinning={isSpinning} />

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="px-10 py-3 md:px-14 md:py-4 rounded-full bg-tertiary text-on-tertiary font-bold tracking-wider text-sm md:text-base uppercase mode-transition hover:opacity-90 disabled:opacity-50 active:scale-95 transition-transform"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.12em' }}
          >
            {isSpinning ? 'Spinning…' : 'SPIN!'}
          </button>
          <button
            onClick={() => setShowShuffle(true)}
            disabled={isSpinning}
            title="Shuffle story elements"
            className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface mode-transition disabled:opacity-40 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined md:text-2xl" style={{ fontSize: 20 }}>shuffle</span>
          </button>
        </div>
      </main>

      <OutputOverlay
        show={showOverlay}
        result={result}
        mode={mode}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(true)}
        onUnflip={() => setIsFlipped(false)}
        onClose={() => setShowOverlay(false)}
        onSpinAgain={handleSpin}
        onAuthSuccess={handleAuthSuccess}
        onSaveSuccess={(msg) => setToastMsg(msg)}
        pendingSpin={pendingSpin}
      />

      <ShuffleDrawer
        isOpen={showShuffle}
        onClose={() => setShowShuffle(false)}
        mode={mode}
        onWheelUpdate={setCustomWedges}
      />

      <Toast message={toastMsg} onDone={() => setToastMsg('')} />

      {showAuthModal && (
        <AuthModal
          onSuccess={handleAuthModalSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}
