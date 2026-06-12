import { useState, useRef } from 'react'
import { TYPE_LABELS } from '../lib/spinElements'

const MODE_PLACEHOLDERS = {
  character: 'Character name…',
  story: 'Story name…',
  music: 'Song name…',
}

function exportTxt(name, mode, builder, notes) {
  const lines = []
  lines.push(name || TYPE_LABELS[mode] || 'Draft')
  lines.push('='.repeat((name || TYPE_LABELS[mode] || 'Draft').length))
  lines.push('')
  Object.entries(builder).forEach(([slot, value]) => {
    lines.push(`${slot.toUpperCase()}`)
    lines.push(value)
    if (notes[slot]) {
      lines.push('')
      lines.push(`Note: ${notes[slot]}`)
    }
    lines.push('')
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(name || 'draft').replace(/\s+/g, '_').toLowerCase()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function InlineNameEditor({ value, onChange, mode }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onChange(trimmed)
    else setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        className="bg-surface-container-high border border-tertiary rounded-lg px-3 py-1 text-on-surface font-semibold text-lg focus:outline-none w-52 mode-transition"
        style={{ fontFamily: "'Noto Serif', serif" }}
        maxLength={200}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className="flex items-center gap-2 group text-left"
    >
      <span
        className="font-semibold text-lg text-on-surface group-hover:text-tertiary mode-transition leading-snug"
        style={{ fontFamily: "'Noto Serif', serif" }}
      >
        {value || MODE_PLACEHOLDERS[mode]}
      </span>
      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors" style={{ fontSize: 16 }}>
        edit
      </span>
    </button>
  )
}

export default function ViewStoryPanel({ draftName, onDraftNameChange, builder, notes, mode, onBack }) {
  const entries = Object.entries(builder)

  return (
    <div
      className="flex flex-col h-screen bg-background text-on-surface"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-surface-container border-b border-outline-variant flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5"
            style={{ letterSpacing: '0.08em' }}>
            {TYPE_LABELS[mode]}
          </p>
          <InlineNameEditor value={draftName} onChange={onDraftNameChange} mode={mode} />
        </div>

        <button
          onClick={() => exportTxt(draftName, mode, builder, notes)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-medium hover:bg-outline-variant transition-colors flex-shrink-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
          Export
        </button>
      </header>

      {/* Story content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 40 }}>auto_stories</span>
            <p className="text-on-surface-variant text-sm">Your builder is empty. Add some elements first.</p>
          </div>
        )}

        {entries.map(([slot, value]) => (
          <div key={slot} className="flex flex-col gap-1">
            <p
              className="text-xs text-on-surface-variant uppercase tracking-wider"
              style={{ letterSpacing: '0.08em' }}
            >
              {slot}
            </p>
            <p
              className="text-on-surface text-base font-semibold leading-snug"
              style={{ fontFamily: "'Noto Serif', serif" }}
            >
              {value}
            </p>
            {notes[slot] && (
              <div className="mt-1 pl-3 border-l-2 border-tertiary mode-transition">
                <p className="text-on-surface-variant text-sm italic leading-relaxed">
                  {notes[slot]}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
