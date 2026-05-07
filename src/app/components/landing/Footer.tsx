import { Link } from "react-router"
import { useLanguage } from "../../../lib/language-context"

function OpenfyLogoWhite() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, background: "#16A34A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0" y="8" width="4" height="6" rx="1" fill="white" />
          <rect x="5" y="4" width="4" height="10" rx="1" fill="white" />
          <rect x="10" y="0" width="4" height="14" rx="1" fill="white" />
        </svg>
      </div>
      <span style={{ fontSize: 17, fontWeight: 700, color: "var(--of-btn-text)", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>
        Openfy
      </span>
    </div>
  )
}

export default function Footer() {
  const { t } = useLanguage()

  const colunaProduto = [
    { label: t("navRecursos"), href: "#recursos" },
    { label: t("navPrecos"), href: "#precos" },
    { label: t("navFAQ"), href: "#faq" },
  ]

  const colunaLegal = [
    { label: t("footerPrivacy"), to: "/privacidade" },
    { label: t("footerTerms"), to: "/termos" },
    { label: t("footerLGPD"), to: "/privacidade" },
  ]

  const colunaContato = [
    { label: "suporte@openfy.com.br", href: "mailto:suporte@openfy.com.br" },
    { label: "Instagram", href: "#" },
    { label: "LinkedIn", href: "#" },
  ]

  return (
    <footer style={{ backgroundColor: "var(--of-dark-section)", padding: "64px 24px 40px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 56 }} className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div style={{ marginBottom: 16 }}><OpenfyLogoWhite /></div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, maxWidth: 240 }}>
              {t("footerDesc")}
            </p>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {t("footerProduct")}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {colunaProduto.map((item) => (
                <li key={item.label}>
                  <a href={item.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {t("footerLegal")}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {colunaLegal.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {t("footerContact")}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {colunaContato.map((item) => (
                <li key={item.label}>
                  <a href={item.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>{t("footerRights")}</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>{t("footerMade")}</p>
        </div>
      </div>
    </footer>
  )
}
