import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useOutletContext } from "react-router"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency } from "../../../lib/format"
import { getUserFinancialSnapshot } from "../../../lib/queries"
import { calcularTotalMensal } from "../../../lib/queries/assinaturas"
import { calcularPatrimonioEstimado } from "../../../lib/queries/investimentos"
import { generateFinancialSummary, generateOpportunityInsight, generateRiskAlert, generateWeeklyInsight } from "../../../ai"
import { PanelLoader } from "../../components/PanelLoader"
import type { AppOutletContext } from "../../../app/components/Layout"

type InsightCard = {
  id: string
  kind: "alert" | "opportunity" | "forecast" | "tip" | "info"
  badge: string
  title: string
  body: string
  actionLabel: string
  actionHref: string
  whenLabel: string
}

function parseTitleAndBody(text: string): { title: string; body: string } {
  const t = (text || "").trim()
  const titleMatch = t.match(/\*\*T[ií]tulo:\*\*\s*(.+)/i)
  const riskMatch = t.match(/\*\*Risco:\*\*\s*(.+)/i)
  const oppMatch = t.match(/\*\*Oportunidade:\*\*\s*(.+)/i)
  const summaryMatch = t.match(/\*\*Resumo:\*\*/i)

  const title =
    titleMatch?.[1]?.trim() ||
    riskMatch?.[1]?.trim() ||
    oppMatch?.[1]?.trim() ||
    (summaryMatch ? "Resumo" : "Insight")

  const body = t
    .replace(/\*\*T[ií]tulo:\*\*.*(\r?\n)?/i, "")
    .replace(/\*\*Risco:\*\*.*(\r?\n)?/i, "")
    .replace(/\*\*Oportunidade:\*\*.*(\r?\n)?/i, "")
    .replace(/\*\*Resumo:\*\*/i, "")
    .replace(/\*\*Mensagem:\*\*/i, "")
    .replace(/\*\*A[cç][aã]o:\*\*/i, "")
    .replace(/\*\*Por que agora:\*\*/i, "")
    .replace(/\*\*O que fazer hoje:\*\*/i, "")
    .replace(/\*\*Por que vale a pena:\*\*/i, "")
    .replace(/\*\*Pr[oó]ximo passo:\*\*/i, "")
    .trim()

  return { title, body }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export default function InsightsPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()
  const { syncNonce } = useOutletContext<AppOutletContext>()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const [cards, setCards] = useState<InsightCard[]>([])
  const [forecast, setForecast] = useState<Array<{ label: string; income: number; expense: number; projected?: boolean }>>([])

  const fmt = (v: number) => formatCurrency(v, lang, currency)

  const regenerate = useCallback(
    async (force = false) => {
      if (!user) return
      const userId = user.id
      setError(null)
      setGenerating(true)

      try {
        const cacheKey = `of-insights-cache:v2:${userId}`
        if (!force) {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const parsed = JSON.parse(cached) as { at: string; cards: InsightCard[]; forecast?: any[] }
            const at = new Date(parsed.at)
            const ageMin = (Date.now() - at.getTime()) / (60 * 1000)
            if (ageMin < 30 && Array.isArray(parsed.cards) && parsed.cards.length) {
              setCards(parsed.cards)
              setForecast(Array.isArray(parsed.forecast) ? (parsed.forecast as any) : [])
              setLastUpdatedAt(at)
              return
            }
          }
        }

        const snap = await getUserFinancialSnapshot(userId, { kind: "current_cycle" }, { evolucaoMeses: 5 })

        const patrimonio = calcularPatrimonioEstimado(snap.investimentos || [])
        const totalAportes = (snap.investimentos || []).reduce((s, i: any) => s + (Number(i.valor_aporte) || 0), 0)
        const totalSubsMensal = calcularTotalMensal(snap.assinaturas || [])
        const totalCompMensal = (snap.compromissos || []).reduce((s, c2: any) => s + (Number((c2 as any).valor_parcela ?? c2.valor) || 0), 0)

        const context = {
          periodo: "ciclo_atual",
          totais: {
            renda: Number((snap.totals.totalRenda || 0).toFixed(2)),
            gastos: Number((snap.totals.totalGastos || 0).toFixed(2)),
            saldo: Number((snap.totals.saldoDisponivel || 0).toFixed(2)),
            economiaPct: Number((snap.totals.percentualEconomia || 0).toFixed(1)),
          },
          categoriasTop: (snap.categorias || []).slice(0, 5),
          assinaturas: { totalMensal: Number(totalSubsMensal.toFixed(2)), count: (snap.assinaturas || []).length },
          compromissos: { totalMensal: Number(totalCompMensal.toFixed(2)), count: (snap.compromissos || []).length },
          investimentos: {
            patrimonioEstimado: Number(patrimonio.toFixed(2)),
            totalAportes: Number(totalAportes.toFixed(2)),
            count: (snap.investimentos || []).length,
          },
          metodosPagamento: snap.metodosPagamento,
          score: {
            score: snap.score.score,
            level: snap.score.level,
            issues: snap.score.issues,
            opportunities: snap.score.opportunities,
          },
          format: { currencyExample: fmt(1234.56) },
        }

        const [weekly, risk, opp, summary] = await Promise.all([
          generateWeeklyInsight(context),
          generateRiskAlert(context),
          generateOpportunityInsight(context),
          generateFinancialSummary(context),
        ])

        const weeklyParsed = parseTitleAndBody(weekly)
        const riskParsed = parseTitleAndBody(risk)
        const oppParsed = parseTitleAndBody(opp)
        const summaryParsed = parseTitleAndBody(summary)

        const cash = snap.metodosPagamento.find((m) => m.metodo_pagamento === "dinheiro")?.total ?? 0
        const pix = snap.metodosPagamento.find((m) => m.metodo_pagamento === "pix")?.total ?? 0
        const gastos = Math.max(0, snap.totals.totalGastos)
        const cashPct = gastos > 0 ? (cash / gastos) * 100 : 0

        const hist = (snap.evolucao || []).slice(-3)
        const last = hist.length ? hist[hist.length - 1]! : { month: "Ciclo", income: snap.totals.totalRenda, expenses: snap.totals.totalGastos }
        const forecastRows: Array<{ label: string; income: number; expense: number; projected?: boolean }> = [
          ...hist.map((h) => ({ label: (h.month || "—").toString(), income: Number(h.income) || 0, expense: Number(h.expenses) || 0 })),
          {
            label: "Próximo",
            income: Number(last.income) || 0,
            expense: Math.max(0, Number(totalSubsMensal + totalCompMensal) || 0),
            projected: true,
          },
        ].slice(-4)

        const nextCards: InsightCard[] = [
          {
            id: "next_action",
            kind: "opportunity",
            badge: "✨ Próxima ação",
            title: oppParsed.title || "Ação recomendada",
            body: oppParsed.body || "Dados insuficientes para sugerir uma ação agora.",
            actionLabel: "Ver planejamento →",
            actionHref: "/app/planejamento",
            whenLabel: "HOJE",
          },
          {
            id: "risk",
            kind: "alert",
            badge: "🚨 Alerta",
            title: riskParsed.title || "Risco",
            body: riskParsed.body || "Dados insuficientes para risco.",
            actionLabel: "Ajustar →",
            actionHref: "/app/planejamento",
            whenLabel: "HOJE",
          },
          {
            id: "weekly",
            kind: "info",
            badge: "⚡ Padrão",
            title: weeklyParsed.title || "Padrão da semana",
            body: weeklyParsed.body || "Dados insuficientes para padrão.",
            actionLabel: "Ver score →",
            actionHref: "/app/score",
            whenLabel: "ESTA SEMANA",
          },
          {
            id: "cash_tip",
            kind: "tip",
            badge: "✨ Dica",
            title: cashPct >= 8 ? "Troque parte do dinheiro por Pix" : "Use o método certo para cada gasto",
            body:
              cashPct >= 8
                ? `Você ainda usa dinheiro em ${Math.round(cashPct)}% dos gastos. Migrar parte para Pix melhora rastreio e facilita o score.`
                : "Você está distribuindo bem os métodos. Mantenha consistência e marque o método nas novas transações.",
            actionLabel: "Ver métodos →",
            actionHref: "/app/cartoes",
            whenLabel: "HÁBITO",
          },
          {
            id: "forecast",
            kind: "forecast",
            badge: "📊 Previsão",
            title: "Próximo mês: recorrências no radar",
            body:
              totalSubsMensal + totalCompMensal > 0
                ? `Assinaturas + compromissos somam ${fmt(totalSubsMensal + totalCompMensal)}/mês. Ajuste antes de apertar.`
                : "Sem recorrências ativas no momento. Cadastre assinaturas/financiamentos para receber alertas.",
            actionLabel: "Ver planejamento →",
            actionHref: "/app/planejamento",
            whenLabel: "PRÓXIMO MÊS",
          },
          {
            id: "summary",
            kind: "info",
            badge: "🧾 Resumo",
            title: summaryParsed.title || "Resumo",
            body: summaryParsed.body || "Dados insuficientes para resumo.",
            actionLabel: "Ver dashboard →",
            actionHref: "/app",
            whenLabel: "RESUMO",
          },
        ]

        setCards(nextCards)
        setForecast(forecastRows)

        const at = new Date()
        setLastUpdatedAt(at)
        localStorage.setItem(cacheKey, JSON.stringify({ at: at.toISOString(), cards: nextCards, forecast: forecastRows }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao gerar insights.")
      } finally {
        setGenerating(false)
      }
    },
    [user?.id, lang],
  )

  useEffect(() => {
    if (!user) return
    setLoading(true)
    // Quando syncNonce muda (ex.: pós-importação), força regeneração ignorando cache local.
    regenerate(syncNonce > 0).finally(() => setLoading(false))
  }, [user?.id, regenerate, syncNonce])

  const hero = cards[0] ?? null
  const gridCards = useMemo(() => cards.slice(1), [cards])

  const updatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return "—"
    return lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }, [lastUpdatedAt])

  if (!user) return null
  if (loading) return <PanelLoader />

  return (
    <div className="ofx-insights">
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Insights IA</div>
            <div className="page-sub">A IA da Finance App analisa seus dados e te avisa só do que importa.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => regenerate(true)} disabled={generating}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              {generating ? "Atualizando..." : "Atualizar"}
            </button>
            <Link to="/app" className="btn btn-primary">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : null}

        {hero ? (
          <div className="next-action-hero">
            <div className="next-action-icon" aria-hidden="true">⚡</div>
            <div className="next-action-content">
              <div className="next-action-eyebrow">Próxima ação</div>
              <div className="next-action-title">{hero.title}</div>
              <div className="next-action-desc">{hero.body}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--t3)" }}>
                SCAN ATIVO · ÚLTIMA ATUALIZAÇÃO {updatedLabel}
              </div>
            </div>
            <div className="next-action-cta">
              <Link to={hero.actionHref} className="btn btn-primary">
                Ir agora
              </Link>
            </div>
          </div>
        ) : null}

        <div className="insights-grid">
          {gridCards.map((c) => {
            const typeClass =
              c.kind === "alert"
                ? "type-alert"
                : c.kind === "opportunity"
                  ? "type-opportunity"
                  : c.kind === "forecast"
                    ? "type-forecast"
                    : c.kind === "tip"
                      ? "type-tip"
                      : "type-info"

            const actionColor =
              c.kind === "alert"
                ? "var(--red)"
                : c.kind === "forecast"
                  ? "var(--blue)"
                  : c.kind === "tip"
                    ? "var(--purple)"
                    : "var(--green-b)"

            return (
              <div key={c.id} className="insight-card" role="button" tabIndex={0}>
                <div className="insight-card-top">
                  <span className={["insight-type", typeClass].join(" ")}>{c.badge}</span>
                  <span className="insight-icon" aria-hidden="true">🧠</span>
                </div>
                <div className="insight-title">{c.title}</div>
                <div className="insight-desc">{c.body}</div>
                <div className="insight-footer">
                  <Link to={c.actionHref} className="insight-action" style={{ color: actionColor }}>
                    {c.actionLabel}
                  </Link>
                  <span className="insight-meta">{c.whenLabel}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="forecast-card">
          <div className="card-head">
            <div className="card-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Previsão dos Próximos Meses
            </div>
            <button type="button" className="card-action" disabled>
              Ajustar parâmetros
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t2)" }}>
                <div style={{ width: 8, height: 8, background: "var(--green)", borderRadius: 2, opacity: 0.7 }} />
                Entradas
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t2)" }}>
                <div style={{ width: 8, height: 8, background: "var(--red)", borderRadius: 2, opacity: 0.7 }} />
                Saídas
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t2)" }}>
                <div style={{ width: 8, height: 8, background: "var(--blue)", borderRadius: 2, opacity: 0.5, border: "1px dashed rgba(59,130,246,.6)" }} />
                Projetado
              </div>
            </div>

            <div className="forecast-grid" aria-label="Forecast">
              {forecast.map((f) => {
                const max = Math.max(...forecast.map((x) => Math.max(x.income, x.expense)), 1)
                const incomeH = Math.round(clamp01(f.income / max) * 80)
                const expenseH = Math.round(clamp01(f.expense / max) * 80)
                return (
                  <div key={f.label} className="forecast-col">
                    <div className="forecast-bar-wrap">
                      {f.projected ? (
                        <>
                          <div className="forecast-seg projected" style={{ height: `${incomeH}px` }} />
                          <div className="forecast-seg projected" style={{ height: `${expenseH}px` }} />
                        </>
                      ) : (
                        <>
                          <div className="forecast-seg income" style={{ height: `${incomeH}px` }} />
                          <div className="forecast-seg expense" style={{ height: `${expenseH}px` }} />
                        </>
                      )}
                    </div>
                    <div className={["forecast-label", f.projected ? "cur" : ""].filter(Boolean).join(" ")}>{f.label}</div>
                    <div className="forecast-val" style={f.projected ? { color: "var(--blue)" } : undefined}>
                      {f.projected ? fmt(f.expense) : fmt(f.expense)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="report-cta">
          <div className="report-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="report-content">
            <div className="report-title">Relatório completo (beta)</div>
            <div className="report-sub">PDF/XLSX ficam como ação secundária. Primeiro: insights curtos e acionáveis.</div>
          </div>
          <div className="report-actions">
            <Link to="/app" className="btn btn-ghost">Dashboard</Link>
            <Link to="/app/score" className="btn btn-primary">Ver score</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
