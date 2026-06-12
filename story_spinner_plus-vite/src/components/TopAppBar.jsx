import { useState, useEffect, useRef } from 'react'

export function UserMenu({ email, onLibrary, onSignOut }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const initial = email ? email[0].toUpperCase() : '?'

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-surface-container-high transition-colors"
        title={email}
      >
        <div
          className="w-7 h-7 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-bold text-xs mode-transition flex-shrink-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {initial}
        </div>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-surface-container-high border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden py-1">
          {/* Email display */}
          <div className="px-4 py-3 border-b border-outline-variant">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-0.5"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Signed in as
            </p>
            <p className="text-sm font-medium text-on-surface truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {email}
            </p>
          </div>

          {/* My Library */}
          <button
            onClick={() => { setOpen(false); onLibrary() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors text-left"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
              collections_bookmark
            </span>
            My Library
          </button>

          <div className="border-t border-outline-variant my-1" />

          {/* Sign Out */}
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors text-left"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
              logout
            </span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function TopAppBar({ isLoggedIn, userEmail, onLibrary, onSignIn, onSignOut }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-surface-container border-b border-outline-variant">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-tertiary mode-transition" style={{ fontSize: 20 }}>
          casino
        </span>
        <span
          className="text-on-surface font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, letterSpacing: '-0.02em' }}
        >
          Story Spinner+
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <UserMenu email={userEmail} onLibrary={onLibrary} onSignOut={onSignOut} />
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant text-xs font-medium hover:text-on-surface hover:border-outline transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person</span>
            Sign In
          </button>
        )}
      </div>
    </header>
  )
}
