import { useState } from 'react'
import { builderToText } from '../lib/spinElements'

const NAME_PLACEHOLDERS = {
  character: 'Character name…',
  story: 'Story name…',
  music: 'Song name…',
}

export default function BuilderPanel({
  builder, onRemove, onClear, mode,
  notes = {}, onNoteClick,
  draftName = '', onDraftNameChange,
  onViewStory,
}) {
  const [expanded, setExpanded] = useState(true)
  const entries = Object.entries(builder)
  const isEmpty = entries.length === 0

  const handleCopy = () => {
    navigator.clipboard.writeText(builderToText(builder)).catch(console.error)
  }

  return (
    <div className="border-t border-outline-variant bg-surface-container-high">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary mode-transition" style={{ fontSize: 18 }}>
            construction
          </span>
          <span
            className="text-on-surface font-semibold text-sm"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Builder
          </span>
          {!isEmpty && (
            <span className="text-xs text-on-surface-variant">
              · {entries.length} element{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
          {expanded ? 'expand_more' : 'expand_less'}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Draft name field */}
          <input
            type="text"
            value={draftName}
            onChange={e => onDraftNameChange?.(e.target.value)}
            placeholder={NAME_PLACEHOLDERS[mode] || 'Name…'}
            className="w-full bg-surface-container rounded-xl px-3 py-2 text-on-surface text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-tertiary placeholder:text-on-surface-variant/50 mb-3 mode-transition"
            style={{ fontFamily: "'Noto Serif', serif" }}
            maxLength={200}
          />

          {isEmpty ? (
            <p className="text-on-surface-variant text-sm text-center py-4">
              Tap <span className="font-bold text-tertiary">+ Add</span> on any element below to start building.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-3">
                {entries.map(([slot, value]) => (
                  <div key={slot} className="flex flex-col bg-surface-container rounded-xl px-3 py-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-on-surface-variant uppercase tracking-wider"
                          style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.08em' }}>
                          {slot}
                        </p>
                        <p className="text-on-surface text-sm leading-snug mt-0.5">{value}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => onNoteClick?.(slot, value)}
                          title={notes[slot] ? 'Edit note' : 'Add note'}
                          className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                            notes[slot]
                              ? 'text-tertiary hover:bg-tertiary/10 mode-transition'
                              : 'text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                            {notes[slot] ? 'sticky_note_2' : 'note_add'}
                          </span>
                        </button>
                        <button
                          onClick={() => onRemove(slot)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                          aria-label={`Remove ${slot}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                        </button>
                      </div>
                    </div>
                    {notes[slot] && (
                      <p className="text-on-surface-variant text-xs italic mt-1.5 pl-0 truncate border-l-2 border-tertiary pl-2 mode-transition">
                        {notes[slot]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-tertiary text-on-tertiary text-sm font-bold mode-transition hover:opacity-90"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                  Copy All
                </button>
                {onViewStory && (
                  <button
                    onClick={onViewStory}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-outline-variant/60 text-on-surface text-sm font-bold hover:bg-outline-variant transition-colors"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_stories</span>
                    View Story
                  </button>
                )}
                <button
                  onClick={onClear}
                  className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high mode-transition"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
