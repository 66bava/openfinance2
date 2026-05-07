import { useState, useEffect, FormEvent } from "react"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../lib/language-context"

interface Props {
  variant?: "light" | "dark"
  showCounter?: boolean
  fonte?: string
}

export default function WaitlistForm({ variant = "light", showCounter = false, fonte = "landing" }: Props) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "exists" | "error">("idle")
  const [message, setMessage] = useState("")
  const [contador, setContador] = useState<number | null>(null)
  const escuro = variant === "dark"
  const { t } = useLanguage()

  useEffect(() => {
    if (!showCounter) return
    supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => { if (count !== null) setContador(count) })
  }, [showCounter])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus("loading")
    const { error } = await supabase.from("waitlist").insert({
      email: email.trim().toLowerCase(),
      nome: nome.trim() || null,
      telefone: telefone.trim() || null,
      fonte,
    })
    if (!error) {
      setStatus("success")
      setMessage(t("wlSuccess"))
    } else if (error.code === "23505") {
      setStatus("exists")
      setMessage(t("wlExists"))
    } else {
      setStatus("error")
      setMessage(t("wlError"))
    }
  }

  const inputStyle = (dark: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 16px", fontSize: 15,
    border: `1px solid ${dark ? "#333333" : "#E5E5E3"}`,
    borderRadius: 8, outline: "none",
    backgroundColor: dark ? "#1A1A1A" : "#FFFFFF",
    color: dark ? "#FFFFFF" : "#1A1A1A",
    fontFamily: "var(--font-body)", boxSizing: "border-box" as const,
  })

  if (status === "success" || status === "exists") {
    return (
      <div style={{ padding: "16px 20px", borderRadius: 10, backgroundColor: escuro ? "rgba(22,163,74,0.15)" : "#F0FDF4", border: `1px solid ${escuro ? "#15803D" : "#BBF7D0"}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <p style={{ fontSize: 14, fontWeight: 600, color: status === "success" ? (escuro ? "#4ADE80" : "#16A34A") : (escuro ? "rgba(255,255,255,0.6)" : "#6B6B6B"), margin: 0 }}>
          {message}
        </p>
      </div>
    )
  }

  return (
    <div>
      {showCounter && contador !== null && (
        <p style={{ fontSize: 13, color: escuro ? "rgba(255,255,255,0.45)" : "#6B6B6B", marginBottom: 12 }}>
          {contador.toLocaleString("pt-BR")} {t("wlCounter")}
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label htmlFor={`waitlist-nome-${fonte}`} className="sr-only">{t("wlNomePlaceholder")}</label>
          <input
            id={`waitlist-nome-${fonte}`} type="text" value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("wlNomePlaceholder")} required autoComplete="name"
            style={inputStyle(escuro)}
          />
        </div>
        <div>
          <label htmlFor={`waitlist-email-${fonte}`} className="sr-only">Email</label>
          <input
            id={`waitlist-email-${fonte}`} type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("wlEmailPlaceholder")} required autoComplete="email"
            style={inputStyle(escuro)}
          />
        </div>
        <div>
          <label htmlFor={`waitlist-tel-${fonte}`} className="sr-only">{t("wlTelPlaceholder")}</label>
          <input
            id={`waitlist-tel-${fonte}`} type="tel" value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder={t("wlTelPlaceholder")} required autoComplete="tel"
            style={inputStyle(escuro)}
          />
        </div>
        <button
          type="submit" disabled={status === "loading"}
          style={{
            padding: "13px 22px", backgroundColor: "#16A34A", color: "var(--of-btn-text)",
            fontSize: 15, fontWeight: 700, border: "none", borderRadius: 8,
            cursor: status === "loading" ? "not-allowed" : "pointer",
            opacity: status === "loading" ? 0.65 : 1, fontFamily: "var(--font-body)",
            transition: "background 0.2s, opacity 0.2s", letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => { if (status !== "loading") e.currentTarget.style.backgroundColor = "#15803D" }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#16A34A" }}
        >
          {status === "loading" ? t("wlLoading") : t("wlBtn")}
        </button>
      </form>
      {status === "error" && (
        <p style={{ fontSize: 12, color: escuro ? "#FCA5A5" : "#DC2626", marginTop: 8 }}>{message}</p>
      )}
    </div>
  )
}
