import { useRef, useEffect } from 'react'

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

// Position label at ~65% radius; rotate radially like wheelofnames.com
// For left-side segments (mid > 180), flip 180° so text is never upside-down
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

const FALLBACK_COLORS = ['#e7c365', '#c9a74d']
const FALLBACK_LABELS = [
  'Rogue', 'Cyber-Mystic', 'Scholar', 'Corp Shadow',
  'Guardian', 'Corrupted AI', 'Exile', 'Catalyst',
]

const IDLE_DEG_PER_SEC = 12

export default function SpinnerWheel({ wedges, rotation, isSpinning }) {
  const svgRef = useRef(null)
  const idleAngleRef = useRef(0)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)

  // Idle animation — runs when not spinning
  useEffect(() => {
    if (isSpinning) {
      cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = null
      // Actual spin transform is set below via the rotation effect
      return
    }

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
  }, [isSpinning, rotation])

  // When spinning, snap to the target rotation (CSS transition handles the animation)
  useEffect(() => {
    if (!isSpinning) return
    if (svgRef.current) {
      svgRef.current.style.transform = `rotate(${-22.5 + rotation}deg)`
    }
  }, [rotation, isSpinning])

  const segments = wedges.length === 8 ? wedges : FALLBACK_LABELS.map((label, i) => ({
    id: i,
    label,
    color: FALLBACK_COLORS[i % 2],
  }))

  return (
    <div className="relative flex justify-center items-center py-2">
      {/* Pointer triangle */}
      <div className="wheel-pointer absolute top-2 left-1/2 -translate-x-1/2 z-10" />

      {/* Wheel */}
      <div className="spinner-wheel-wrap relative">
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
                  d={segmentPath(i * 45, (i + 1) * 45)}
                  fill={seg.color}
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
          {/* Center hub */}
          <circle cx="50" cy="50" r="6" fill="#141218" />
          <circle cx="50" cy="50" r="3.5" fill="var(--color-tertiary)" />
        </svg>
      </div>
    </div>
  )
}
