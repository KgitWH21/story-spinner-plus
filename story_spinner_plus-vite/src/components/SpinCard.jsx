import { useState } from 'react'
import { extractElements, TYPE_LABELS, TYPE_ICONS } from '../lib/spinElements'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SpinCard({ spin, onAdd, onDelete, builderSlots, notes = {}, onNoteClick }) {
  const [expanded, setExpanded] = useState(false)
  const elements = extractElements(spin)
  const headline = spin.payload.archetype || '—'
  const isElement = !!spin.payload.is_element

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant overflow-hidden">
      {/* Card header — always visible */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v) }}
        className="w-full flex items-start justify-between px-4 py-3 text-left cursor-pointer select-none"
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
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(spin.id) }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
            aria-label="Delete spin"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
          </button>
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

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
                <div className="flex items-center gap-1 mt-1 flex-shrink-0">
                  {onNoteClick && (
                    <button
                      onClick={() => onNoteClick(slot, value)}
                      title={notes[slot] ? 'Edit note' : 'Add note'}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                        notes[slot]
                          ? 'text-tertiary hover:bg-tertiary/10 mode-transition'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {notes[slot] ? 'sticky_note_2' : 'note_add'}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => onAdd(slot, value)}
                    className={`
                      flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      transition-colors
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
