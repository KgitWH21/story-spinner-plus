import { useState, useEffect, useRef, useCallback } from 'react'
import SpinCard from './SpinCard'
import BuilderPanel from './BuilderPanel'
import SpinModal from './SpinModal'
import NoteModal from './NoteModal'
import ViewStoryPanel from './ViewStoryPanel'
import { UserMenu } from './TopAppBar'
import { listSpins, listProjects, renameProject, deleteSpin, listDrafts, createDraft, updateDraft } from '../api/client'
import Toast from './Toast'
import { TYPE_LABELS, TYPE_ICONS } from '../lib/spinElements'
import { applyModeTokens } from '../lib/theme'

const TYPES = ['character', 'story', 'music']

function ProjectNameEditor({ project, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(project?.name || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  useEffect(() => {
    setValue(project?.name || '')
  }, [project?.name])

  const save = () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === project?.name) { setEditing(false); return }
    renameProject(project.id, trimmed)
      .then(({ data }) => { onSaved(data.name); setEditing(false) })
      .catch(() => setEditing(false))
  }

  if (!project) return null

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="bg-surface-container-high border border-tertiary rounded-lg px-2 py-0.5 text-on-surface text-sm font-semibold focus:outline-none w-40"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          maxLength={80}
        />
      ) : (
        <>
          <span className="text-on-surface font-semibold text-sm truncate"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {project.name}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-on-surface-variant hover:text-tertiary transition-colors flex-shrink-0"
            title="Rename project"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
          </button>
        </>
      )}
    </div>
  )
}

export default function LibraryView({ onBack, userEmail, onSignOut }) {
  const [activeType, setActiveType] = useState('character')
  const [spinsByType, setSpinsByType] = useState({ character: null, story: null, music: null })
  const [loading, setLoading] = useState(false)
  const [project, setProject] = useState(null)
  const [builder, setBuilder] = useState({})
  const [spinModalMode, setSpinModalMode] = useState(null)
  const [subView, setSubView] = useState('library') // 'library' | 'story'
  const [toastMsg, setToastMsg] = useState('')

  // Draft state
  const [draftId, setDraftId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [notes, setNotes] = useState({})
  const [noteSlot, setNoteSlot] = useState(null)  // { slot, value }


  // Refs for auto-save (avoid stale closures in debounce)
  const debounceRef = useRef(null)
  const pendingCreateRef = useRef(false)
  const draftIdRef = useRef(null)
  const builderRef = useRef({})
  const notesRef = useRef({})
  const draftNameRef = useRef('')
  const activeTypeRef = useRef('character')
  const mountedRef = useRef(false)

  useEffect(() => { draftIdRef.current = draftId }, [draftId])
  useEffect(() => { builderRef.current = builder }, [builder])
  useEffect(() => { notesRef.current = notes }, [notes])
  useEffect(() => { draftNameRef.current = draftName }, [draftName])
  useEffect(() => { activeTypeRef.current = activeType }, [activeType])

  const spins = spinsByType[activeType]

  // Load most recent draft on mount
  useEffect(() => {
    listDrafts()
      .then(({ data }) => {
        if (data.length > 0) {
          const d = data[0]
          setDraftId(d.id)
          setDraftName(d.name || '')
          setBuilder(d.elements || {})
          setNotes(d.notes || {})
        }
      })
      .catch(console.error)
      .finally(() => { mountedRef.current = true })
  }, [])

  // Auto-save: debounced PATCH (or create) whenever builder/notes/draftName change
  const scheduleSave = useCallback(() => {
    if (!mountedRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const payload = {
        name: draftNameRef.current || 'Untitled',
        mode: activeTypeRef.current,
        elements: builderRef.current,
        notes: notesRef.current,
      }
      if (draftIdRef.current) {
        updateDraft(draftIdRef.current, payload).catch(console.error)
      } else if (!pendingCreateRef.current) {
        pendingCreateRef.current = true
        createDraft(payload)
          .then(({ data }) => { setDraftId(data.id); draftIdRef.current = data.id })
          .catch(console.error)
          .finally(() => { pendingCreateRef.current = false })
      }
    }, 800)
  }, [])

  useEffect(() => { scheduleSave() }, [builder])
  useEffect(() => { scheduleSave() }, [notes])
  useEffect(() => { scheduleSave() }, [draftName])

  // Load project name for header
  useEffect(() => {
    listProjects()
      .then(({ data }) => { if (data.length > 0) setProject(data[0]) })
      .catch(console.error)
  }, [])

  // Sync mode colors to the active tab
  useEffect(() => { applyModeTokens(activeType) }, [activeType])

  // Lazy-load spins per tab
  useEffect(() => {
    if (spinsByType[activeType] !== null) return
    setLoading(true)
    listSpins(activeType)
      .then(({ data }) => setSpinsByType(prev => ({ ...prev, [activeType]: data })))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeType])

  const handleAdd = (slot, value) => setBuilder(prev => ({ ...prev, [slot]: value }))
  const handleRemove = (slot) => setBuilder(prev => { const n = { ...prev }; delete n[slot]; return n })
  const handleDelete = (id) => {
    deleteSpin(id)
      .then(() => {
        setSpinsByType(prev => ({
          ...prev,
          [activeType]: (prev[activeType] || []).filter(s => s.id !== id),
        }))
      })
      .catch((err) => {
        const status = err?.response?.status
        console.error('Delete failed', status, err)
        setToastMsg(`Could not delete (${status ?? 'network error'}) — please try again.`)
      })
  }

  // Note modal handlers
  const handleNoteClick = (slot, value) => setNoteSlot({ slot, value: value || '' })
  const handleNoteSave = (text) => {
    setNotes(prev => ({ ...prev, [noteSlot.slot]: text }))
    setNoteSlot(null)
  }
  const handleNoteDelete = () => {
    setNotes(prev => { const n = { ...prev }; delete n[noteSlot.slot]; return n })
    setNoteSlot(null)
  }

  const hasSpins = spins && spins.length > 0

  if (subView === 'story') {
    return (
      <ViewStoryPanel
        draftName={draftName}
        onDraftNameChange={setDraftName}
        builder={builder}
        notes={notes}
        mode={activeType}
        onBack={() => setSubView('library')}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background text-on-surface"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-surface-container border-b border-outline-variant flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
        </button>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.08em' }}>
            Project
          </span>
          <ProjectNameEditor
            project={project}
            onSaved={name => setProject(p => ({ ...p, name }))}
          />
        </div>
        <UserMenu email={userEmail} onSignOut={onSignOut} />
      </header>

      {/* Type tabs */}
      <div className="flex border-b border-outline-variant bg-surface-container flex-shrink-0">
        {TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium
              mode-transition border-b-2 transition-colors
              ${activeType === type
                ? 'border-tertiary text-tertiary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }
            `}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{TYPE_ICONS[type]}</span>
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Spin list — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {loading && (
          <div className="flex justify-center py-12 text-on-surface-variant text-sm">Loading…</div>
        )}

        {!loading && spins && spins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
              {TYPE_ICONS[activeType]}
            </span>
            <p className="text-on-surface-variant text-sm">
              No saved {TYPE_LABELS[activeType].toLowerCase()} spins yet.
            </p>
            <button
              onClick={() => setSpinModalMode(activeType)}
              className="mt-1 px-5 py-2 rounded-full bg-tertiary text-on-tertiary text-sm font-bold mode-transition"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Spin {TYPE_LABELS[activeType]}!
            </button>
          </div>
        )}

        {!loading && spins && spins.map(spin => (
          <SpinCard
            key={spin.id}
            spin={spin}
            onAdd={handleAdd}
            onDelete={handleDelete}
            builderSlots={builder}
            notes={notes}
            onNoteClick={handleNoteClick}
          />
        ))}

        {hasSpins && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={() => setSpinModalMode(activeType)}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-tertiary text-on-tertiary font-bold text-sm uppercase tracking-wider mode-transition hover:opacity-90 active:scale-95 transition-transform shadow-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.12em' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>casino</span>
              Spin {TYPE_LABELS[activeType]}!
            </button>
          </div>
        )}
      </div>

      {/* Builder panel — sticky at bottom */}
      <div className="flex-shrink-0">
        <BuilderPanel
          builder={builder}
          onRemove={handleRemove}
          onClear={() => setBuilder({})}
          mode={activeType}
          notes={notes}
          onNoteClick={handleNoteClick}
          draftName={draftName}
          onDraftNameChange={setDraftName}
          onViewStory={() => setSubView('story')}
        />
      </div>

      {spinModalMode && (
        <SpinModal
          mode={spinModalMode}
          builder={builder}
          onAdd={handleAdd}
          onClose={() => setSpinModalMode(null)}
        />
      )}

      {noteSlot !== null && (
        <NoteModal
          slot={noteSlot.slot}
          value={noteSlot.value}
          existingNote={notes[noteSlot.slot] || ''}
          onSave={handleNoteSave}
          onDelete={handleNoteDelete}
          onClose={() => setNoteSlot(null)}
        />
      )}

      <Toast message={toastMsg} onDone={() => setToastMsg('')} />
    </div>
  )
}
