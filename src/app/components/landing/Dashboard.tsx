import { motion } from "motion/react"

export default function Dashboard() {
  return (
    <section
      style={{
        backgroundColor: "#F5F5F0",
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
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#16A34A",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 16,
          }}>
            Dashboard
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.025em",
            marginBottom: 16,
          }}>
            Tudo em um só lugar
          </h2>
          <p style={{ fontSize: 17, color: "#525252", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            Dashboard limpo, rápido e pensado para quem registra tudo e não tem tempo a perder.
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
            border: "1px solid #E5E5E3",
            background: "#FFFFFF",
          }}
        >
          {/* Placeholder até screenshot real chegar */}
          <div style={{
            background: "#F5F5F0",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #E5E5E3",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
            </div>
            <div style={{
              flex: 1,
              background: "#FFFFFF",
              borderRadius: 5,
              padding: "4px 12px",
              fontSize: 11,
              color: "#A3A3A3",
            }}>
              app.openfy.com.br/dashboard
            </div>
          </div>
          <img
            src="/dashboard-preview.png"
            alt="Openfy dashboard preview"
            style={{ width: "100%", display: "block" }}
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = "none"
              const placeholder = document.createElement("div")
              placeholder.style.cssText = "height:480px;display:flex;align-items:center;justify-content:center;background:#FAFAFA;flex-direction:column;gap:12px"
              placeholder.innerHTML = `
                <div style="width:48px;height:48px;background:#E5E5E3;border-radius:12px;display:flex;align-items:center;justify-content:center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="13" width="6" height="9" rx="1" fill="#A3A3A3"/><rect x="9" y="8" width="6" height="14" rx="1" fill="#A3A3A3"/><rect x="16" y="3" width="6" height="19" rx="1" fill="#A3A3A3"/></svg>
                </div>
                <p style="font-size:14px;color:#A3A3A3;font-family:system-ui">Screenshot do dashboard em breve</p>
              `
              el.parentElement?.appendChild(placeholder)
            }}
          />
        </motion.div>
      </div>
    </section>
  )
}
