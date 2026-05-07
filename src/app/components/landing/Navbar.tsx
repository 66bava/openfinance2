import { useState, useEffect } from "react"
import { Link } from "react-router"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X, Sun, Moon } from "lucide-react"
import { useTheme } from "../../../lib/theme-context"
import { useLanguage } from "../../../lib/language-context"
import type { Lang } from "../../../lib/i18n"

function OpenfyLogo({ dark = false }: { dark?: boolean }) {
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
        color: dark ? "#FFFFFF" : "var(--of-text)",
        letterSpacing: "-0.02em", fontFamily: "var(--font-display)",
      }}>
        Openfy
      </span>
    </div>
  )
}

export { OpenfyLogo }

const LANGS: { code: Lang; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
]

function LangSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 1,
      background: "var(--of-page-bg)",
      border: "1px solid var(--of-border)",
      borderRadius: 20, padding: "3px 4px",
    }}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          style={{
            fontSize: 11, fontWeight: lang === code ? 700 : 500,
            color: lang === code ? "var(--of-text)" : "var(--of-text-muted)",
            background: lang === code ? "var(--of-surface)" : "transparent",
            border: "none", borderRadius: 14,
            padding: "4px 9px", cursor: "pointer",
            letterSpacing: "0.04em",
            boxShadow: lang === code ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? t("darkModeOff") : t("darkModeOn")}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: "50%",
        background: "var(--of-btn-bg)",
        color: "var(--of-btn-text)",
        border: "none",
        cursor: "pointer",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)"
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.28)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.18)"
      }}
    >
      {isDark ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
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

          <nav style={{ display: "flex", gap: 36 }} className="hidden md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 14, fontWeight: 500,
                  color: "var(--of-text-secondary)",
                  textDecoration: "none", transition: "color 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "var(--of-text)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "var(--of-text-secondary)")}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden md:flex">
            <LangSwitcher />
            <DarkModeToggle />
            <Link
              to="/login"
              style={{
                fontSize: 14, fontWeight: 500,
                color: "var(--of-text-secondary)",
                textDecoration: "none", padding: "8px 16px",
                borderRadius: 8, transition: "color 0.15s, background 0.15s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--of-text)"
                e.currentTarget.style.background = "var(--of-hover)"
              }}
              onMouseOut={(e) => {
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
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--of-btn-hover-bg)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--of-btn-bg)")}
            >
              {t("navComecarGratis")}
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="md:hidden">
            <DarkModeToggle />
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
                  <LangSwitcher />
                </div>
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
