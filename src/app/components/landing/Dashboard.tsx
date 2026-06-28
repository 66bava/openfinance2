import { useState } from "react"
import { motion } from "motion/react"
import { useLanguage } from "../../../lib/language-context"

export default function Dashboard() {
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)
  return (
    <section
      style={{
        backgroundColor: "var(--of-page-bg)",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {t("dashboardTag")}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.025em", marginBottom: 16 }}>
            {t("dashboardH2")}
          </h2>
          <p style={{ fontSize: 17, color: "var(--of-text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            {t("dashboardDesc")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05)",
            border: "1px solid var(--of-border)",
            background: "var(--of-surface)",
          }}
        >
          {/* Placeholder até screenshot real chegar */}
          <div style={{
            background: "var(--of-page-bg)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--of-border)",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
            </div>
            <div style={{
              flex: 1,
              background: "var(--of-surface)",
              borderRadius: 5,
              padding: "4px 12px",
              fontSize: 11,
              color: "var(--of-text-muted)",
            }}>
              app.financeapp.com.br/dashboard
            </div>
          </div>
          {imgError ? (
            <div style={{
              height: 480, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--of-page-bg)", flexDirection: "column", gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, background: "var(--of-border)",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="13" width="6" height="9" rx="1" fill="var(--of-text-muted)" />
                  <rect x="9" y="8" width="6" height="14" rx="1" fill="var(--of-text-muted)" />
                  <rect x="16" y="3" width="6" height="19" rx="1" fill="var(--of-text-muted)" />
                </svg>
              </div>
              <p style={{ fontSize: 14, color: "var(--of-text-muted)", fontFamily: "system-ui" }}>
                Screenshot do dashboard em breve
              </p>
            </div>
          ) : (
            <img
              src="/dashboard-preview.png"
              alt="Finance App dashboard preview"
              style={{ width: "100%", display: "block" }}
              onError={() => setImgError(true)}
            />
          )}
        </motion.div>
      </div>
    </section>
  )
}
