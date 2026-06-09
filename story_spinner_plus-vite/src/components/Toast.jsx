import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const hide = setTimeout(() => setVisible(false), 2800)
    const done = setTimeout(onDone, 3400)
    return () => { clearTimeout(hide); clearTimeout(done) }
  }, [message])

  if (!message) return null

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-4 py-2.5 rounded-full
        bg-surface-container-highest border border-outline-variant
        text-on-surface text-sm font-medium shadow-lg
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 16 }}>
        check_circle
      </span>
      {message}
    </div>
  )
}
