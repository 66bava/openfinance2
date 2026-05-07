import { useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { analisarScore, type ScoreContext } from "../../../lib/openai"

function renderMarkdown(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

export function ScoreAdvisor(ctx: ScoreContext) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analisarScore(ctx)
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar à IA. Tente novamente.")
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
      </div>

      {!analysis && !loading && (
        <div style={{ padding: "14px 18px" }}>
          <button
            onClick={analyze}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 0",
              background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Sparkles size={14} />
            Analisar meu score
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
              marginTop: 12,
              padding: "7px 12px",
              background: "none",
              border: "1px solid var(--of-border)",
              borderRadius: 8,
              fontSize: 11,
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
