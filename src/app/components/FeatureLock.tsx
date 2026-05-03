import { Lock } from "lucide-react"
import { useNavigate } from "react-router"

interface Props {
  requiredPlan?: "pro" | "familia"
  message?: string
}

export function FeatureLock({
  requiredPlan = "pro",
  message = "Esta funcionalidade está disponível apenas no plano Pro.",
}: Props) {
  const navigate = useNavigate()

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "64px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        backgroundColor: "#F5F5F0",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
        <Lock size={28} style={{ color: "var(--of-text-muted)" }} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--of-text)", marginBottom: 8 }}>
        Recurso bloqueado
      </h3>
      <p style={{ fontSize: 14, color: "var(--of-text-secondary)", marginBottom: 28, maxWidth: 360, lineHeight: 1.6 }}>
        {message}
      </p>
      <button
        onClick={() => navigate("/app/perfil")}
        style={{
          padding: "11px 28px",
          backgroundColor: "#16A34A",
          color: "var(--of-btn-text)",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          borderRadius: 9,
          cursor: "pointer",
          transition: "background 0.15s",
          letterSpacing: "-0.01em",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#15803D" }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#16A34A" }}
      >
        Fazer upgrade agora
      </button>
    </div>
  )
}
