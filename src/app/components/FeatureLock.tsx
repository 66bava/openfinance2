import { Lock } from "lucide-react"
import { useNavigate } from "react-router"
import { useLanguage } from "../../lib/language-context"
import type { TranslationKey } from "../../lib/i18n"

interface Props {
  requiredPlan?: "pro" | "familia"
  message?: string
  messageKey?: TranslationKey
}

export function FeatureLock({
  requiredPlan = "pro",
  message,
  messageKey,
}: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const lockMessage = messageKey
    ? t(messageKey)
    : message ?? t(requiredPlan === "familia" ? "featureLockFamilyDefault" : "featureLockProDefault")

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
        backgroundColor: "var(--of-page-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
        border: "1px solid var(--of-border)",
      }}>
        <Lock size={28} style={{ color: "var(--of-text-muted)" }} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--of-text)", marginBottom: 8 }}>
        {t("featureLockTitle")}
      </h3>
      <p style={{ fontSize: 14, color: "var(--of-text-secondary)", marginBottom: 28, maxWidth: 360, lineHeight: 1.6 }}>
        {lockMessage}
      </p>
      <button
        onClick={() => navigate("/app/perfil")}
        style={{
          padding: "11px 28px",
          backgroundColor: "#16A34A",
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          borderRadius: 9,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#15803D" }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#16A34A" }}
      >
        {t("featureLockCTA")}
      </button>
    </div>
  )
}
