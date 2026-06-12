import { useState, useRef, useEffect, useCallback } from 'react'

const toRad = (deg) => (deg * Math.PI) / 180
const R = 50
const CX = 50
const CY = 50

function segmentPath(startDeg, endDeg) {
  const x1 = CX + R * Math.sin(toRad(startDeg))
  const y1 = CY - R * Math.cos(toRad(startDeg))
  const x2 = CX + R * Math.sin(toRad(endDeg))
  const y2 = CY - R * Math.cos(toRad(endDeg))
  return `M${CX},${CY} L${x1.toFixed(3)},${y1.toFixed(3)} A${R},${R} 0 0,1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`
}

function labelProps(index) {
  const mid = index * 45 + 22.5
  const r = 33
  const x = CX + r * Math.sin(toRad(mid))
  const y = CY - r * Math.cos(toRad(mid))
  const rotation = mid <= 180 ? mid - 90 : mid + 90
  return { x, y, rotation }
}

function splitLabel(label) {
  const words = label.split(' ')
  if (words.length <= 1) return [label]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function getPointerAngle(event, element) {
  if (!element) return 0
  const rect = element.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const src = event.touches?.[0] || event.changedTouches?.[0] || event
  return Math.atan2(src.clientY - cy, src.clientX - cx) * (180 / Math.PI)
}

const FALLBACK_COLORS = ['#e7c365', '#c9a74d']
const FALLBACK_LABELS = [
  'Rogue', 'Cyber-Mystic', 'Scholar', 'Corp Shadow',
  'Guardian', 'Corrupted AI', 'Exile', 'Catalyst',
]

const IDLE_DEG_PER_SEC = 12

const IDLE_RESUME_MS = 20_000

export default function SpinnerWheel({ wedges = [], rotation, isSpinning, onDragRelease, wrapStyle }) {
  const svgRef = useRef(null)
  const idleAngleRef = useRef(0)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const everSpunRef = useRef(false)
  const idleTimerRef = useRef(null)
  const [idleActive, setIdleActive] = useState(true)

  // Drag state — all refs so no re-renders mid-drag
  const isDraggingRef = useRef(false)
  const dragBaseAngleRef = useRef(0)
  const dragPrevPointerRef = useRef(0)
  const dragCumDeltaRef = useRef(0)
  const dragCurrentAngleRef = useRef(0)
  const velBufferRef = useRef([]) // [{angle, time}]

  // Stable prop refs for document-level listeners (avoid stale closures)
  const onDragReleaseRef = useRef(onDragRelease)
  useEffect(() => { onDragReleaseRef.current = onDragRelease }, [onDragRelease])
  const isSpinningRef = useRef(isSpinning)
  useEffect(() => { isSpinningRef.current = isSpinning }, [isSpinning])
  const rotationRef = useRef(rotation)
  useEffect(() => { rotationRef.current = rotation }, [rotation])

  // Manage idle active state: disable on spin/drag, re-enable after 20 s of inactivity
  useEffect(() => {
    if (isSpinning) {
      everSpunRef.current = true
      setIdleActive(false)
      clearTimeout(idleTimerRef.current)
    } else if (everSpunRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        idleAngleRef.current = 0
        setIdleActive(true)
      }, IDLE_RESUME_MS)
    }
    return () => clearTimeout(idleTimerRef.current)
  }, [isSpinning])

  // Idle animation — runs while idleActive and not spinning
  useEffect(() => {
    if (isSpinning || !idleActive) {
      cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = null
      return
    }

    idleAngleRef.current = 0
    const base = -22.5 + rotation
    const tick = (ts) => {
      if (lastTimeRef.current !== null) {
        idleAngleRef.current += IDLE_DEG_PER_SEC * (ts - lastTimeRef.current) / 1000
      }
      lastTimeRef.current = ts
      if (svgRef.current) {
        svgRef.current.style.transform = `rotate(${base + idleAngleRef.current}deg)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = null
    }
  }, [isSpinning, idleActive, rotation])

  // Programmatic spin — CSS transition handles the animation
  useEffect(() => {
    if (!isSpinning) return
    if (svgRef.current) {
      svgRef.current.style.transform = `rotate(${-22.5 + rotation}deg)`
    }
  }, [rotation, isSpinning])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragMove = useCallback((event) => {
    if (!isDraggingRef.current) return
    if (event.cancelable) event.preventDefault()

    const ptr = getPointerAngle(event, svgRef.current)
    let delta = ptr - dragPrevPointerRef.current
    // Normalise to [-180, 180] to handle the ±180 wrap
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360

    dragCumDeltaRef.current += delta
    dragPrevPointerRef.current = ptr

    const newAngle = dragBaseAngleRef.current + dragCumDeltaRef.current
    dragCurrentAngleRef.current = newAngle
    if (svgRef.current) svgRef.current.style.transform = `rotate(${newAngle}deg)`

    const now = performance.now()
    velBufferRef.current.push({ angle: newAngle, time: now })
    // Keep only the last 150 ms of samples
    velBufferRef.current = velBufferRef.current.filter(b => now - b.time < 150)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)

    if (!svgRef.current) return

    const buf = velBufferRef.current
    const velocity = buf.length >= 2
      ? (buf[buf.length - 1].angle - buf[0].angle) /
        ((buf[buf.length - 1].time - buf[0].time) / 1000)
      : 0

    const MIN_VEL = 50 // deg/sec threshold to trigger a spin

    if (Math.abs(velocity) < MIN_VEL) {
      // Spring back to last authoritative rotation
      svgRef.current.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
      svgRef.current.style.transform = `rotate(${-22.5 + rotationRef.current}deg)`
      setTimeout(() => {
        if (svgRef.current) svgRef.current.style.transition = ''
      }, 500)
      return
    }

    // Restore the standard 4 s CSS transition, then hand off to App
    svgRef.current.style.transition = ''
    onDragReleaseRef.current?.(velocity, dragCurrentAngleRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDragMove])

  // Clean up document listeners if the component unmounts mid-drag
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchend', handleDragEnd)
    }
  }, [handleDragMove, handleDragEnd])

  function handleDragStart(event) {
    if (isSpinningRef.current || !onDragReleaseRef.current) return
    if (event.cancelable) event.preventDefault()

    // Kill idle animation; schedule resume via the isSpinning effect once drag completes
    cancelAnimationFrame(rafRef.current)
    lastTimeRef.current = null
    everSpunRef.current = true
    setIdleActive(false)
    clearTimeout(idleTimerRef.current)

    isDraggingRef.current = true

    // Read the wheel's current displayed angle straight from the DOM
    const xform = svgRef.current?.style.transform || ''
    const match = xform.match(/rotate\(([^d]+)deg\)/)
    const currentAngle = match ? parseFloat(match[1]) : (-22.5 + rotationRef.current)

    dragBaseAngleRef.current = currentAngle
    dragCurrentAngleRef.current = currentAngle
    dragCumDeltaRef.current = 0
    dragPrevPointerRef.current = getPointerAngle(event, svgRef.current)
    velBufferRef.current = [{ angle: currentAngle, time: performance.now() }]

    if (svgRef.current) svgRef.current.style.transition = 'none'

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('touchend', handleDragEnd)
  }

  const segments = wedges.length === 8 ? wedges : FALLBACK_LABELS.map((label, i) => ({
    id: i,
    label,
    color: FALLBACK_COLORS[i % 2],
  }))

  return (
    <div className="relative flex justify-center items-center py-2">
      <div className="wheel-pointer absolute top-2 left-1/2 -translate-x-1/2 z-10" />
      <div
        className="spinner-wheel-wrap relative"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{ ...wrapStyle, ...(isSpinning ? { cursor: 'default' } : {}) }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="wheel-spin w-full h-full"
          style={{ transform: `rotate(-22.5deg)` }}
        >
          {segments.map((seg, i) => {
            const lp = labelProps(i)
            const lines = splitLabel(seg.label)
            const lh = 4.8
            return (
              <g key={seg.id ?? i}>
                <path
                  className="wheel-segment"
                  d={segmentPath(i * 45, (i + 1) * 45)}
                  style={{
                    fill: i % 2 === 0
                      ? 'var(--color-tertiary)'
                      : 'var(--color-tertiary-container)',
                  }}
                  stroke="#141218"
                  strokeWidth="0.4"
                />
                <text
                  textAnchor="middle"
                  fontSize="4"
                  fontFamily="'Hanken Grotesk', sans-serif"
                  fontWeight="700"
                  fill="#141218"
                  transform={`rotate(${lp.rotation}, ${lp.x}, ${lp.y})`}
                >
                  {lines.length === 1 ? (
                    <tspan x={lp.x} y={lp.y} dominantBaseline="middle">
                      {lines[0]}
                    </tspan>
                  ) : (
                    <>
                      <tspan x={lp.x} y={lp.y - lh / 2} dominantBaseline="middle">
                        {lines[0]}
                      </tspan>
                      <tspan x={lp.x} y={lp.y + lh / 2} dominantBaseline="middle">
                        {lines[1]}
                      </tspan>
                    </>
                  )}
                </text>
              </g>
            )
          })}
          <circle cx="50" cy="50" r="6" fill="#141218" />
          <circle cx="50" cy="50" r="3.5" fill="var(--color-tertiary)" />
        </svg>
      </div>
    </div>
  )
}
