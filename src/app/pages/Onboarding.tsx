import { useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "../../lib/auth-context"
import { upsertProfile } from "../../lib/queries"
import { supabase } from "../../lib/supabase"
import { ChevronRight, DollarSign, Target, Sparkles, Check } from "lucide-react"

const CATEGORIAS_PADRAO = [
  { icone: "🍽️", nome: "Alimentação", cor: "#F59E0B" },
  { icone: "🚌", nome: "Transporte", cor: "#3B82F6" },
  { icone: "🏠", nome: "Moradia", cor: "#8B5CF6" },
  { icone: "🏥", nome: "Saúde", cor: "#EF4444" },
  { icone: "🎬", nome: "Lazer", cor: "#EC4899" },
  { icone: "📚", nome: "Educação", cor: "#10B981" },
  { icone: "👗", nome: "Vestuário", cor: "#F97316" },
  { icone: "💡", nome: "Contas fixas", cor: "#6366F1" },
]

function formatBRL(value: string) {
  const num = value.replace(/\D/g, "")
  if (!num) return ""
  const n = parseInt(num, 10) / 100
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseBRL(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [nome, setNome] = useState(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""
  )
  const [rendaRaw, setRendaRaw] = useState("")
  const [metaEconomia, setMetaEconomia] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleStep1() {
    if (parseBRL(rendaRaw) <= 0) {
      setError("Informe sua renda mensal para continuar.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await upsertProfile(user!.id, user!.email!, {
        nome: nome.trim() || undefined,
        renda_mensal: parseBRL(rendaRaw),
        meta_economia: metaEconomia,
      })
      setStep(2)
    } catch {
      setError("Erro ao salvar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleFinish(irParaCategorias: boolean) {
    setLoading(true)
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completo: true })
        .eq("id", user!.id)
      navigate(irParaCategorias ? "/app/categorias" : "/app", { replace: true })
    } catch {
      navigate("/app", { replace: true })
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--of-page-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-body)",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo + progress */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <span style={{
              fontFamily: "var(--font-display, sans-serif)",
              fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em",
              color: "var(--of-text)",
            }}>
              open<span style={{ color: "#16A34A" }}>fy</span>
            </span>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {[1, 2].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: s === step ? 28 : 22,
                  height: s === step ? 28 : 22,
                  borderRadius: "50%",
                  background: s < step ? "#16A34A" : s === step ? "#16A34A" : "var(--of-border)",
                  color: s <= step ? "#fff" : "var(--of-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  transition: "all 0.2s",
                }}>
                  {s < step ? <Check size={13} /> : s}
                </div>
                {s < 2 && (
                  <div style={{
                    width: 48, height: 2,
                    background: s < step ? "#16A34A" : "var(--of-border)",
                    borderRadius: 2, transition: "all 0.3s",
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Step 1: Renda ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{
            background: "var(--of-surface)",
            border: "1px solid var(--of-border)",
            borderRadius: 18,
            padding: "32px 28px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #16A34A, #15803D)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Sparkles size={24} style={{ color: "#fff" }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--of-text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Bem-vindo ao Openfy! 🎉
              </h1>
              <p style={{ fontSize: 14, color: "var(--of-text-secondary)", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
                Vamos configurar sua conta para calcular seu <strong style={{ color: "#16A34A" }}>Score de Saúde Financeira</strong> em tempo real.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Nome */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text-muted)", display: "block", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Como posso te chamar?
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  style={{
                    width: "100%", padding: "12px 14px",
                    border: "1.5px solid var(--of-border)", borderRadius: 10,
                    fontSize: 15, color: "var(--of-text)", background: "var(--of-page-bg)",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#16A34A" }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--of-border)" }}
                />
              </div>

              {/* Renda mensal */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text-muted)", display: "block", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Qual é sua renda mensal? *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14, fontWeight: 600, color: "var(--of-text-muted)",
                  }}>
                    R$
                  </span>
                  <input
                    value={rendaRaw}
                    onChange={(e) => {
                      const formatted = formatBRL(e.target.value)
                      setRendaRaw(formatted)
                      if (error) setError("")
                    }}
                    placeholder="0,00"
                    inputMode="numeric"
                    style={{
                      width: "100%", padding: "12px 14px 12px 38px",
                      border: `1.5px solid ${error ? "#EF4444" : "var(--of-border)"}`,
                      borderRadius: 10,
                      fontSize: 15, fontWeight: 600, color: "var(--of-text)",
                      background: "var(--of-page-bg)",
                      outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#16A34A" }}
                    onBlur={(e) => { e.target.style.borderColor = error ? "#EF4444" : "var(--of-border)" }}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 12, color: "#EF4444", marginTop: 5 }}>{error}</p>
                )}
                <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 5 }}>
                  Usado para calcular seu Score de Saúde Financeira. Não compartilhamos seus dados.
                </p>
              </div>

              {/* Meta de economia */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    <Target size={12} style={{ display: "inline", marginRight: 4 }} />
                    Meta de economia mensal
                  </label>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#16A34A" }}>{metaEconomia}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={metaEconomia}
                  onChange={(e) => setMetaEconomia(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#16A34A" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--of-text-muted)" }}>5%</span>
                  <span style={{ fontSize: 10, color: "var(--of-text-muted)" }}>60%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStep1}
              disabled={loading}
              style={{
                width: "100%", marginTop: 24,
                padding: "14px",
                background: "#16A34A", color: "#fff",
                fontWeight: 700, fontSize: 15, border: "none", borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#15803D" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#16A34A" }}
            >
              {loading ? "Salvando…" : (
                <>Continuar <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* ─── Step 2: Categorias ────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{
            background: "var(--of-surface)",
            border: "1px solid var(--of-border)",
            borderRadius: 18,
            padding: "32px 28px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #16A34A, #15803D)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Check size={26} style={{ color: "#fff" }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--of-text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Tudo configurado!
              </h1>
              <p style={{ fontSize: 14, color: "var(--of-text-secondary)", lineHeight: 1.6 }}>
                Seu Score de Saúde Financeira está ativo. Agora organize suas categorias de gastos para análises mais precisas.
              </p>
            </div>

            {/* Preview das categorias padrão */}
            <div style={{
              background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
              borderRadius: 12, padding: "16px", marginBottom: 24,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                Categorias pré-configuradas
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIAS_PADRAO.map((cat) => (
                  <div key={cat.nome} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 20,
                    background: "var(--of-surface)", border: "1px solid var(--of-border)",
                    fontSize: 12, fontWeight: 600, color: "var(--of-text)",
                  }}>
                    <span>{cat.icone}</span>
                    {cat.nome}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => handleFinish(true)}
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: "#16A34A", color: "#fff",
                  fontWeight: 700, fontSize: 14, border: "none", borderRadius: 10,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#15803D" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#16A34A" }}
              >
                <DollarSign size={15} />
                Personalizar minhas categorias
              </button>

              <button
                onClick={() => handleFinish(false)}
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: "var(--of-page-bg)", color: "var(--of-text)",
                  fontWeight: 600, fontSize: 14,
                  border: "1px solid var(--of-border)", borderRadius: 10,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--of-hover, #f0f0f0)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--of-page-bg)" }}
              >
                Ir para o dashboard →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
