import { motion } from "motion/react"
import { useLanguage } from "../../../lib/language-context"

export default function Problema() {
  const { t } = useLanguage()

  const problemas = [
    { icone: "📊", titulo: t("prob1Title"), texto: t("prob1Text") },
    { icone: "📉", titulo: t("prob2Title"), texto: t("prob2Text") },
    { icone: "🎯", titulo: t("prob3Title"), texto: t("prob3Text") },
  ]

  const stats = [
    { numero: "71%", texto: t("stat1Text"), fonte: t("stat1Fonte") },
    { numero: "67%", texto: t("stat2Text"), fonte: t("stat2Fonte") },
  ]

  return (
    <section style={{ backgroundColor: "var(--of-surface)", padding: "96px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {t("problemTag")}
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 16,
          }}>
            {t("problemH2a")}<br />{t("problemH2b")}
          </h2>
          <p style={{ fontSize: 17, color: "var(--of-text-secondary)", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            {t("problemDesc")}
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 20, marginBottom: 64 }} className="grid grid-cols-1 md:grid-cols-3">
          {problemas.map((p, i) => (
            <motion.div
              key={p.titulo}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 16, padding: "36px 32px" }}
            >
              <div style={{ fontSize: 28, marginBottom: 20, lineHeight: 1 }}>{p.icone}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.01em", marginBottom: 12, lineHeight: 1.3 }}>
                {p.titulo}
              </h3>
              <p style={{ fontSize: 15, color: "var(--of-text-secondary)", lineHeight: 1.65 }}>{p.texto}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
          style={{
            background: "var(--of-page-bg)", border: "1px solid var(--of-border)", borderRadius: 16,
            padding: "36px 48px", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 48,
          }}
        >
          {stats.map((s) => (
            <div key={s.numero} style={{ textAlign: "center", maxWidth: 280 }}>
              <p style={{
                fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 700,
                color: "var(--of-text)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8,
              }}>
                {s.numero}
              </p>
              <p style={{ fontSize: 15, color: "var(--of-text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>{s.texto}</p>
              <p style={{ fontSize: 12, color: "var(--of-text-muted)", fontWeight: 500 }}>
                {t("fontLabel")} {s.fonte}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
