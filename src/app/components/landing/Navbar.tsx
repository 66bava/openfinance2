import { useState, useEffect } from "react"
import { Link } from "react-router"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Recursos", href: "#recursos" },
  { label: "Score", href: "#score" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
]

function OpenfyLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 28,
        height: 28,
        background: "#16A34A",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0" y="8" width="4" height="6" rx="1" fill="white" />
          <rect x="5" y="4" width="4" height="10" rx="1" fill="white" />
          <rect x="10" y="0" width="4" height="14" rx="1" fill="white" />
        </svg>
      </div>
      <span style={{
        fontSize: 17,
        fontWeight: 700,
        color: dark ? "#FFFFFF" : "#0A0A0A",
        letterSpacing: "-0.02em",
        fontFamily: "var(--font-display)",
      }}>
        Openfy
      </span>
    </div>
  )
}

export { OpenfyLogo }

export default function Navbar() {
  const [rolado, setRolado] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const handler = () => setRolado(window.scrollY > 50)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          transition: "all 0.25s ease",
          backgroundColor: rolado ? "rgba(255,255,255,0.97)" : "transparent",
          backdropFilter: rolado ? "blur(12px)" : "none",
          boxShadow: rolado ? "0 1px 0 rgba(0,0,0,0.07)" : "none",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#525252",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#0A0A0A")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#525252")}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden md:flex">
            <Link
              to="/login"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#525252",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: 8,
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "#0A0A0A"
                e.currentTarget.style.background = "#F5F5F5"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#525252"
                e.currentTarget.style.background = "transparent"
              }}
            >
              Entrar
            </Link>
            <Link
              to="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                textDecoration: "none",
                padding: "8px 20px",
                borderRadius: 8,
                backgroundColor: "#0A0A0A",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#262626")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0A0A0A")}
            >
              Começar Grátis
            </Link>
          </div>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "#0A0A0A",
            }}
            className="md:hidden"
            aria-label="Menu"
          >
            {menuAberto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuAberto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                backgroundColor: "#FFFFFF",
                borderTop: "1px solid #E5E5E3",
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
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#0A0A0A",
                      textDecoration: "none",
                      padding: "12px 0",
                      borderBottom: "1px solid #F5F5F5",
                    }}
                  >
                    {link.label}
                  </a>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Link
                    to="/login"
                    onClick={() => setMenuAberto(false)}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0A0A0A",
                      textDecoration: "none",
                      padding: "12px",
                      borderRadius: 8,
                      border: "1.5px solid #E5E5E3",
                    }}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMenuAberto(false)}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#FFFFFF",
                      textDecoration: "none",
                      padding: "12px",
                      borderRadius: 8,
                      backgroundColor: "#0A0A0A",
                    }}
                  >
                    Começar Grátis
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
