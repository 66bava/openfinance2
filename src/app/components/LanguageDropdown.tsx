import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "../../lib/language-context"
import type { Lang, TranslationKey } from "../../lib/i18n"

const LANG_ITEMS: Array<{ code: Lang; labelKey: TranslationKey }> = [
  { code: "pt", labelKey: "langLongPT" },
  { code: "en", labelKey: "langLongEN" },
  { code: "es", labelKey: "langLongES" },
]

export function LanguageDropdown() {
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentShort = useMemo(() => lang.toUpperCase(), [lang])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 34,
          padding: "0 10px",
          borderRadius: 999,
          background: "var(--of-page-bg)",
          border: "1px solid var(--of-border)",
          color: "var(--of-text)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.06em",
          boxShadow: open ? "0 4px 14px rgba(0,0,0,0.10)" : "none",
          transition: "box-shadow 0.15s, transform 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)" }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
        aria-label={t("langAria")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {currentShort}
        <ChevronDown size={14} style={{ color: "var(--of-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 200,
            background: "var(--of-surface)",
            border: "1px solid var(--of-border)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            minWidth: 180,
            overflow: "hidden",
          }}
        >
          {LANG_ITEMS.map((item) => {
            const active = item.code === lang
            return (
              <button
                key={item.code}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setLang(item.code); setOpen(false) }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  background: active ? "var(--of-hover)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--of-text)" }}>
                  {t(item.labelKey)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: active ? "#16A34A" : "var(--of-text-muted)", letterSpacing: "0.06em" }}>
                  {item.code.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

