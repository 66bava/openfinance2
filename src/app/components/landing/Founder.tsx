import { motion } from "motion/react"
import { useLanguage } from "../../../lib/language-context"

function OpenfyIcon() {
  return (
    <div style={{ width: 48, height: 48, background: "#16A34A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
        <rect x="0" y="8" width="4" height="6" rx="1" fill="white" />
        <rect x="5" y="4" width="4" height="10" rx="1" fill="white" />
        <rect x="10" y="0" width="4" height="14" rx="1" fill="white" />
      </svg>
    </div>
  )
}

export default function Founder() {
  const { t } = useLanguage()

  const timeline = [
    { data: "Set 2024", evento: t("timelineIdeia") },
    { data: "Nov 2024", evento: t("timelineCommit") },
    { data: "Jan 2025", evento: t("timelineScore") },
    { data: "Mar 2025", evento: t("timelineAI") },
    { data: "Abr 2025", evento: t("timelineBeta") },
    { data: "2026", evento: t("timelineScale") },
  ]

  return (
    <section style={{ backgroundColor: "var(--of-surface)", padding: "96px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 80, alignItems: "start" }} className="grid grid-cols-1 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
              {t("founderTag")}
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 32 }}>
              {t("founderH2")}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 16, color: "var(--of-text-secondary)", lineHeight: 1.75 }}>{t("founderP1")}</p>

              <div style={{ background: "var(--of-page-bg)", border: "1px solid var(--of-border)", borderLeft: "3px solid var(--of-text)", borderRadius: "0 12px 12px 0", padding: "20px 24px" }}>
                <p style={{ fontSize: 15, color: "var(--of-text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {t("founderQ1")}<br />
                  {t("founderQ2")}<br />
                  <strong style={{ color: "var(--of-text)" }}>{t("founderQ3")}</strong>
                </p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--of-text)", marginTop: 12, marginBottom: 0, letterSpacing: "-0.02em" }}>
                  {t("founderQuestion")}
                </p>
              </div>

              <p style={{ fontSize: 16, color: "var(--of-text-secondary)", lineHeight: 1.75 }}>{t("founderP2")}</p>
              <p style={{ fontSize: 16, color: "var(--of-text-secondary)", lineHeight: 1.75 }}>{t("founderP3")}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
            <div style={{ background: "var(--of-page-bg)", border: "1px solid var(--of-border)", borderRadius: 20, padding: "36px 32px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <OpenfyIcon />
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--of-text)", marginBottom: 2 }}>Openfy</p>
                  <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{t("founderDev")}</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {timeline.map((item, i) => (
                  <div key={item.data} style={{ display: "flex", alignItems: "flex-start", gap: 16, paddingBottom: i < timeline.length - 1 ? 20 : 0, position: "relative" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: i === timeline.length - 1 ? "#16A34A" : "var(--of-text)",
                        border: i === timeline.length - 1 ? "none" : "2px solid var(--of-text)",
                        flexShrink: 0, marginTop: 3,
                      }} />
                      {i < timeline.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: "var(--of-border)", marginTop: 4, minHeight: 28 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 0 }}>
                      <span style={{ fontSize: 12, color: "var(--of-text-muted)", fontWeight: 500 }}>{item.data}</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: i === timeline.length - 1 ? "#16A34A" : "var(--of-text)", margin: 0, lineHeight: 1.4 }}>
                        {item.evento}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--of-dark-section)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🇧🇷</span>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                {t("founderBrazil")}{" "}
                <strong style={{ color: "#FFFFFF" }}>{t("founderBrazilBold")}</strong>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
