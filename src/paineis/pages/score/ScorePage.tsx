import { useEffect, useMemo, useState } from "react"
import { useOutletContext } from "react-router"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { getUserFinancialSnapshot } from "../../../lib/queries"
import { calculateFinancialScore } from "../../../score-engine"
import type { ScoreResult } from "../../../score-engine"
import { PanelLoader } from "../../components/PanelLoader"
import type { AppOutletContext } from "../../../app/components/Layout"

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function scoreTone(score: number): { label: string; color: string } {
  if (score >= 850) return { label: "Excelente", color: "#16A34A" }
  if (score >= 700) return { label: "Ótimo", color: "#22C55E" }
  if (score >= 400) return { label: "Regular", color: "#F59E0B" }
  return { label: "Crítico", color: "#EF4444" }
}

function deltaLabel(delta: number | null) {
  if (delta == null) return "—"
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `−${Math.abs(delta)}`
  return "0"
}

function pickFactorItems(res: ScoreResult): Array<{ kind: "pos" | "neg" | "neutral"; title: string; message: string; pts?: number }> {
  const pos = (res.opportunities ?? []).slice(0, 2).map((x) => ({ kind: "pos" as const, title: x.title, message: x.message }))
  const neg = (res.issues ?? []).slice(0, 2).map((x) => ({ kind: "neg" as const, title: x.title, message: x.message }))
  const out = [...pos, ...neg]
  if (out.length === 0) {
    return [{ kind: "neutral", title: "Dados insuficientes", message: "Adicione transações e finalize o onboarding para um score mais preciso." }]
  }
  return out.slice(0, 4)
}

function explainScore(res: ScoreResult) {
  const econ = res.metrics.economiaPct
  const burden = res.metrics.burdenRecorrenciasPct
  const gastosPct = res.metrics.gastosSobreRendaPct
  const parts: string[] = []
  if (gastosPct != null) parts.push(`Seus gastos estão em ${Math.round(gastosPct)}% da renda de referência.`)
  if (Number.isFinite(econ)) parts.push(`Sua economia está em ${Math.round(econ)}%.`)
  if (burden != null) parts.push(`Recorrências pesam ${Math.round(burden)}% da renda.`)
  if (parts.length === 0) return "Dados insuficientes para explicar o score. Registre entradas/saídas e configure sua renda mensal."
  return parts.join(" ")
}

function scoreFromIncomeExpenses(income: number, expenses: number) {
  return calculateFinancialScore({ totalRendaPeriodo: income, totalGastosPeriodo: expenses }).score
}

export default function ScorePage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { syncNonce } = useOutletContext<AppOutletContext>()
  const [loading, setLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<{ score: ScoreResult; totals: { totalRenda: number; totalGastos: number }; evolucao: Array<{ month: string; income: number; expenses: number }> } | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    setLoading(true)
    getUserFinancialSnapshot(userId, { kind: "current_cycle" }, { evolucaoMeses: 12 })
      .then((snap) => {
        setSnapshot({
          score: snap.score,
          totals: { totalRenda: snap.totals.totalRenda, totalGastos: snap.totals.totalGastos },
          evolucao: snap.evolucao || [],
        })
      })
      .finally(() => setLoading(false))
  }, [user?.id, syncNonce])

  const scoreResult = snapshot?.score ?? null
  const currentScore = scoreResult?.score ?? 0
  const tone = scoreTone(currentScore)
  const p = clamp01(currentScore / 1000)

  const trendScores = useMemo(() => {
    const rows = (snapshot?.evolucao || []).map((e) => {
      // histórico rápido só com renda/gastos do ciclo; sem contexto de investimentos/recorrências
      return { month: e.month, score: scoreFromIncomeExpenses(Number(e.income) || 0, Number(e.expenses) || 0) }
    })
    return rows.slice(-12)
  }, [snapshot?.evolucao])

  const prevScore = trendScores.length >= 2 ? trendScores[trendScores.length - 2]!.score : null
  const deltaCycle = prevScore == null ? null : currentScore - prevScore

  const factors = useMemo(() => (scoreResult ? pickFactorItems(scoreResult) : [{ kind: "neutral" as const, title: "Dados insuficientes", message: "Adicione transações para calcular o score." }]), [scoreResult])
  const actions = scoreResult?.quickActions ?? []

  const arcLen = 282.7
  const dashOffset = (1 - p) * arcLen
  const r = 90
  const cx = 110
  const cy = 120
  const theta = Math.PI * (1 - p) // 180..0
  const tipX = cx + r * Math.cos(theta)
  const tipY = cy - r * Math.sin(theta)

  const tier = useMemo(() => {
    if (currentScore >= 800) return "excelente"
    if (currentScore >= 600) return "muito_bom"
    if (currentScore >= 400) return "regular"
    return "critico"
  }, [currentScore])

  if (!user) return null
  if (loading) return <PanelLoader />

  const empty = (snapshot?.totals.totalRenda ?? 0) === 0 && (snapshot?.totals.totalGastos ?? 0) === 0
  if (empty) {
    return (
      <div className="ofx-score">
        <div className="page">
          <div className="card">
            <div className="card-body" style={{ color: "var(--t2)", lineHeight: 1.65 }}>
              Sem dados suficientes para calcular o Score. Adicione transações (entradas e saídas) ou finalize seu onboarding.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ofx-score">
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Score</div>
            <div className="page-sub">Saúde financeira (0–1000) com base nos seus dados reais.</div>
          </div>
        </div>

        <div className="main-grid">
          <div className="score-hero">
            <div className="score-period">SAÚDE FINANCEIRA · FINANCE APP</div>

            <div className="gauge-wrap" aria-label="Gauge do score">
              <svg viewBox="0 0 220 136" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M20 120 A90 90 0 0 1 200 120"
                  stroke="rgba(255,255,255,.05)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M20 120 A90 90 0 0 1 200 120"
                  stroke="url(#g1)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={String(arcLen)}
                  strokeDashoffset={String(dashOffset)}
                />
                <defs>
                  <linearGradient id="g1" x1="20" y1="120" x2="200" y2="120">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#16A34A" />
                  </linearGradient>
                </defs>

                <circle cx={tipX} cy={tipY} r="8" fill={tone.color} opacity=".5" filter="blur(4px)" />
                <circle cx={tipX} cy={tipY} r="5" fill={tone.color} />
              </svg>
              <div className="gauge-number">{currentScore}</div>
            </div>

            <div className="gauge-label" style={{ color: tone.color }}>{tone.label}</div>
            <div className="gauge-max">de 1.000 pontos</div>

            <div className="score-delta" style={{ borderColor: "rgba(34,197,94,.2)", color: tone.color }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {deltaCycle == null ? "—" : `${deltaLabel(deltaCycle)} pts este ciclo`}
            </div>

            <div className="score-range">
              <div className="range-bar">
                <div className="range-marker" style={{ left: `${Math.round(p * 100)}%`, borderColor: tone.color }} />
              </div>
              <div className="range-labels">
                <span>0</span>
                <span>300</span>
                <span>500</span>
                <span>700</span>
                <span>1000</span>
              </div>
            </div>

            <div className="score-tiers">
              <div className={["tier", tier === "critico" ? "active" : ""].filter(Boolean).join(" ")}>
                <div className="tier-range">0–399</div>
                <div className="tier-name" style={{ color: "var(--red)" }}>Crítico</div>
              </div>
              <div className={["tier", tier === "regular" ? "active" : ""].filter(Boolean).join(" ")}>
                <div className="tier-range">400–599</div>
                <div className="tier-name" style={{ color: "var(--amber)" }}>Regular</div>
              </div>
              <div className={["tier", tier === "muito_bom" ? "active" : ""].filter(Boolean).join(" ")}>
                <div className="tier-range">600–799</div>
                <div className="tier-name">Muito bom</div>
              </div>
              <div className={["tier", tier === "excelente" ? "active" : ""].filter(Boolean).join(" ")}>
                <div className="tier-range">800+</div>
                <div className="tier-name" style={{ color: "var(--green-b)" }}>Excelente</div>
              </div>
            </div>
          </div>

          <div className="right-col">
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  Evolução do Score
                </div>
                <span className="card-action">{trendScores.length >= 10 ? "12 meses" : `${trendScores.length} ciclos`}</span>
              </div>
              <div className="card-body">
                <div className="sparkline-wrap">
                  <svg viewBox="0 0 600 80" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="600" y2="0">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="70%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="#16A34A" />
                      </linearGradient>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16A34A" stopOpacity=".15" />
                        <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const pts = trendScores.length > 0 ? trendScores : [{ month: "—", score: currentScore }]
                      const min = Math.min(...pts.map((x) => x.score), currentScore)
                      const max = Math.max(...pts.map((x) => x.score), currentScore, min + 1)
                      const xs = pts.map((_, i) => (i / Math.max(1, pts.length - 1)) * 600)
                      const ys = pts.map((x) => 10 + (1 - (x.score - min) / (max - min)) * 60)
                      const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(" ")
                      const area = `${d} L600,80 L0,80 Z`
                      const last = { x: xs[xs.length - 1]!, y: ys[ys.length - 1]! }
                      return (
                        <>
                          <path d={area} fill="url(#areaGrad)" />
                          <path d={d} stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx={last.x} cy={last.y} r="4" fill="#22C55E" />
                        </>
                      )
                    })()}
                  </svg>
                </div>
                <div className="sparkline-months">
                  {(trendScores.length ? trendScores : [{ month: "—", score: currentScore }]).slice(-12).map((x, idx, arr) => (
                    <span key={x.month + idx} className={idx === arr.length - 1 ? "cur" : ""}>{x.month}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Fatores
                </div>
              </div>
              <div className="card-body">
                <div className="factors-grid">
                  {factors.map((f, i) => (
                    <div key={f.title + i} className={["factor-card", f.kind].join(" ")}>
                      <div className={["factor-label", f.kind].join(" ")}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          {f.kind === "pos" ? <polyline points="20 6 9 17 4 12" /> : f.kind === "neg" ? <polyline points="6 9 12 15 18 9" /> : <circle cx="12" cy="12" r="10" />}
                        </svg>
                        {f.kind === "pos" ? "positivo" : f.kind === "neg" ? "atenção" : "neutro"}
                      </div>
                      <div className="factor-name">{f.title}</div>
                      <div className="factor-desc">{f.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ai-box">
              <div className="ai-box-title">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Explicação
              </div>
              <div className="ai-box-text">{scoreResult.explanation || explainScore(scoreResult)}</div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  3 ações recomendadas
                </div>
              </div>
              <div className="card-body">
                <div className="actions-list">
                  {actions.map((a, idx) => (
                    <div key={a.code} className="action-item">
                      <div className="action-num" style={{ background: idx === 0 ? "rgba(22,163,74,.12)" : "rgba(255,255,255,.06)", color: idx === 0 ? "var(--green-b)" : "var(--t2)" }}>
                        {idx + 1}
                      </div>
                      <div className="action-info">
                        <div className="action-title">{a.title}</div>
                        <div className="action-sub">{a.message}</div>
                      </div>
                      <div className="action-gain" style={{ color: a.impact === "high" ? "var(--green-b)" : "var(--t2)" }}>
                        {a.impact === "high" ? "+alto" : a.impact === "medium" ? "+médio" : "+baixo"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
