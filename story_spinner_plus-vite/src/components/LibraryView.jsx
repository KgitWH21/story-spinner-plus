import { useState, useEffect, useRef } from 'react'
import SpinCard from './SpinCard'
import BuilderPanel from './BuilderPanel'
import { listSpins, listProjects, renameProject } from '../api/client'
import { TYPE_LABELS, TYPE_ICONS } from '../lib/spinElements'

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

export default function LibraryView({ onBack, onSpinNow }) {
  const [activeType, setActiveType] = useState('character')
  const [spinsByType, setSpinsByType] = useState({ character: null, story: null, music: null })
  const [loading, setLoading] = useState(false)
  const [project, setProject] = useState(null)
  const [builder, setBuilder] = useState({})

  const spins = spinsByType[activeType]

  // Load the user's default project for the rename header
  useEffect(() => {
    listProjects()
      .then(({ data }) => { if (data.length > 0) setProject(data[0]) })
      .catch(console.error)
  }, [])

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

  const hasSpins = spins && spins.length > 0

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
        <span className="text-on-surface-variant text-xs font-medium tracking-widest uppercase flex-shrink-0"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          HAC Studios
        </span>
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
              onClick={() => onSpinNow(activeType)}
              className="mt-1 px-5 py-2 rounded-full bg-tertiary text-on-tertiary text-sm font-bold mode-transition"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Spin Now
            </button>
          </div>
        )}

        {!loading && spins && spins.map(spin => (
          <SpinCard key={spin.id} spin={spin} onAdd={handleAdd} builderSlots={builder} />
        ))}

        {/* Bottom Spin! button — shown when there are spins to browse */}
        {hasSpins && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={() => onSpinNow(activeType)}
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
        <BuilderPanel builder={builder} onRemove={handleRemove} onClear={() => setBuilder({})} />
      </div>
    </div>
  )
}
