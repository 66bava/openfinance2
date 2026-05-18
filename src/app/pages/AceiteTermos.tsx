import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Check, FileText, Shield } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import { supabase } from "../../lib/supabase"
import { CURRENT_TERMS_VERSION } from "../../lib/terms"

export default function AceiteTermos() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needs, setNeeds] = useState(true)

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then((p) => {
      const ok = p?.consentimento_politica === true && p?.versao_termos_aceita === CURRENT_TERMS_VERSION
      setNeeds(!ok)
      if (ok) {
        navigate("/app", { replace: true })
      }
    }).catch(() => {})
  }, [user?.id, navigate])

  async function handleAccept() {
    if (!user) return
    if (!checked) {
      toast.error("Você precisa aceitar os termos para continuar.")
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()
      const profile = await getProfile(user.id)

      const updateOnce = async (values: Record<string, unknown>) => {
        const { data, error } = await supabase
          .from("profiles")
          .update(values)
          .eq("id", user.id)
          .select("id, onboarding_completo, consentimento_politica, versao_termos_aceita")
          .maybeSingle()

        if (error) throw error
        if (!data) throw new Error("profile_not_updated")
        return data as { onboarding_completo?: boolean | null }
      }

      const baseUpdate = {
        consentimento_politica: true,
        data_consentimento: profile?.data_consentimento ?? now,
      }

      let updatedProfile: { onboarding_completo?: boolean | null } | null = null
      try {
        updatedProfile = await updateOnce({
          ...baseUpdate,
          versao_politica: CURRENT_TERMS_VERSION,
          versao_termos_aceita: CURRENT_TERMS_VERSION,
          data_aceite_termos: now,
        })
      } catch (err: any) {
        const code = typeof err?.code === "string" ? err.code : ""
        const msg = typeof err?.message === "string" ? err.message : ""

        // Banco antigo / schema cache desatualizado: salva o consentimento legado e segue o fluxo
        const isMissingColumns =
          code === "PGRST204" ||
          code === "42703" ||
          msg.includes("schema cache") ||
          msg.includes("Could not find the") ||
          msg.includes("does not exist")

        if (!isMissingColumns) throw err
        updatedProfile = await updateOnce(baseUpdate)
      }

      toast.success("Termos aceitos. Obrigado!")
      setNeeds(false)
      if (updatedProfile && updatedProfile.onboarding_completo !== true) {
        navigate("/app/onboarding", { replace: true })
      } else {
        navigate("/app", { replace: true })
      }
    } catch {
      toast.error("Erro ao registrar aceite. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (!needs) return null

  return (
    <div style={{
      padding: "24px 16px",
      maxWidth: 720,
      margin: "0 auto",
      fontFamily: "var(--font-body)",
    }}>
      <div style={{
        background: "var(--of-surface)",
        border: "1px solid var(--of-border)",
        borderRadius: 18,
        padding: "22px 20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "#16A34A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <FileText size={20} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
              Termos de Uso e Privacidade
            </h1>
            <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 6, lineHeight: 1.6 }}>
              Para continuar, precisamos do seu aceite dos Termos de Uso e da Política de Privacidade (versão {CURRENT_TERMS_VERSION}).
            </p>
          </div>
        </div>

        <div style={{
          marginTop: 16,
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid var(--of-border)",
          background: "var(--of-page-bg)",
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Shield size={18} style={{ color: "var(--of-text-muted)", marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "var(--of-text-secondary)", lineHeight: 1.65 }}>
              <div>
                <Link to="/termos" target="_blank" style={{ color: "#16A34A", fontWeight: 800, textDecoration: "underline" }}>
                  Ler Termos de Uso
                </Link>
              </div>
              <div style={{ marginTop: 6 }}>
                <Link to="/privacidade" target="_blank" style={{ color: "#16A34A", fontWeight: 800, textDecoration: "underline" }}>
                  Ler Política de Privacidade
                </Link>
              </div>
            </div>
          </div>
        </div>

        <label style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          cursor: "pointer",
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid var(--of-border)",
          background: "var(--of-surface)",
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16, accentColor: "#16A34A", flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: "var(--of-text)", lineHeight: 1.55 }}>
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={loading}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 0",
            borderRadius: 14,
            border: "none",
            background: loading ? "var(--of-border)" : "#16A34A",
            color: loading ? "var(--of-text-muted)" : "#fff",
            fontSize: 14,
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Check size={16} />
          {loading ? "Salvando..." : "Aceitar e continuar"}
        </button>
      </div>
    </div>
  )
}
