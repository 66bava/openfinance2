import { useState, FormEvent } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { toast } from "sonner"
import { supabase } from "../../../lib/supabase"
import { CheckCircle } from "lucide-react"
import { useLanguage } from "../../../lib/language-context"

function WaitlistCTA() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")
  const { t } = useLanguage()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus("loading")
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), fonte: "cta-final" })

    if (!error) {
      setStatus("success")
      toast.success(t("ctaSuccess"))
    } else if (error.code === "23505") {
      setStatus("success")
      toast.info(t("ctaSuccess"))
    } else {
      setStatus("idle")
      toast.error(t("wlError"))
    }
  }

  if (status === "success") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 12, maxWidth: 460, margin: "0 auto" }}>
        <CheckCircle size={20} color="#16A34A" />
        <p style={{ fontSize: 14, fontWeight: 600, color: "#DCFCE7" }}>{t("ctaSuccess")}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 460, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label htmlFor="cta-email" className="sr-only">Email</label>
        <input
          id="cta-email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com" required autoComplete="email"
          disabled={status === "loading"}
          style={{
            flex: 1, minWidth: 200, padding: "13px 16px", fontSize: 15,
            backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, color: "var(--of-btn-text)", outline: "none", fontFamily: "var(--font-body)",
          }}
          className="placeholder:text-white/40 focus:border-white/50"
        />
        <button
          type="submit" disabled={status === "loading"}
          style={{
            padding: "13px 24px", backgroundColor: "#16A34A", color: "var(--of-btn-text)",
            fontSize: 14, fontWeight: 700, border: "none", borderRadius: 8,
            cursor: status === "loading" ? "not-allowed" : "pointer", whiteSpace: "nowrap",
            opacity: status === "loading" ? 0.7 : 1, fontFamily: "var(--font-body)",
            minHeight: 48, transition: "opacity 0.15s, background 0.15s",
          }}
          onMouseOver={(e) => status !== "loading" && (e.currentTarget.style.backgroundColor = "#15803D")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#16A34A")}
        >
          {status === "loading" ? t("ctaWaitlistSaving") : t("ctaWaitlistBtn")}
        </button>
      </div>
    </form>
  )
}

export default function CTA() {
  const { t } = useLanguage()

  return (
    <section style={{ backgroundColor: "var(--of-dark-section)", padding: "112px 24px", textAlign: "center", fontFamily: "var(--font-body)", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
            {t("ctaTag")}
          </span>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 20 }}>
            {t("ctaH2a")}<br />{t("ctaH2b")}
          </h2>

          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", marginBottom: 48, lineHeight: 1.6 }}>
            {t("ctaDesc")}
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
            <Link
              to="/login"
              style={{ display: "inline-flex", alignItems: "center", backgroundColor: "var(--of-surface)", color: "var(--of-text)", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 8, textDecoration: "none", minHeight: 48, transition: "transform 0.15s" }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
            >
              {t("ctaCriarConta")}
            </Link>
            <a
              href="mailto:suporte@financeapp.com.br"
              style={{ display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 500, padding: "14px 32px", borderRadius: 8, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.2)", minHeight: 48, transition: "border-color 0.15s" }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
            >
              {t("ctaFalar")}
            </a>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 36 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              {t("ctaWaitlistLabel")}
            </p>
            <WaitlistCTA />
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>
              {t("ctaWaitlistJoin")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
