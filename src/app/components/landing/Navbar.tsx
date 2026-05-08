import { useState, useEffect, useRef } from "react"
import { Link } from "react-router"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react"
import { useTheme } from "../../../lib/theme-context"
import { useLanguage } from "../../../lib/language-context"
import type { Lang } from "../../../lib/i18n"

function OpenfyLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 28, height: 28, background: "#16A34A", borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0" y="8" width="4" height="6" rx="1" fill="white" />
          <rect x="5" y="4" width="4" height="10" rx="1" fill="white" />
          <rect x="10" y="0" width="4" height="14" rx="1" fill="white" />
        </svg>
      </div>
      <span style={{
        fontSize: 17, fontWeight: 700,
        color: "var(--of-text)",
        letterSpacing: "-0.02em", fontFamily: "var(--font-display)",
      }}>
        Openfy
      </span>
    </div>
  )
}

export { OpenfyLogo }

const LANG_OPTIONS: { code: Lang; labelKey: "langLongPT" | "langLongEN" | "langLongES" }[] = [
  { code: "pt", labelKey: "langLongPT" },
  { code: "en", labelKey: "langLongEN" },
  { code: "es", labelKey: "langLongES" },
]

function LangDropdown() {
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          height: 34, padding: "0 11px",
          borderRadius: 8,
          background: "transparent",
          border: "1px solid var(--of-border)",
          color: "var(--of-text-secondary)",
          cursor: "pointer", fontSize: 12, fontWeight: 700,
          letterSpacing: "0.06em",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "var(--of-text-muted)"
          e.currentTarget.style.color = "var(--of-text)"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--of-border)"
          e.currentTarget.style.color = "var(--of-text-secondary)"
        }}
      >
        {lang.toUpperCase()}
        <ChevronDown
          size={12}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: "var(--of-text-muted)",
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 300,
              background: "var(--of-surface)",
              border: "1px solid var(--of-border)",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 168, overflow: "hidden",
            }}
          >
            {LANG_OPTIONS.map(opt => {
              const active = opt.code === lang
              return (
                <button
                  key={opt.code}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => { setLang(opt.code); setOpen(false) }}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px",
                    background: active ? "var(--of-hover)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--of-hover)" }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text)" }}>
                    {t(opt.labelKey)}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                    color: active ? "#16A34A" : "var(--of-text-muted)",
                  }}>
                    {opt.code.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DarkModeToggle({ size = 36 }: { size?: number }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? t("darkModeOff") : t("darkModeOn")}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%",
        background: "var(--of-btn-bg)",
        color: "var(--of-btn-text)",
        border: "none", cursor: "pointer", flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "scale(1.08)"
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.28)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.18)"
      }}
    >
      {isDark ? <Sun size={14} strokeWidth={2.2} /> : <Moon size={14} strokeWidth={2.2} />}
    </button>
  )
}

export default function Navbar() {
  const [rolado, setRolado] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const handler = () => setRolado(window.scrollY > 50)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  const navLinks = [
    { label: t("navRecursos"), href: "#recursos" },
    { label: t("navScore"), href: "#score" },
    { label: t("navPrecos"), href: "#precos" },
    { label: t("navFAQ"), href: "#faq" },
  ]

  return (
    <>
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          transition: "all 0.25s ease",
          backgroundColor: rolado ? "var(--of-glass-bg)" : "transparent",
          backdropFilter: rolado ? "blur(12px)" : "none",
          boxShadow: rolado ? "0 1px 0 rgba(0,0,0,0.07)" : "none",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 24px",
          height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <OpenfyLogo />
          </a>

          {/* Desktop nav links */}
          <nav style={{ gap: 36 }} className="hidden md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 14, fontWeight: 500,
                  color: "var(--of-text-secondary)",
                  textDecoration: "none", transition: "color 0.15s",
                }}
                onMouseOver={e => (e.currentTarget.style.color = "var(--of-text)")}
                onMouseOut={e => (e.currentTarget.style.color = "var(--of-text-secondary)")}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop right side: [LangDropdown] [Entrar] [Começar] [DarkMode] */}
          <div style={{ alignItems: "center", gap: 8 }} className="hidden md:flex">
            <LangDropdown />
            <Link
              to="/login"
              style={{
                fontSize: 14, fontWeight: 500,
                color: "var(--of-text-secondary)",
                textDecoration: "none", padding: "8px 16px",
                borderRadius: 8, transition: "color 0.15s, background 0.15s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = "var(--of-text)"
                e.currentTarget.style.background = "var(--of-hover)"
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = "var(--of-text-secondary)"
                e.currentTarget.style.background = "transparent"
              }}
            >
              {t("navEntrar")}
            </Link>
            <Link
              to="/login"
              style={{
                fontSize: 14, fontWeight: 600,
                color: "var(--of-btn-text)",
                textDecoration: "none", padding: "8px 20px",
                borderRadius: 8, backgroundColor: "var(--of-btn-bg)",
                transition: "background 0.15s",
              }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--of-btn-hover-bg)")}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = "var(--of-btn-bg)")}
            >
              {t("navComecarGratis")}
            </Link>
            <DarkModeToggle />
          </div>

          {/* Mobile right side: [LangDropdown] [DarkMode] [hamburger] */}
          <div style={{ alignItems: "center", gap: 8 }} className="md:hidden flex">
            <LangDropdown />
            <DarkModeToggle size={34} />
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 8, color: "var(--of-text)",
              }}
              aria-label="Menu"
            >
              {menuAberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {menuAberto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                backgroundColor: "var(--of-surface)",
                borderTop: "1px solid var(--of-border)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuAberto(false)}
                    style={{
                      fontSize: 16, fontWeight: 500,
                      color: "var(--of-text)", textDecoration: "none",
                      padding: "12px 0", borderBottom: "1px solid var(--of-border-light)",
                    }}
                  >
                    {link.label}
                  </a>
                ))}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link
                    to="/login"
                    onClick={() => setMenuAberto(false)}
                    style={{
                      flex: 1, textAlign: "center",
                      fontSize: 14, fontWeight: 600,
                      color: "var(--of-text)", textDecoration: "none",
                      padding: "12px", borderRadius: 8,
                      border: "1.5px solid var(--of-border)",
                    }}
                  >
                    {t("navEntrar")}
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMenuAberto(false)}
                    style={{
                      flex: 1, textAlign: "center",
                      fontSize: 14, fontWeight: 600,
                      color: "var(--of-btn-text)", textDecoration: "none",
                      padding: "12px", borderRadius: 8,
                      backgroundColor: "var(--of-btn-bg)",
                    }}
                  >
                    {t("navComecarGratis")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
