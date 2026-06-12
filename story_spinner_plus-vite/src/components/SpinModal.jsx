import { useState, useEffect, useRef, useCallback } from 'react'
import SpinnerWheel from './SpinnerWheel'
import { getWheelSet } from '../api/client'
import { extractElements, CATEGORY_LABELS, TYPE_ICONS, TYPE_LABELS } from '../lib/spinElements'

export default function SpinModal({ mode, builder = {}, onAdd, onClose }) {
  const [wedges, setWedges] = useState([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [locked, setLocked] = useState(false)
  const rotationRef = useRef(0)

  const triggerSpin = useCallback((ws, currentRot) => {
    setIsSpinning(true)
    setResult(null)

    const idx = Math.floor(Math.random() * 8)
    const targetMod = (360 - idx * 45) % 360
    const currentMod = ((currentRot % 360) + 360) % 360
    let delta = targetMod - currentMod
    if (delta <= 0) delta += 360
    const newRot = currentRot + 4 * 360 + delta
    setRotation(newRot)
    rotationRef.current = newRot

    setTimeout(() => {
      const wedge = ws[idx]
      setResult({
        is_element: true,
        archetype: wedge.full_label || wedge.label,
        category: CATEGORY_LABELS[wedge.category] || wedge.category,
        statement: wedge.metadata?.statement || null,
      })
      setIsSpinning(false)
    }, 4100)
  }, [])

  const fetchAndSpin = useCallback((currentRot) => {
    getWheelSet(mode)
      .then(({ data }) => {
        const ws = Array.isArray(data.wedges) ? data.wedges : []
        setWedges(ws)
        triggerSpin(ws, currentRot)
      })
      .catch(console.error)
  }, [mode, triggerSpin])

  const handleSpinAgain = () => {
    if (locked && wedges.length === 8) {
      triggerSpin(wedges, rotationRef.current)
    } else {
      fetchAndSpin(rotationRef.current)
    }
  }

  const wedgesRef = useRef([])
  useEffect(() => { wedgesRef.current = wedges }, [wedges])

  const handleDragRelease = useCallback((velocity, visualAngle) => {
    if (isSpinning) return
    const absVel = Math.abs(velocity)
    if (absVel < 50) return

    const coastDeg = (absVel * absVel) / (2 * 300)
    const extraDeg = Math.max(2 * 360, Math.min(10 * 360, coastDeg))

    const currentRot = visualAngle + 22.5
    const rawTarget = currentRot + extraDeg

    const fullSegs = Math.round(rawTarget / 45)
    const idx = ((8 - (fullSegs % 8)) + 8) % 8

    const targetMod = (360 - idx * 45) % 360
    const currentMod = ((rawTarget % 360) + 360) % 360
    let delta = targetMod - currentMod
    while (delta > 22.5) delta -= 360
    while (delta < -22.5) delta += 360
    const newRotation = rawTarget + delta

    setIsSpinning(true)
    setResult(null)
    setRotation(newRotation)
    rotationRef.current = newRotation

    setTimeout(() => {
      const wedge = wedgesRef.current[idx]
      if (wedge) {
        setResult({
          is_element: true,
          archetype: wedge.full_label || wedge.label,
          category: CATEGORY_LABELS[wedge.category] || wedge.category,
          statement: wedge.metadata?.statement || null,
        })
      }
      setIsSpinning(false)
    }, 4100)
  }, [isSpinning])

  // Auto-spin on open
  useEffect(() => { fetchAndSpin(0) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const elements = result ? extractElements({ spin_type: mode, payload: result }) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card — full-width bottom sheet on mobile, auto-sized centered on desktop */}
      <div className="relative z-10 w-full sm:w-auto sm:min-w-[580px] bg-surface-container rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary mode-transition" style={{ fontSize: 18 }}>
              {TYPE_ICONS[mode]}
            </span>
            <span
              className="font-semibold text-on-surface text-sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Spin {TYPE_LABELS[mode]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Lock toggle — prevents wheel re-randomization on Spin Again */}
            <button
              onClick={() => setLocked(l => !l)}
              title={locked ? 'Wheel locked — same categories each spin' : 'Wheel unlocked — new categories each spin'}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                locked
                  ? 'bg-tertiary text-on-tertiary mode-transition'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {locked ? 'lock' : 'lock_open'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Wheel — natural CSS sizing matches home screen; drag-to-spin enabled */}
        <div className="flex-shrink-0">
          <SpinnerWheel
            wedges={wedges}
            rotation={rotation}
            isSpinning={isSpinning}
            onDragRelease={handleDragRelease}
          />
        </div>

        {/* Result area — scrollable if tall */}
        <div className="px-5 pb-6 flex flex-col gap-3 overflow-y-auto min-h-[140px]">
          {isSpinning && (
            <div className="flex items-center justify-center text-on-surface-variant text-sm py-6">
              Spinning…
            </div>
          )}

          {!isSpinning && result && (
            <>
              <div className="flex flex-col gap-2">
                {elements.map(({ slot, value }) => {
                  const isAdded = builder[slot] === value
                  return (
                    <div
                      key={slot}
                      className="flex items-start gap-3 bg-surface-container-high rounded-xl px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5"
                          style={{ letterSpacing: '0.08em' }}
                        >
                          {slot}
                        </p>
                        <p className="text-on-surface text-sm leading-snug">{value}</p>
                      </div>
                      <button
                        onClick={() => !isAdded && onAdd(slot, value)}
                        disabled={isAdded}
                        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          isAdded
                            ? 'bg-surface-variant text-on-surface-variant cursor-default'
                            : 'bg-tertiary text-on-tertiary hover:opacity-90 mode-transition active:scale-95'
                        }`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {isAdded ? 'check' : 'add'}
                        </span>
                        {isAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={handleSpinAgain}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:brightness-110 transition-all active:scale-95"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                Spin Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
