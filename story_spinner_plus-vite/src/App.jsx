import { useState, useEffect, useCallback } from 'react'
import TopAppBar from './components/TopAppBar'
import ModeToggle from './components/ModeToggle'
import SpinnerWheel from './components/SpinnerWheel'
import OutputOverlay from './components/OutputOverlay'
import ShuffleDrawer from './components/ShuffleDrawer'
import LibraryView from './components/LibraryView'
import AuthModal from './components/AuthModal'
import Toast from './components/Toast'
import { getMatrix, generateSpin, getMe, getWheelSet } from './api/client'

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
  const [customWedgesByMode, setCustomWedgesByMode] = useState({})  // per-mode; persists across mode switches
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

  const customWedges = customWedgesByMode[mode] ?? []

  // Load default matrix + update CSS vars on mode change
  useEffect(() => {
    applyModeTokens(mode)
    getMatrix(mode)
      .then(({ data }) => setWedges(data.wedges))
      .catch(console.error)
  }, [mode])

  // On first load, seed the character wheel with random story elements so every
  // visit feels different. Runs once only — mode switches use the standard matrix.
  useEffect(() => {
    getWheelSet('character')
      .then(({ data }) => {
        if (Array.isArray(data.wedges)) {
          setCustomWedgesByMode(prev => ({ ...prev, character: data.wedges }))
        }
      })
      .catch(console.error)
  }, [])

  // The active wedge set shown on the wheel
  const activeWedges = customWedges.length === 8 ? customWedges : wedges

  // Drag-to-spin: called by SpinnerWheel with angular velocity (deg/sec) and the
  // wheel's current visual angle when the user releases.
  const handleDragRelease = useCallback((velocity, visualAngle) => {
    if (isSpinning) return

    const absVel = Math.abs(velocity)
    if (absVel < 50) return // too slow — SpinnerWheel already snapped back

    setIsSpinning(true)
    setShowOverlay(false)
    setIsFlipped(false)

    // Physics: coasting distance = v² / (2a)
    const coastDeg = (absVel * absVel) / (2 * 300)
    const extraDeg = Math.max(2 * 360, Math.min(10 * 360, coastDeg))

    // Convert visual SVG angle back to spinRotation space (undo the -22.5 offset)
    const currentRot = visualAngle + 22.5
    const rawTarget = currentRot + extraDeg

    // Which segment lands under the pointer?
    // When spinRotation = R, the segment at top is (8 - round(R/45)%8) % 8
    const fullSegs = Math.round(rawTarget / 45)
    const idx = ((8 - (fullSegs % 8)) + 8) % 8

    // Snap rawTarget to the exact boundary for that segment
    const targetMod = (360 - idx * 45) % 360
    const currentMod = ((rawTarget % 360) + 360) % 360
    let delta = targetMod - currentMod
    while (delta > 22.5) delta -= 360
    while (delta < -22.5) delta += 360
    const newRotation = rawTarget + delta

    setSpinRotation(newRotation)

    setTimeout(() => {
      if (customWedges.length === 8) {
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
          .catch((err) => {
            console.error(err)
            setToastMsg('Could not load result — check your connection and try again.')
          })
          .finally(() => setIsSpinning(false))
      }
    }, 4100)
  }, [isSpinning, mode, customWedges])

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
          .catch((err) => {
            console.error(err)
            setToastMsg('Could not load result — check your connection and try again.')
          })
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
          className="text-2xl md:text-3xl font-bold text-center px-4 mb-1 mode-transition"
          style={{ fontFamily: "'Noto Serif', serif", color: 'var(--color-tertiary)' }}
        >
          {MODE_PROMPTS[mode]}
        </p>

        <SpinnerWheel
          wedges={activeWedges}
          rotation={spinRotation}
          isSpinning={isSpinning}
          onDragRelease={handleDragRelease}
        />

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`spin-btn px-12 py-4 md:px-14 md:py-4 rounded-full font-bold tracking-wider text-base md:text-lg uppercase active:scale-95 transition-transform${isSpinning ? ' opacity-60' : ''}`}
            style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.12em' }}
          >
            {isSpinning ? 'Spinning…' : 'SPIN!'}
          </button>
          <button
            onClick={() => setShowShuffle(true)}
            disabled={isSpinning}
            title="Shuffle story elements"
            className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface mode-transition disabled:opacity-40 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined md:text-2xl" style={{ fontSize: 22 }}>shuffle</span>
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
        onWheelUpdate={(ws) => setCustomWedgesByMode(prev => ({ ...prev, [mode]: Array.isArray(ws) ? ws : [] }))}
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
