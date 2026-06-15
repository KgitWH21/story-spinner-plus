import { useState, useEffect, useCallback, useRef } from 'react'
import { shuffleElements, getWheelSet, searchElements } from '../api/client'

const CATEGORY_LABELS = {
  'plot.archetypes': 'Plot Archetype',
  'plot.genres': 'Genre',
  'plot.perspectives': 'Perspective',
  'plot.social_issues': 'Social Issue',
  'plot.universal_human_questions': 'Core Question',
  'character.descriptors': 'Character Trait',
  'character.theories_of_control': 'Control Theory',
  'character.age': 'Age',
  'character.gender': 'Gender',
  'character.race': 'Race',
  'character.relationship': 'Relationship',
  'music.style': 'Style',
  'music.emotion': 'Mood',
  'music.chord_progression': 'Chord Progression',
  'music.ambience_idea': 'Atmosphere',
  'music.ear_candy': 'Ear Candy',
  'music.vocal_effects': 'Vocal Effects',
  'music.melody_idea': 'Melody Idea',
}

const MODE_CATEGORIES = {
  character: [
    'character.theories_of_control',
    'character.descriptors',
    'character.relationship',
    'plot.social_issues',
    'plot.universal_human_questions',
  ],
  story: [
    'plot.archetypes',
    'plot.genres',
    'plot.perspectives',
    'plot.social_issues',
    'plot.universal_human_questions',
  ],
  music: [
    'music.style',
    'music.emotion',
    'music.chord_progression',
    'music.ambience_idea',
  ],
}

const MODE_TITLES = {
  character: 'Character Elements',
  story: 'Story Elements',
  music: 'Music Elements',
}

function ElementChip({ category, item }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant">
      <span
        className="text-xs text-on-surface-variant uppercase tracking-widest"
        style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.1em' }}
      >
        {CATEGORY_LABELS[category] || category}
      </span>
      <span className="text-on-surface text-sm font-medium leading-snug">{item.label}</span>
      {item.metadata?.statement && (
        <span className="text-on-surface-variant text-xs italic mt-0.5 leading-snug">
          "{item.metadata.statement}"
        </span>
      )}
    </div>
  )
}

export default function ShuffleDrawer({ isOpen, onClose, mode, onWheelUpdate }) {
  const [shuffle, setShuffle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const inputRef = useRef(null)

  const fetchBoth = useCallback(() => {
    setSearchResults(null)
    setSearchQuery('')
    setShuffle(null)
    setLoading(true)
    Promise.all([
      shuffleElements(MODE_CATEGORIES[mode] || MODE_CATEGORIES.story),
      getWheelSet(mode),
    ])
      .then(([elemRes, wheelRes]) => {
        setShuffle(elemRes.data.shuffle)
        onWheelUpdate(wheelRes.data.wedges)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mode, onWheelUpdate])

  useEffect(() => {
    if (isOpen) fetchBoth()
  }, [isOpen, mode])

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearchLoading(true)
    setSearchResults(null)
    try {
      const { data } = await searchElements(q, mode)
      setSearchResults(data.wedges)
      onWheelUpdate(data.wedges)  // load results directly onto the wheel
    } catch (err) {
      console.error(err)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchResults(null)
    setSearchQuery('')
    fetchBoth()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-40
          bg-surface-container-high rounded-t-2xl border-t border-outline-variant
          transition-transform duration-300
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle + header */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-outline-variant" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary mode-transition" style={{ fontSize: 18 }}>
              shuffle
            </span>
            <span
              className="text-on-surface font-semibold text-sm mode-transition"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {MODE_TITLES[mode] || 'Story Elements'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1 -mr-1"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="px-4 pb-2 flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: 16 }}>
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${mode} elements…`}
              className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant focus:outline-none focus:border-tertiary mode-transition transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || searchLoading}
            className="px-4 py-2 rounded-full bg-tertiary text-on-tertiary text-sm font-bold mode-transition hover:opacity-90 disabled:opacity-40"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {searchLoading ? '…' : 'Go'}
          </button>
          {searchResults && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-3 py-2 rounded-full bg-surface-container-high text-on-surface-variant text-sm hover:text-on-surface transition-colors"
              title="Clear search"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </form>

        {/* Cards */}
        <div className="px-4 pb-3 flex flex-col gap-2" style={{ maxHeight: '44vh', overflowY: 'auto' }}>
          {(loading || searchLoading) && (
            <div className="flex justify-center py-8 text-on-surface-variant text-sm">
              {searchLoading ? 'Searching…' : 'Shuffling…'}
            </div>
          )}

          {/* Search results */}
          {!searchLoading && searchResults && (
            <>
              <p className="text-xs text-on-surface-variant italic px-1">
                Top {searchResults.length} matches for "{searchQuery}" — loaded onto wheel
              </p>
              {searchResults.map((wedge) => (
                <ElementChip
                  key={wedge.id}
                  category={wedge.category}
                  item={{ label: wedge.full_label, metadata: wedge.metadata }}
                />
              ))}
            </>
          )}

          {/* Default shuffle results */}
          {!loading && !searchResults && shuffle && Object.entries(shuffle).map(([cat, item]) => (
            <ElementChip key={cat} category={cat} item={item} />
          ))}
        </div>

        {/* Reshuffle — hidden when showing search results */}
        {!searchResults && (
          <div className="px-4 pb-6 pt-2 border-t border-outline-variant">
            <button
              onClick={fetchBoth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-tertiary text-on-tertiary text-sm font-bold uppercase tracking-wider mode-transition hover:opacity-90 disabled:opacity-50"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.1em' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>shuffle</span>
              {loading ? 'Shuffling…' : 'Reshuffle'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
