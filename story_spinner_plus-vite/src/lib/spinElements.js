// Flatten a SavedSpin payload into a list of { slot, value } pairs
// that can be individually added to the builder.
export function extractElements(spin) {
  const { spin_type, payload } = spin
  const els = []

  const add = (slot, value) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      els.push({ slot, value: String(value).trim() })
    }
  }

  // Custom / shuffled element spin
  if (payload.is_element) {
    add(payload.category || spin_type, payload.archetype)
    if (payload.statement) add('Quote', payload.statement)
    return els
  }

  add('Archetype', payload.archetype)

  if (spin_type === 'character') {
    add('Wound', payload.tarotArc?.wound)
    add('Obstacle', payload.tarotArc?.obstacle)
    add('Transformation', payload.tarotArc?.transformation)
    const vibe = payload.audioVibe
    add('Audio Vibe', Array.isArray(vibe) ? vibe.join(', ') : vibe)
  }

  if (spin_type === 'story') {
    add('Premise', payload.premise)
    add('Theme', payload.theme)
    add('Conflict', payload.conflict)
    add('Setting', payload.setting)
    add('Twist', payload.twist)
    add('Perspective', payload.perspective)
    add('Genre', payload.genre)
    add('Wound', payload.tarotArc?.wound)
    add('Obstacle', payload.tarotArc?.obstacle)
    add('Transformation', payload.tarotArc?.transformation)
    const vibe = payload.audioVibe
    add('Audio Vibe', Array.isArray(vibe) ? vibe.join(', ') : vibe)
  }

  if (spin_type === 'music') {
    add('Style', payload.style)
    add('Emotion', payload.emotion)
    if (payload.instrumentation) {
      add('Highs', payload.instrumentation.highs)
      add('Mids', payload.instrumentation.mids)
      add('Lows', payload.instrumentation.lows)
    }
    add('Chord Progression', payload.chordProgression)
    add('Melody Idea', payload.melodyIdea)
    add('Ambience', payload.ambienceIdea)
    add('Ear Candy', payload.earCandy)
    add('Vocal Effects', payload.vocalEffects)
  }

  return els
}

// Format the builder map as a copyable plain-text block
export function builderToText(builder) {
  return Object.entries(builder)
    .map(([slot, value]) => `${slot}: ${value}`)
    .join('\n')
}

export const TYPE_LABELS = { character: 'Character', story: 'Story', music: 'Music' }
export const TYPE_ICONS  = { character: 'person', story: 'menu_book', music: 'music_note' }

export const CATEGORY_LABELS = {
  'plot.archetypes': 'Plot Archetype',
  'plot.genres': 'Genre',
  'plot.perspectives': 'Perspective',
  'plot.social_issues': 'Social Issue',
  'plot.universal_human_questions': 'Core Question',
  'character.descriptors': 'Character Trait',
  'character.theories_of_control': 'Control Theory',
  'character.relationship': 'Relationship',
}
