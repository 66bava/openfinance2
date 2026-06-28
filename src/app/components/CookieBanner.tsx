import { useState, useEffect } from "react"
import { X } from "lucide-react"

const STORAGE_KEY = "financeapp_cookie_consent"

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted")
    setVisible(false)
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 40px)",
        maxWidth: 560,
        background: "var(--of-btn-bg)",
        borderRadius: 14,
        padding: "18px 20px",
        zIndex: 9999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <p style={{ fontSize: 13, color: "#D4D4D4", lineHeight: 1.6, margin: 0 }}>
          Usamos cookies essenciais para manter sua sessão e melhorar sua experiência. Consulte nossa{" "}
          <a href="/privacidade" style={{ color: "#4ADE80", textDecoration: "underline" }}>
            Política de Privacidade
          </a>
          .
        </p>
        <button
          onClick={reject}
          aria-label="Fechar"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--of-text-muted)", flexShrink: 0, padding: 2, display: "flex",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={reject}
          style={{
            flex: 1, padding: "9px 0", border: "1px solid #404040",
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            color: "var(--of-text-muted)", background: "transparent", cursor: "pointer",
          }}
        >
          Apenas essenciais
        </button>
        <button
          onClick={accept}
          style={{
            flex: 1, padding: "9px 0", border: "none",
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: "var(--of-text)", background: "#4ADE80", cursor: "pointer",
          }}
        >
          Aceitar todos
        </button>
      </div>
    </div>
  )
}
