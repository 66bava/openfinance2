import { motion } from "motion/react"
import { useLanguage } from "../../../lib/language-context"

export default function Solucao() {
  const { t } = useLanguage()

  const pilares = [
    {
      tag: t("pilar1Tag"), titulo: t("pilar1Title"), descricao: t("pilar1Desc"),
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#16A34A" strokeWidth="2" />
          <path d="M12 7v5l3 3" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      tag: t("pilar2Tag"), titulo: t("pilar2Title"), descricao: t("pilar2Desc"),
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      tag: t("pilar3Tag"), titulo: t("pilar3Title"), descricao: t("pilar3Desc"),
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  return (
    <section id="como-funciona" style={{ backgroundColor: "var(--of-dark-section)", padding: "96px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {t("solucaoTag")}
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 16,
          }}>
            {t("solucaoH2")}
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            {t("solucaoDesc")}
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 md:grid-cols-3">
          {pilares.map((p, i) => (
            <motion.div
              key={p.tag}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: "40px 36px", position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #16A34A, transparent)", opacity: 0.6 }} />
              <div style={{ width: 48, height: 48, background: "rgba(22,163,74,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                {p.icone}
              </div>
              <div style={{ display: "inline-flex", fontSize: 11, fontWeight: 700, color: "#16A34A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "rgba(22,163,74,0.1)", padding: "3px 10px", borderRadius: 20 }}>
                {p.tag}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#FFFFFF", marginBottom: 14, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                {p.titulo}
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{p.descricao}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginTop: 48, padding: "24px 32px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", borderRadius: 16, textAlign: "center" }}
        >
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
            <span style={{ color: "#16A34A", fontWeight: 600 }}>{t("solucaoCicloLabel")} </span>
            {t("solucaoCicloText")}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
