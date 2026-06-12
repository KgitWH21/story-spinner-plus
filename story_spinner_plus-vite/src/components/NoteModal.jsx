import { useState, useEffect, useRef } from 'react'

export default function NoteModal({ slot, value, existingNote, onSave, onDelete, onClose }) {
  const [text, setText] = useState(existingNote || '')
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [text])

  const handleSave = () => {
    const trimmed = text.trim()
    if (trimmed === (existingNote || '').trim()) { onClose(); return }
    onSave(trimmed)
  }

  const canSave = text.trim() !== (existingNote || '').trim()

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm sm:max-w-xl bg-surface-container rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div className="min-w-0 flex-1">
            <p className="text-on-surface text-sm font-semibold truncate"
              style={{ fontFamily: "'Noto Serif', serif" }}>
              <span className="text-on-surface-variant font-normal"
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                {slot}
              </span>
              {value && (
                <>
                  <span className="text-on-surface-variant font-normal mx-1.5">—</span>
                  {value}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors ml-3 flex-shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Textarea */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your idea here… (Cmd+Enter to save)"
            rows={7}
            className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-on-surface text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-tertiary placeholder:text-on-surface-variant/50 mode-transition"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-full bg-tertiary text-on-tertiary text-sm font-bold mode-transition hover:opacity-90 disabled:opacity-40 disabled:cursor-default active:scale-95 transition-transform"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Save Note
          </button>
          {existingNote && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-full bg-error/10 text-error text-sm font-medium hover:bg-error/20 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant text-sm font-medium hover:bg-outline-variant transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
