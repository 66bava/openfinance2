import { useEffect, useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { analisarScore, type ScoreContext } from "../../../lib/openai"
import { useAuth } from "../../../lib/auth-context"
import { consultarConselheiroIa } from "../../../lib/queries/ai-usage"

function renderMarkdown(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function stripDadosConsiderados(text: string) {
  if (!text) return text
  return text.replace(/(\*\*Dados considerados:\*\*[\s\S]*?)(?=\n\*\*|$)/gi, "").trim()
}

export function ScoreAdvisor(ctx: ScoreContext) {
  const { user } = useAuth()
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ usado: number; limite: number; reset_at?: string | null } | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  const remaining = usage
    ? (usage.limite < 0 ? Infinity : Math.max(0, usage.limite - usage.usado))
    : null

  const isAtLimit = remaining === 0

  useEffect(() => {
    if (!user) return
    setUsageLoading(true)
    consultarConselheiroIa(user.id)
      .then((r) => {
        if (r?.success) setUsage({ usado: r.usado, limite: r.limite, reset_at: r.reset_at })
      })
      .catch(() => {})
      .finally(() => setUsageLoading(false))
  }, [user?.id])

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!user) throw new Error("Faça login para usar o Conselheiro IA.")

      const result = await analisarScore(ctx)
      setAnalysis(stripDadosConsiderados(result))
      try {
        const r = await consultarConselheiroIa(user.id)
        if (r?.success) setUsage({ usado: r.usado, limite: r.limite, reset_at: r.reset_at })
      } catch { /* silent */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar à IA. Tente novamente.")
      try {
        if (user) {
          const r = await consultarConselheiroIa(user.id)
          if (r?.success) setUsage({ usado: r.usado, limite: r.limite, reset_at: r.reset_at })
        }
      } catch { /* silent */ }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: "var(--of-surface)",
      borderRadius: 16,
      border: "1px solid var(--of-border)",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: analysis ? "1px solid var(--of-border)" : "none",
        background: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(79,70,229,0.04) 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <Sparkles size={15} style={{ color: "#7C3AED" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--of-text)" }}>Conselheiro IA</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--of-text-muted)", lineHeight: 1.4 }}>
          Entenda seu score e receba um plano de melhoria.
        </p>
        <p style={{ fontSize: 11, color: isAtLimit ? "#F59E0B" : "var(--of-text-muted)", marginTop: 8 }}>
          {usageLoading ? "Carregando limite semanal…" : (
            usage
              ? (usage.limite < 0
                ? "Usos ilimitados no seu plano."
                : isAtLimit
                  ? `Limite atingido. ${usage.reset_at ? `Renova em ${new Date(usage.reset_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}.` : "Renova todo domingo."}`
                  : `${remaining} uso(s) restante(s) esta semana.`)
              : " "
          )}
        </p>
      </div>

      {!analysis && !loading && (
        <div style={{ padding: "14px 18px" }}>
          <button
            onClick={analyze}
            disabled={isAtLimit}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "13px 0",
              background: isAtLimit
                ? "var(--of-page-bg)"
                : "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
              color: isAtLimit ? "var(--of-text-muted)" : "#FFFFFF",
              border: isAtLimit ? "1px solid var(--of-border)" : "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: isAtLimit ? "not-allowed" : "pointer",
              opacity: isAtLimit ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => { if (!isAtLimit) e.currentTarget.style.opacity = "0.88" }}
            onMouseOut={(e) => { if (!isAtLimit) e.currentTarget.style.opacity = "1" }}
          >
            <Sparkles size={14} />
            {isAtLimit ? "Limite semanal atingido" : "Analisar meu score"}
          </button>
          {error && (
            <p style={{ fontSize: 12, color: "#EF4444", marginTop: 10, textAlign: "center", lineHeight: 1.4 }}>
              {error}
            </p>
          )}
        </div>
      )}

      {loading && (
        <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 22, height: 22,
            border: "2.5px solid rgba(124,58,237,0.2)",
            borderTopColor: "#7C3AED",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
          <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>Analisando seu perfil financeiro...</p>
        </div>
      )}

      {analysis && !loading && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 13, color: "var(--of-text)", lineHeight: 1.75 }}>
            {analysis.split("\n").map((line, i) => (
              <p key={i} style={{ marginBottom: line === "" ? 8 : 2 }}>
                {renderMarkdown(line)}
              </p>
            ))}
          </div>
          <button
            onClick={analyze}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              padding: "9px 16px",
              background: "none",
              border: "1px solid var(--of-border)",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--of-text-muted)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={11} />
            Analisar novamente
          </button>
        </div>
      )}
    </div>
  )
}
