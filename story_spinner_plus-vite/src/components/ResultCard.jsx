function Tag({ children }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-surface-variant text-on-surface-variant">
      {children}
    </span>
  )
}

function Section({ label, children }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1"
        style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        {label}
      </p>
      <div>{children}</div>
    </div>
  )
}

function ElementResultCard({ result, onSave, onSpinAgain }) {
  return (
    <div className="p-5 overflow-y-auto h-full flex flex-col">
      <div className="flex-1">
        <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          {result.category}
        </p>
        <h2
          className="text-2xl font-semibold text-tertiary mb-4 leading-snug"
          style={{ fontFamily: "'Noto Serif', serif" }}
        >
          {result.archetype}
        </h2>
        {result.statement && (
          <p className="text-on-surface-variant text-sm italic leading-relaxed border-l-2 border-tertiary pl-3">
            "{result.statement}"
          </p>
        )}
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-outline-variant">
        <button
          onClick={onSpinAgain}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-medium hover:bg-surface-container-high mode-transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Spin Again
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-tertiary text-on-tertiary text-sm font-medium hover:opacity-90 mode-transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_add</span>
          Save
        </button>
      </div>
    </div>
  )
}

export default function ResultCard({ result, mode, onSave, onSpinAgain, onFlip }) {
  if (!result) return null

  if (result.is_element) {
    return <ElementResultCard result={result} onSave={onSave} onSpinAgain={onSpinAgain} />
  }

  const isCharacter = mode === 'character'
  const isStory = mode === 'story'
  const isMusic = mode === 'music'

  return (
    <div className="p-5 overflow-y-auto h-full">
      {/* Archetype headline */}
      <div className="mb-4">
        <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          {mode} archetype
        </p>
        <h2
          className="text-2xl font-semibold text-tertiary"
          style={{ fontFamily: "'Noto Serif', serif" }}
        >
          {result.archetype}
        </h2>
      </div>

      {/* Character fields */}
      {isCharacter && (
        <>
          {result.coreWound && <Section label="Core Wound"><p className="text-on-surface text-sm">{result.coreWound}</p></Section>}
          {result.tarotArc && (
            <Section label="Tarot Arc">
              <div className="flex flex-col gap-1">
                {Object.entries(result.tarotArc).map(([k, v]) => (
                  <div key={k} className="flex gap-2 items-start">
                    <span className="text-tertiary text-xs font-bold uppercase tracking-wider w-20 flex-shrink-0">{k}</span>
                    <span className="text-on-surface text-sm">{v}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {result.audioVibe && (
            <Section label="Audio Vibe">
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(result.audioVibe) ? result.audioVibe : [result.audioVibe]).map((v, i) => (
                  <Tag key={i}>{v}</Tag>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Story fields */}
      {isStory && (
        <>
          {result.premise && <Section label="Premise"><p className="text-on-surface text-sm">{result.premise}</p></Section>}
          {result.theme && <Section label="Theme"><p className="text-on-surface text-sm">{result.theme}</p></Section>}
          {result.conflict && <Section label="Conflict"><p className="text-on-surface text-sm">{result.conflict}</p></Section>}
          {result.setting && <Section label="Setting"><Tag>{result.setting}</Tag></Section>}
          {result.twist && <Section label="Twist"><p className="text-on-surface text-sm italic">{result.twist}</p></Section>}
        </>
      )}

      {/* Music fields */}
      {isMusic && (
        <>
          {result.style && <Section label="Style"><Tag>{result.style}</Tag></Section>}
          {result.emotion && <Section label="Emotion"><Tag>{result.emotion}</Tag></Section>}
          {result.instrumentation && (
            <Section label="Instrumentation">
              <div className="flex flex-col gap-1">
                {Object.entries(result.instrumentation).map(([k, v]) => (
                  <div key={k} className="flex gap-2 items-start">
                    <span className="text-tertiary text-xs font-bold uppercase tracking-wider w-8 flex-shrink-0">{k}</span>
                    <span className="text-on-surface text-sm">{v}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {result.chordProgression && <Section label="Chords"><p className="text-on-surface text-sm font-mono">{result.chordProgression}</p></Section>}
          {result.melodyIdea && <Section label="Melody Idea"><p className="text-on-surface text-sm italic">{result.melodyIdea}</p></Section>}
          {result.ambienceIdea && <Section label="Ambience"><p className="text-on-surface text-sm italic">{result.ambienceIdea}</p></Section>}
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-outline-variant">
        <button
          onClick={onSpinAgain}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-medium hover:bg-surface-container-high mode-transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Spin Again
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-tertiary text-on-tertiary text-sm font-medium hover:opacity-90 mode-transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_add</span>
          Save
        </button>
      </div>
    </div>
  )
}
