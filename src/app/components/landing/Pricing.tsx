import { useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { Check } from "lucide-react"
import { useLanguage } from "../../../lib/language-context"

export default function Pricing() {
  const [anual, setAnual] = useState(false)
  const { t } = useLanguage()

  const planos = [
    {
      nome: t("plan1Name"),
      preco: "0",
      precoAnual: "0",
      descricao: t("plan1Desc"),
      features: [t("plan1F1"), t("plan1F2"), t("plan1F3"), t("plan1F4"), t("plan1F5")],
      cta: t("plan1CTA"),
      destaque: false,
    },
    {
      nome: t("plan2Name"),
      preco: "19,90",
      precoAnual: "16,58",
      descricao: t("plan2Desc"),
      features: [t("plan2F1"), t("plan2F2"), t("plan2F3"), t("plan2F4"), t("plan2F5"), t("plan2F6"), t("plan2F7"), t("plan2F8")],
      cta: t("plan2CTA"),
      destaque: true,
      badge: t("plan2Badge"),
    },
    {
      nome: t("plan3Name"),
      preco: "34,90",
      precoAnual: "29,08",
      descricao: t("plan3Desc"),
      features: [t("plan3F1"), t("plan3F2"), t("plan3F3"), t("plan3F4"), t("plan3F5")],
      cta: t("plan3CTA"),
      destaque: false,
    },
  ]

  return (
    <section id="precos" style={{ backgroundColor: "var(--of-page-bg)", padding: "96px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {t("pricingTag")}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.025em", marginBottom: 32 }}>
            {t("pricingH2")}
          </h2>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 40, padding: "6px 20px" }}>
            <button
              onClick={() => setAnual(false)}
              style={{
                fontSize: 14, fontWeight: 600,
                color: !anual ? "var(--of-text)" : "var(--of-text-muted)",
                background: !anual ? "var(--of-page-bg)" : "transparent",
                border: "none", borderRadius: 30, padding: "6px 16px",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {t("pricingMonthly")}
            </button>
            <button
              onClick={() => setAnual(true)}
              style={{
                fontSize: 14, fontWeight: 600,
                color: anual ? "var(--of-text)" : "var(--of-text-muted)",
                background: anual ? "var(--of-page-bg)" : "transparent",
                border: "none", borderRadius: 30, padding: "6px 16px",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {t("pricingAnnual")}
              <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 10 }}>
                {t("pricingAnnualBadge")}
              </span>
            </button>
          </div>
        </motion.div>

        <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 md:grid-cols-3">
          {planos.map((plano, i) => (
            <motion.div
              key={plano.nome}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                background: plano.destaque ? "#0A0A0A" : "var(--of-surface)",
                border: plano.destaque ? "2px solid #16A34A" : "1px solid var(--of-border)",
                borderRadius: 20, padding: 32, position: "relative", display: "flex", flexDirection: "column",
              }}
            >
              {plano.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#16A34A", color: "#FFFFFF", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  {plano.badge}
                </div>
              )}

              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: plano.destaque ? "rgba(255,255,255,0.5)" : "var(--of-text-muted)", marginBottom: 8 }}>
                  {plano.nome}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  {plano.preco !== "0" && (
                    <span style={{ fontSize: 15, color: plano.destaque ? "rgba(255,255,255,0.5)" : "var(--of-text-muted)" }}>R$</span>
                  )}
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 700, color: plano.destaque ? "#FFFFFF" : "var(--of-text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {plano.preco === "0" ? t("pricingFree") : (anual ? plano.precoAnual : plano.preco)}
                  </span>
                  {plano.preco !== "0" && (
                    <span style={{ fontSize: 13, color: plano.destaque ? "rgba(255,255,255,0.4)" : "var(--of-text-muted)" }}>{t("pricingPerMonth")}</span>
                  )}
                </div>
                {anual && plano.preco !== "0" && (
                  <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>{t("pricingAnnualNote")}</p>
                )}
                <p style={{ fontSize: 14, color: plano.destaque ? "rgba(255,255,255,0.5)" : "var(--of-text-secondary)" }}>{plano.descricao}</p>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {plano.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Check size={15} color="#16A34A" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: plano.destaque ? "rgba(255,255,255,0.7)" : "var(--of-text-secondary)", lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                style={{
                  display: "block", textAlign: "center", fontSize: 14, fontWeight: 700,
                  textDecoration: "none", padding: "13px", borderRadius: 10,
                  backgroundColor: plano.destaque ? "#16A34A" : "transparent",
                  color: plano.destaque ? "#FFFFFF" : "var(--of-text)",
                  border: plano.destaque ? "none" : "1.5px solid var(--of-border)",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseOver={(e) => {
                  if (plano.destaque) e.currentTarget.style.backgroundColor = "#15803D"
                  else e.currentTarget.style.borderColor = "var(--of-text)"
                }}
                onMouseOut={(e) => {
                  if (plano.destaque) e.currentTarget.style.backgroundColor = "#16A34A"
                  else e.currentTarget.style.borderColor = "var(--of-border)"
                }}
              >
                {plano.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
