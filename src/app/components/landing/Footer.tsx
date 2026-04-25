import { Link } from "react-router"

function OpenfyLogoWhite() {
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
        color: "#FFFFFF",
        letterSpacing: "-0.02em",
        fontFamily: "var(--font-display)",
      }}>
        Openfy
      </span>
    </div>
  )
}

const colunaProduto = [
  { label: "Recursos", href: "#recursos" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
]

const colunaLegal = [
  { label: "Política de Privacidade", to: "/privacidade" },
  { label: "Termos de Uso", to: "/termos" },
  { label: "LGPD", to: "/privacidade" },
]

const colunaContato = [
  { label: "suporte@openfy.com.br", href: "mailto:suporte@openfy.com.br" },
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
]

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#0A0A0A",
        padding: "64px 24px 40px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{ marginBottom: 56 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-10"
        >
          {/* Marca */}
          <div className="col-span-2 md:col-span-1">
            <div style={{ marginBottom: 16 }}>
              <OpenfyLogoWhite />
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, maxWidth: 240 }}>
              Saúde financeira em tempo real para brasileiros.
            </p>
          </div>

          {/* Produto */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Produto
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {colunaProduto.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Legal
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {colunaLegal.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Contato
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {colunaContato.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            © 2026 Openfy. Todos os direitos reservados.
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            Feito no Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  )
}
