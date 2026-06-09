import { useState } from 'react'
import { extractElements, TYPE_LABELS, TYPE_ICONS } from '../lib/spinElements'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SpinCard({ spin, onAdd, builderSlots }) {
  const [expanded, setExpanded] = useState(false)
  const elements = extractElements(spin)
  const headline = spin.payload.archetype || '—'
  const isElement = !!spin.payload.is_element

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant overflow-hidden">
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start justify-between px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="material-symbols-outlined text-tertiary mode-transition" style={{ fontSize: 14 }}>
              {TYPE_ICONS[spin.spin_type] || 'casino'}
            </span>
            <span className="text-xs text-on-surface-variant uppercase tracking-wider"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.08em' }}>
              {isElement ? (spin.payload.category || TYPE_LABELS[spin.spin_type]) : TYPE_LABELS[spin.spin_type]}
            </span>
          </div>
          <p
            className="text-on-surface font-semibold text-sm leading-snug truncate pr-2"
            style={{ fontFamily: "'Noto Serif', serif" }}
          >
            {headline}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(spin.created_at)}</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-1" style={{ fontSize: 20 }}>
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Expanded element rows */}
      {expanded && (
        <div className="border-t border-outline-variant divide-y divide-outline-variant">
          {elements.map(({ slot, value }) => {
            const alreadyAdded = builderSlots[slot] === value
            return (
              <div key={slot} className="flex items-start gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider"
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.08em' }}>
                    {slot}
                  </p>
                  <p className="text-on-surface text-sm leading-snug mt-0.5">{value}</p>
                </div>
                <button
                  onClick={() => onAdd(slot, value)}
                  className={`
                    flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                    transition-colors mt-1
                    ${alreadyAdded
                      ? 'bg-tertiary/20 text-tertiary cursor-default'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-tertiary hover:text-on-tertiary mode-transition'
                    }
                  `}
                  disabled={alreadyAdded}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                    {alreadyAdded ? 'check' : 'add'}
                  </span>
                  {alreadyAdded ? 'Added' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
