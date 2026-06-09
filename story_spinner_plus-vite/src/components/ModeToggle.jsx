const MODES = [
  { key: 'character', icon: 'person',     label: 'Characters' },
  { key: 'story',     icon: 'menu_book',  label: 'Stories'    },
  { key: 'music',     icon: 'music_note', label: 'Music'      },
]

export default function ModeToggle({ mode, onModeChange }) {
  const activeIndex = MODES.findIndex((m) => m.key === mode)

  return (
    <div className="px-4 py-4 flex justify-center">
      <div
        className="relative flex rounded-full border border-outline-variant bg-surface-container p-1"
        style={{ gap: 0 }}
      >
        {/* Sliding pill — moves behind the active button */}
        <div
          className="absolute rounded-full bg-tertiary"
          style={{
            top: 4,
            bottom: 4,
            left: 4,
            // Width = 1/3 of the container minus the left+right padding (8px total)
            width: 'calc((100% - 8px) / 3)',
            transform: `translateX(calc(${activeIndex} * 100%))`,
            transition: [
              'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              'background-color 0.7s ease',
            ].join(', '),
          }}
        />

        {MODES.map(({ key, icon, label }) => {
          const active = mode === key
          return (
            <button
              key={key}
              onClick={() => onModeChange(key)}
              className={[
                'relative z-10 flex flex-1 items-center justify-center gap-1.5',
                'px-5 py-2 md:px-7 md:py-3',
                'text-sm md:text-base font-semibold',
                'select-none cursor-pointer whitespace-nowrap rounded-full',
                active ? 'text-on-tertiary' : 'text-on-surface-variant hover:text-on-surface',
              ].join(' ')}
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                transition: 'color 0.45s ease',
              }}
            >
              <span
                className="material-symbols-outlined pointer-events-none"
                style={{ fontSize: 16 }}
              >
                {icon}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
