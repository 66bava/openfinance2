import { motion } from "motion/react"
import { Lock, ShieldCheck, KeyRound, Server } from "lucide-react"
import { useLanguage } from "../../../lib/language-context"

export default function Security() {
  const { t } = useLanguage()

  const pilares = [
    { icon: <ShieldCheck size={22} color="#16A34A" />, titulo: t("sec1Title"), descricao: t("sec1Desc") },
    { icon: <Lock size={22} color="#16A34A" />, titulo: t("sec2Title"), descricao: t("sec2Desc") },
    { icon: <KeyRound size={22} color="#16A34A" />, titulo: t("sec3Title"), descricao: t("sec3Desc") },
    { icon: <Server size={22} color="#16A34A" />, titulo: t("sec4Title"), descricao: t("sec4Desc") },
  ]

  const checklist = [t("secCheck1"), t("secCheck2"), t("secCheck3"), t("secCheck4")]

  return (
    <section style={{ backgroundColor: "var(--of-page-bg)", borderTop: "1px solid var(--of-border)", padding: "96px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {t("securityTag")}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 16 }}>
            {t("securityH2a")}<br />{t("securityH2b")}
          </h2>
          <p style={{ fontSize: 17, color: "var(--of-text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            {t("securityDesc")}
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 md:grid-cols-2">
          {pilares.map((p, i) => (
            <motion.div
              key={p.titulo}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}
              style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 16, padding: "32px 36px", display: "flex", gap: 20, alignItems: "flex-start" }}
            >
              <div style={{ width: 44, height: 44, background: "var(--of-upgrade-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {p.icon}
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--of-text)", marginBottom: 8, letterSpacing: "-0.01em" }}>{p.titulo}</h3>
                <p style={{ fontSize: 15, color: "var(--of-text-secondary)", lineHeight: 1.65 }}>{p.descricao}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
          style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 32, flexWrap: "wrap", padding: "24px", background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 16 }}
        >
          {checklist.map((item) => (
            <span key={item} style={{ fontSize: 14, color: "var(--of-text-secondary)", fontWeight: 500 }}>{item}</span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
