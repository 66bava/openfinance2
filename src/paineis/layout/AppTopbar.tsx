import { useEffect, useMemo, useRef, useState } from "react"

export function AppTopbar({
  title,
  avatarText,
  showNotifDot,
  onSync,
  onNotificationsClick,
  onSearchChange,
}: {
  title: string
  avatarText: string
  showNotifDot?: boolean
  onSync?: () => void
  onNotificationsClick?: () => void
  onSearchChange?: (value: string) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac")
      const hit = isMac ? e.metaKey && e.key.toLowerCase() === "k" : e.ctrlKey && e.key.toLowerCase() === "k"
      if (!hit) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const kbdText = useMemo(() => {
    const isMac = navigator.platform.toLowerCase().includes("mac")
    return isMac ? "⌘K" : "Ctrl K"
  }, [])

  function triggerSync() {
    if (syncing) return
    setSyncing(true)
    try {
      onSync?.()
    } finally {
      window.setTimeout(() => setSyncing(false), 2000)
    }
  }

  return (
    <header className="header">
      <span className="header-title">{title}</span>

      <div className="search-wrap" role="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            onSearchChange?.(e.target.value)
          }}
          type="text"
          placeholder="Buscar transações, categorias…"
          aria-label="Buscar"
        />
        <span className="search-kbd">{kbdText}</span>
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        <button type="button" className="sync-btn" onClick={triggerSync} aria-busy={syncing}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          <span>{syncing ? "Sincronizando…" : "Sincronizar"}</span>
        </button>

        <div className="divider" />

        <button type="button" className="icon-btn" aria-label="Notificações" onClick={onNotificationsClick}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {showNotifDot ? <span className="notif-dot" /> : null}
        </button>

        <button type="button" className="icon-btn" aria-label="Ajuda">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
        </button>

        <div className="divider" />
        <div className="header-avatar" aria-label="Perfil">
          {avatarText}
        </div>
      </div>
    </header>
  )
}
