import { useState, useEffect } from "react"
import { Link } from "react-router"

const links = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Planos", href: "#planos" },
  { label: "Perguntas", href: "#perguntas" },
]

export default function Header() {
  const [rolado, setRolado] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const onScroll = () => setRolado(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Fechar menu ao clicar em um link
  function fecharMenu() {
    setMenuAberto(false)
  }

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: "var(--of-glass-bg)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: rolado ? "1px solid var(--of-border)" : "1px solid transparent",
          transition: "border-color 0.2s",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Marca */}
          <a
            href="/"
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--of-text)",
              letterSpacing: "-0.02em",
              textDecoration: "none",
            }}
          >
            Openfy
          </a>

          {/* Navegação desktop */}
          <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 14,
                  color: "var(--of-text-secondary)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#1A1A1A")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#6B6B6B")}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              style={{
                fontSize: 14,
                color: "var(--of-text-secondary)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#6B6B6B")}
            >
              Entrar
            </Link>
            <Link
              to="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--of-btn-text)",
                backgroundColor: "var(--of-btn-bg)",
                padding: "9px 20px",
                borderRadius: 6,
                textDecoration: "none",
                transition: "background-color 0.15s",
                minHeight: 44,
                display: "flex",
                alignItems: "center",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#333333")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1A1A1A")}
            >
              Criar conta
            </Link>
          </nav>

          {/* Botão hamburger mobile */}
          <button
            className="md:hidden"
            onClick={() => setMenuAberto(!menuAberto)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          >
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
              {menuAberto ? (
                <>
                  <line x1="1" y1="1" x2="21" y2="15" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
                  <line x1="21" y1="1" x2="1" y2="15" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="0" y1="2" x2="22" y2="2" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="8" x2="22" y2="8" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="14" x2="22" y2="14" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Drawer mobile */}
      {menuAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 199,
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
          onClick={fecharMenu}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(320px, 85vw)",
              backgroundColor: "var(--of-surface)",
              padding: "80px 32px 40px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
              fontFamily: "var(--font-body)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={fecharMenu}
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--of-text)",
                  textDecoration: "none",
                  padding: "14px 0",
                  borderBottom: "1px solid var(--of-border)",
                  display: "block",
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                to="/login"
                onClick={fecharMenu}
                style={{
                  textAlign: "center",
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--of-text)",
                  border: "1.5px solid var(--of-border)",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                Entrar
              </Link>
              <Link
                to="/login"
                onClick={fecharMenu}
                style={{
                  textAlign: "center",
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--of-btn-text)",
                  backgroundColor: "var(--of-btn-bg)",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
