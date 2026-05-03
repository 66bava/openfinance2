import { motion } from "motion/react"
import { useLanguage } from "../../../lib/language-context"

export default function SocialProof() {
  const { t } = useLanguage()

  const metricas = [
    { numero: t("spNum1"), label: t("spLabel1"), detalhe: t("spDetail1") },
    { numero: t("spNum2"), label: t("spLabel2"), detalhe: t("spDetail2") },
    { numero: t("spNum3"), label: t("spLabel3"), detalhe: t("spDetail3") },
  ]

  return (
    <section style={{
      borderTop: "1px solid var(--of-border)", borderBottom: "1px solid var(--of-border)",
      padding: "48px 24px", fontFamily: "var(--font-body)",
      backgroundColor: "var(--of-page-bg)",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}
          className="grid grid-cols-1 md:grid-cols-3"
        >
          {metricas.map((m, i) => (
            <div
              key={m.label}
              style={{
                textAlign: "center", padding: "24px 32px",
                borderRight: i < metricas.length - 1 ? "1px solid var(--of-border)" : "none",
              }}
              className={i < metricas.length - 1 ? "border-b md:border-b-0 border-[var(--of-border)]" : ""}
            >
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 700,
                color: "var(--of-text)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6,
              }}>
                {m.numero}
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)", marginBottom: 4 }}>
                {m.label}
              </p>
              <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{m.detalhe}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
