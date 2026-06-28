import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency, formatShortDate } from "../../../lib/format"
import { getUserFinancialSnapshot } from "../../../lib/queries"
import { calcularPatrimonioEstimado } from "../../../lib/queries/investimentos"
import { calcularTotalMensal } from "../../../lib/queries/assinaturas"
import { toast } from "sonner"
import type { Assinatura, Compromisso, Investimento, MetodoPagamento, Transacao } from "../../../lib/types"
import { calculateFinancialScore } from "../../../score-engine"
import type { ScoreResult } from "../../../score-engine"
import type { AppOutletContext } from "../../../app/components/Layout"
import { AdjustBalanceModal } from "../../../app/components/dashboard/AdjustBalanceModal"
import { createBalanceAdjustment } from "../../../lib/queries/balance-adjustments"
import type { ImportBatchRow } from "../../../lib/queries/imports"

function capitalizeFirst(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function longDatePtBR(d = new Date()) {
  return capitalizeFirst(
    d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  )
}

function greetingForHour(h: number) {
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function startOfTodayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function isInLastDays(dateISO: string, days: number) {
  const d = new Date(dateISO + "T00:00:00")
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000
}

function relativeDayPtBR(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  if (d.getTime() === today.getTime()) return "Hoje"
  if (d.getTime() === y.getTime()) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function nextDueDateISO(day: number) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = now.getDate()
  const dueThisMonth = new Date(y, m, Math.min(28, Math.max(1, day)))
  const due = today <= dueThisMonth.getDate() ? dueThisMonth : new Date(y, m + 1, Math.min(28, Math.max(1, day)))
  return due.toISOString().slice(0, 10)
}

function fmtPct(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return `${Math.round(v)}%`
}

function methodLabel(m: MetodoPagamento | null | undefined) {
  if (!m) return "—"
  if (m === "credito") return "Crédito"
  if (m === "debito") return "Débito"
  if (m === "pix") return "Pix"
  if (m === "dinheiro") return "Dinheiro"
  if (m === "transferencia") return "TED"
  if (m === "boleto") return "Boleto"
  if (m === "debito_automatico") return "Débito"
  if (m === "outro") return "Outro"
  return String(m)
}

function methodDisplayName(m: MetodoPagamento | null | undefined) {
  if (!m) return "Não informado"
  if (m === "credito") return "Cartão de Crédito"
  if (m === "debito") return "Cartão de Débito"
  if (m === "pix") return "Pix"
  if (m === "dinheiro") return "Dinheiro"
  if (m === "transferencia") return "TED / DOC"
  if (m === "boleto") return "Boleto"
  if (m === "debito_automatico") return "Débito automático"
  if (m === "outro") return "Outro"
  return String(m)
}

function methodIcon(m: MetodoPagamento | null | undefined) {
  if (m === "credito") return "💳"
  if (m === "pix") return "🟢"
  if (m === "dinheiro") return "💵"
  if (m === "transferencia") return "🔀"
  if (m === "debito") return "💳"
  return "💠"
}

function methodColor(m: MetodoPagamento | null | undefined) {
  if (m === "credito") return "var(--blue)"
  if (m === "pix") return "var(--green)"
  if (m === "dinheiro") return "var(--amber)"
  if (m === "transferencia") return "#8B5CF6"
  return "var(--t3)"
}

function methodBg(m: MetodoPagamento | null | undefined) {
  if (m === "credito") return "rgba(59,130,246,.12)"
  if (m === "pix") return "rgba(22,163,74,.12)"
  if (m === "dinheiro") return "rgba(245,158,11,.12)"
  if (m === "transferencia") return "rgba(139,92,246,.12)"
  return "rgba(255,255,255,.06)"
}

type PlanningItem = { label: string; dateISO: string; value: number; color: string; kind: "assinatura" | "compromisso" }

function buildPlanningItems(assinaturas: Assinatura[], compromissos: Compromisso[]): PlanningItem[] {
  const out: PlanningItem[] = []

  for (const a of assinaturas || []) {
    if (!a.ativo) continue
    const dateISO = a.proximo_pagamento || (a.dia_cobranca ? nextDueDateISO(a.dia_cobranca) : null)
    if (!dateISO) continue
    out.push({
      label: a.nome,
      dateISO,
      value: Number(a.valor) || 0,
      color: "var(--amber)",
      kind: "assinatura",
    })
  }

  for (const c of compromissos || []) {
    if (!c.ativo) continue
    const dateISO = nextDueDateISO(c.dia_vencimento)
    out.push({
      label: c.descricao,
      dateISO,
      value: Number((c as any).valor_parcela ?? c.valor) || 0,
      color: c.tipo === "financiamento" ? "var(--red)" : "var(--blue)",
      kind: "compromisso",
    })
  }

  const today = startOfTodayISO()
  return out
    .filter((i) => i.dateISO >= today)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

function humanDueTextPtBR(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00")
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays >= 0 && diffDays <= 7) return diffDays === 0 ? "Vence hoje" : `Vence em ${diffDays} dia${diffDays === 1 ? "" : "s"}`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
}

function donutSegments(data: Array<{ label: string; pct: number; color: string }>) {
  const r = 30
  const c = 2 * Math.PI * r
  let offset = 0
  const segs = data.map((d) => {
    const len = (d.pct / 100) * c
    const seg = { ...d, len, offset }
    offset += len
    return seg
  })
  return { r, c, segs }
}

export default function DashboardPage() {
  const { syncNonce, requestSync, search } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()

  const [loading, setLoading] = useState(true)
  const [totais, setTotais] = useState({ totalGastos: 0, totalRenda: 0, saldoDisponivel: 0, percentualEconomia: 0 })
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Array<{ name: string; value: number; percent: number }>>([])
  const [evolucao, setEvolucao] = useState<Array<{ month: string; income: number; expenses: number }>>([])
  const [metodos, setMetodos] = useState<Array<{ metodo_pagamento: MetodoPagamento | null; total: number; count: number }>>([])
  const [profileMeta, setProfileMeta] = useState<{ renda_mensal: number; meta_economia: number } | null>(null)

  const [invests, setInvests] = useState<Investimento[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [snapScore, setSnapScore] = useState<ScoreResult | null>(null)
  const [importacoes, setImportacoes] = useState<ImportBatchRow[]>([])
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [statementBalance, setStatementBalance] = useState<{ batchId: string; value: number } | null>(null)
  const [dismissedStatementBalance, setDismissedStatementBalance] = useState(false)

  const [showAdjustBalance, setShowAdjustBalance] = useState(false)
  const [adjustInitialTarget, setAdjustInitialTarget] = useState<number | null>(null)
  const [adjustInitialReason, setAdjustInitialReason] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    setLoading(true)
    getUserFinancialSnapshot(userId, { kind: "current_cycle" }, { evolucaoMeses: 5 })
      .then((snap) => {
        setProfileMeta(snap.profile ? { renda_mensal: Number(snap.profile.renda_mensal) || 0, meta_economia: Number(snap.profile.meta_economia) || 0 } : null)
        setTotais({
          totalGastos: snap.totals.totalGastos,
          totalRenda: snap.totals.totalRenda,
          saldoDisponivel: snap.totals.saldoDisponivel,
          percentualEconomia: snap.totals.percentualEconomia,
        })
        setTransacoes((snap.transacoes as any) || [])
        setCategorias((snap.categorias as any) || [])
        setEvolucao((snap.evolucao as any) || [])
        setMetodos((snap.metodosPagamento as any) || [])
        setInvests((snap.investimentos as any) || [])
        setAssinaturas((snap.assinaturas as any) || [])
        setCompromissos((snap.compromissos as any) || [])
        setSnapScore(snap.score)

        const cid = (snap.cycle as any)?.id ? String((snap.cycle as any).id) : null
        setCycleId(cid)

        const imps = ((snap.importacoesRecentes as any) || []) as ImportBatchRow[]
        setImportacoes(imps)

        const balanceBatch = (() => {
          const rows = (imps || []).filter((r: any) => r && r.statement_balance != null && Number.isFinite(Number(r.statement_balance)))
          const scoped = cid ? rows.filter((r: any) => (r.cycle_id ? String(r.cycle_id) === cid : true)) : rows
          const sorted = [...scoped].sort((a: any, b: any) => {
            const da = String(a.imported_at || a.completed_at || a.created_at || "")
            const db = String(b.imported_at || b.completed_at || b.created_at || "")
            return da < db ? 1 : da > db ? -1 : 0
          })
          const top = sorted[0]
          if (!top) return null
          return { batchId: String(top.id), value: Number(top.statement_balance) }
        })()

        setStatementBalance(balanceBatch)
        if (balanceBatch?.batchId) {
          const key = `of-dismiss-statement-balance:${balanceBatch.batchId}`
          setDismissedStatementBalance(localStorage.getItem(key) === "1")
        } else {
          setDismissedStatementBalance(false)
        }
      })
      .finally(() => setLoading(false))
  }, [user?.id, syncNonce])

  const userFirstName = useMemo(() => {
    const email = user?.email ?? ""
    const name = (user as any)?.user_metadata?.full_name as string | undefined
    const display = (name || email.split("@")[0] || "Você").trim()
    return display.split(/\s+/g)[0] || display
  }, [user])

  const fmt = (v: number) => formatCurrency(v, lang, currency)
  const saldo = totais.saldoDisponivel
  const economiaValor = Math.max(0, saldo)
  const economiaPct = totais.percentualEconomia

  const balanceMismatch = useMemo(() => {
    if (!statementBalance) return null
    const diff = Number(statementBalance.value) - Number(saldo || 0)
    if (!Number.isFinite(diff) || Math.abs(diff) < 0.01) return null
    return { diff, batchId: statementBalance.batchId, statement: statementBalance.value }
  }, [statementBalance, saldo])

  const prevCycle = evolucao.length >= 2 ? evolucao[evolucao.length - 2] : null
  const curCycle = evolucao.length >= 1 ? evolucao[evolucao.length - 1] : null

  const entradasDelta = useMemo(() => {
    if (!prevCycle || prevCycle.income <= 0 || !curCycle) return null
    return ((curCycle.income - prevCycle.income) / prevCycle.income) * 100
  }, [prevCycle, curCycle])

  const saidasDelta = useMemo(() => {
    if (!prevCycle || prevCycle.expenses <= 0 || !curCycle) return null
    return ((curCycle.expenses - prevCycle.expenses) / prevCycle.expenses) * 100
  }, [prevCycle, curCycle])

  const saldoDelta = useMemo(() => {
    if (!prevCycle || !curCycle) return null
    const a = curCycle.income - curCycle.expenses
    const b = prevCycle.income - prevCycle.expenses
    return a - b
  }, [prevCycle, curCycle])

  const budget = useMemo(() => {
    const targetPct =
      profileMeta && profileMeta.meta_economia > 0 && profileMeta.meta_economia <= 100 ? profileMeta.meta_economia : 20
    const rendaRef = totais.totalRenda > 0 ? totais.totalRenda : profileMeta?.renda_mensal || 0
    const allowedSpend = rendaRef > 0 ? rendaRef * (1 - targetPct / 100) : 0
    const remaining = Math.max(0, allowedSpend - totais.totalGastos)
    const usedPct = allowedSpend > 0 ? Math.min(100, Math.max(0, (totais.totalGastos / allowedSpend) * 100)) : 0
    return { allowedSpend, remaining, usedPct, targetPct }
  }, [totais.totalRenda, totais.totalGastos, profileMeta])

  const filteredTx = useMemo(() => {
    const q = (search || "").trim().toLowerCase()
    if (!q) return transacoes
    return transacoes.filter((t) => {
      const desc = (t.descricao || "").toLowerCase()
      const cat = ((t as any).categorias?.nome || "").toLowerCase()
      return desc.includes(q) || cat.includes(q)
    })
  }, [transacoes, search])

  const lastTx = useMemo(() => filteredTx.slice(0, 5), [filteredTx])

  const topMethods = useMemo(() => {
    const total = metodos.reduce((s, m) => s + (Number(m.total) || 0), 0)
    return metodos.slice(0, 4).map((m) => ({
      metodo: m.metodo_pagamento,
      total: Number(m.total) || 0,
      pct: total > 0 ? (m.total / total) * 100 : 0,
    }))
  }, [metodos])

  const investimentoInfo = useMemo(() => {
    const patrimonio = calcularPatrimonioEstimado(invests)
    const totalAportes = invests.reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0)
    return { patrimonio, totalAportes }
  }, [invests])

  const investDist = useMemo(() => {
    const total = invests.reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0)
    if (total <= 0) return []
    const sums = new Map<string, number>()
    for (const i of invests) {
      const key = i.categoria_investimento || "outros"
      sums.set(key, (sums.get(key) || 0) + (Number(i.valor_aporte) || 0))
    }

    const mapLabelColor: Record<string, { label: string; color: string }> = {
      renda_fixa: { label: "Renda Fixa", color: "#16A34A" },
      renda_variavel: { label: "Ações", color: "#3B82F6" },
      fundos: { label: "FIIs", color: "#F59E0B" },
      outros: { label: "Outros", color: "#8B5CF6" },
    }

    return [...sums.entries()]
      .map(([k, v]) => {
        const meta = mapLabelColor[k] ?? mapLabelColor.outros
        return { key: k, label: meta.label, pct: (v / total) * 100, color: meta.color }
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4)
  }, [invests])

  const donut = useMemo(() => donutSegments(investDist.map((d) => ({ label: d.label, pct: d.pct, color: d.color }))), [investDist])

  const planningItems = useMemo(() => buildPlanningItems(assinaturas, compromissos).slice(0, 4), [assinaturas, compromissos])

  const totalSubsMensal = useMemo(() => calcularTotalMensal(assinaturas), [assinaturas])
  const totalCompromissosMensal = useMemo(
    () => compromissos.reduce((s, c) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0),
    [compromissos],
  )

  const scoreSeries = useMemo(() => {
    if (evolucao.length === 0) return []
    const baseInputs = {
      assinaturasMensal: totalSubsMensal,
      compromissosMensal: totalCompromissosMensal,
      investimentos: {
        totalAportes: investimentoInfo.totalAportes,
        patrimonioEstimado: investimentoInfo.patrimonio,
        recorrentes: invests.filter((i) => i.aporte_recorrente).length,
        diversificacao: new Set(invests.map((i) => i.categoria_investimento)).size,
      },
    }
    return evolucao.slice(-5).map((c) => {
      const r = calculateFinancialScore({ ...baseInputs, totalRendaPeriodo: c.income, totalGastosPeriodo: c.expenses, evolucao: null })
      return { month: c.month, score: r.score }
    })
  }, [evolucao, totalSubsMensal, totalCompromissosMensal, investimentoInfo.totalAportes, investimentoInfo.patrimonio, invests])

  const currentScore = useMemo(() => {
    if (snapScore) return snapScore
    return calculateFinancialScore({
      totalRendaPeriodo: totais.totalRenda,
      totalGastosPeriodo: totais.totalGastos,
      assinaturasMensal: totalSubsMensal,
      compromissosMensal: totalCompromissosMensal,
      investimentos: {
        totalAportes: investimentoInfo.totalAportes,
        patrimonioEstimado: investimentoInfo.patrimonio,
        recorrentes: invests.filter((i) => i.aporte_recorrente).length,
        diversificacao: new Set(invests.map((i) => i.categoria_investimento)).size,
      },
      evolucao: evolucao.map((x) => ({ income: x.income, expenses: x.expenses })),
    })
  }, [snapScore, totais.totalRenda, totais.totalGastos, totalSubsMensal, totalCompromissosMensal, investimentoInfo.totalAportes, investimentoInfo.patrimonio, invests, evolucao])

  const factors = useMemo(() => {
    const items = [...currentScore.breakdown]
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
      .slice(0, 3)
      .map((b) => {
        const label =
          b.pillar === "economia"
            ? "Economia"
            : b.pillar === "equilibrio"
              ? "Equilíbrio"
              : b.pillar === "recorrencias"
                ? "Recorrências"
                : b.pillar === "investimentos"
                  ? "Investimentos"
                  : "Estabilidade"
        return { label, points: b.points }
      })
    return items
  }, [currentScore.breakdown])

  const mainInsight = useMemo(() => {
    const top = categorias[0]
    if (!top) {
      return {
        text: "Dados insuficientes para gerar um insight. Registre transações e categorias para liberar recomendações.",
        chips: [{ kind: "info" as const, text: "Dados insuficientes" }],
      }
    }

    const budgetRemaining = budget.allowedSpend > 0 ? budget.remaining : 0
    return {
      text: `Sua categoria com maior impacto no ciclo atual é ${top.name}, com ${fmtPct(top.percent)} das despesas. Ajustar esse ponto tende a melhorar economia e score.`,
      chips: [
        { kind: "warn" as const, text: `${top.name} ${fmtPct(top.percent)}` },
        { kind: "ok" as const, text: `Economia ${fmtPct(economiaPct)}` },
        { kind: "info" as const, text: budget.allowedSpend > 0 ? `Pode gastar: ${fmt(budgetRemaining)}` : "Sem renda no ciclo" },
      ],
    }
  }, [categorias, economiaPct, budget.allowedSpend, budget.remaining, fmt])

  return (
    <div className="ofx-dashboard">
      <div className="page">
        <div className="page-header">
          <div>
            <div className="greeting-sub">{longDatePtBR()}</div>
            <div className="greeting-title">
              {greetingForHour(new Date().getHours())},{" "}
              <span>{userFirstName}</span> {"👋"}
            </div>
          </div>

          <div className="page-header-right">
            <button type="button" className="btn btn-ghost" onClick={requestSync}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Sincronizar
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAdjustInitialTarget(saldo)
                setAdjustInitialReason(null)
                setShowAdjustBalance(true)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 1v22" />
                <path d="M5 6h14" />
                <path d="M5 18h14" />
              </svg>
              Ajustar saldo
            </button>

            <button type="button" className="btn btn-primary" onClick={() => navigate("/app/adicionar")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Novo Registro
            </button>
          </div>
        </div>

        {balanceMismatch && !dismissedStatementBalance ? (
          <div
            className="mb-6 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(245,158,11,0.05)",
              border: "1px solid rgba(245,158,11,0.14)",
            }}
          >
            {/* Top bar */}
            <div
              className="flex items-center justify-between gap-4 px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-amber-600 tracking-wide">Divergência no extrato importado</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const key = `of-dismiss-statement-balance:${balanceMismatch.batchId}`
                  localStorage.setItem(key, "1")
                  setDismissedStatementBalance(true)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-[#888] hover:bg-white/5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Numbers inline - no nested cards */}
              <div className="flex items-center gap-4 flex-1 flex-wrap">
                <div>
                  <p className="text-[11px] text-[#555] mb-1 uppercase tracking-wide font-medium">Calculado</p>
                  <p className="text-xl font-bold text-[#EEEDE6] tabular-nums">{fmt(saldo)}</p>
                </div>
                <div className="text-[#333] text-lg font-light hidden sm:block">→</div>
                <div>
                  <p className="text-[11px] text-amber-600/70 mb-1 uppercase tracking-wide font-medium">Extrato</p>
                  <p className="text-xl font-bold text-[#EEEDE6] tabular-nums">{fmt(balanceMismatch.statement)}</p>
                </div>
                <div
                  className="px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums"
                  style={{
                    background: balanceMismatch.diff >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    color: balanceMismatch.diff >= 0 ? "#22C55E" : "#EF4444",
                  }}
                >
                  {balanceMismatch.diff >= 0 ? "+" : "−"}{fmt(Math.abs(balanceMismatch.diff))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                  onClick={() => {
                    setAdjustInitialTarget(balanceMismatch.statement)
                    setAdjustInitialReason("Saldo do extrato")
                    setShowAdjustBalance(true)
                  }}
                >
                  Usar saldo do extrato
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                  onClick={() => {
                    const key = `of-dismiss-statement-balance:${balanceMismatch.batchId}`
                    localStorage.setItem(key, "1")
                    setDismissedStatementBalance(true)
                    toast.message("Mantendo saldo calculado", { description: "Você pode ajustar manualmente a qualquer momento." })
                  }}
                >
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="stats-row" aria-busy={loading}>
          <div className="stat-card">
            <div className="stat-label">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Saldo Atual
            </div>
            <div className="stat-value">{fmt(saldo)}</div>
            <div className={["stat-delta", (saldoDelta ?? 0) >= 0 ? "delta-up" : "delta-down"].join(" ")}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {(saldoDelta ?? 0) >= 0 ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
              </svg>
              {saldoDelta == null ? "Ciclo atual" : `${saldoDelta >= 0 ? "+" : "−"}${fmt(Math.abs(saldoDelta))} vs. ciclo anterior`}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label" style={{ color: "#22C55E" }}>
              <svg viewBox="0 0 24 24" stroke="#22C55E" aria-hidden="true">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              Entradas
            </div>
            <div className="stat-value">{fmt(totais.totalRenda)}</div>
            <div className={["stat-delta", (entradasDelta ?? 0) >= 0 ? "delta-up" : "delta-down"].join(" ")}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {(entradasDelta ?? 0) >= 0 ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
              </svg>
              {entradasDelta == null ? "Ciclo atual" : `${entradasDelta >= 0 ? "+" : ""}${Math.round(entradasDelta)}% vs. ciclo anterior`}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label" style={{ color: "var(--red)" }}>
              <svg viewBox="0 0 24 24" stroke="var(--red)" aria-hidden="true">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
              Saídas
            </div>
            <div className="stat-value">{fmt(totais.totalGastos)}</div>
            <div className={["stat-delta", (saidasDelta ?? 0) > 0 ? "delta-down" : "delta-up"].join(" ")}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {(saidasDelta ?? 0) > 0 ? <polyline points="6 9 12 15 18 9" /> : <polyline points="18 15 12 9 6 15" />}
              </svg>
              {saidasDelta == null ? "Ciclo atual" : `${saidasDelta >= 0 ? "+" : ""}${Math.round(saidasDelta)}% vs. ciclo anterior`}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              Economia
            </div>
            <div className="stat-value">{fmt(economiaValor)}</div>
            <div className="stat-delta delta-up">
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {fmtPct(economiaPct)} da renda
            </div>
          </div>

          <div className="stat-card highlight">
            <div className="stat-label">Pode Gastar</div>
            <div className="stat-value">{budget.allowedSpend > 0 ? fmt(budget.remaining) : "—"}</div>
            <div className="stat-delta delta-up" style={{ marginBottom: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              ainda disponível
            </div>
            <div className="stat-progress">
              <div className="stat-progress-bar" style={{ width: `${Math.min(100, Math.max(0, budget.usedPct))}%` }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>
              {budget.allowedSpend > 0 ? `${Math.round(budget.usedPct)}% do budget usado` : "Dados insuficientes"}
            </div>
          </div>
        </div>

        <div className="grid-main">
          <div className="grid-left">
            <div className="ai-insight">
              <div className="ai-badge">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Insight IA
              </div>
              <div className="ai-text">{mainInsight.text}</div>
              <div className="ai-chips">
                {mainInsight.chips.map((c) => (
                  <span key={c.text} className={["chip", c.kind === "warn" ? "chip-warn" : c.kind === "ok" ? "chip-ok" : "chip-info"].join(" ")}>
                    {c.kind === "warn" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    ) : c.kind === "ok" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                    {c.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  Últimas Transações
                </div>
                <Link className="card-action" to="/app/transacoes">
                  Ver tudo →
                </Link>
              </div>
              <div className="card-body">
                {lastTx.length === 0 ? (
                  <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                    Nenhuma transação no ciclo atual. Use "Novo Registro" para começar.
                  </div>
                ) : (
                  lastTx.map((t) => {
                    const catName = ((t as any).categorias?.nome as string | undefined) || (t.tipo === "receita" ? "Receita" : "Despesa")
                    const icon = ((t as any).categorias?.emoji || (t as any).categorias?.icone || "🧾") as string
                    const bg = t.tipo === "receita" ? "rgba(22,163,74,.12)" : "rgba(239,68,68,.12)"
                    return (
                      <div key={t.id} className="tx-item">
                        <div className="tx-icon" style={{ background: bg }}>
                          {icon}
                        </div>
                        <div className="tx-info">
                          <div className="tx-name">{t.descricao}</div>
                          <div className="tx-meta">
                            {relativeDayPtBR(t.data)} · {catName}
                          </div>
                        </div>
                        <div>
                          <div className={["tx-amount", t.tipo === "receita" ? "pos" : "neg"].join(" ")}>
                            {t.tipo === "receita" ? "+" : "−"}
                            {fmt(Math.abs(Number(t.valor) || 0))}
                          </div>
                          <div className="tx-method">{methodLabel(t.metodo_pagamento as any)}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Métodos de Pagamento
                </div>
                <Link className="card-action" to="/app/cartoes">
                  Detalhes →
                </Link>
              </div>
              <div className="card-body">
                {topMethods.length === 0 ? (
                  <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                    Sem dados por método de pagamento. Adicione "pagamento" ao registrar transações.
                  </div>
                ) : (
                  <div className="pay-list">
                    {topMethods.map((m) => (
                      <div key={String(m.metodo ?? "null")} className="pay-item">
                        <div className="pay-icon" style={{ background: methodBg(m.metodo) }}>
                          {methodIcon(m.metodo)}
                        </div>
                        <div className="pay-name">{methodDisplayName(m.metodo)}</div>
                        <div className="pay-bar-wrap">
                          <div className="pay-bar-fill" style={{ width: `${Math.max(0, Math.min(100, m.pct))}%`, background: methodColor(m.metodo) }} />
                        </div>
                        <div className="pay-pct">{fmtPct(m.pct)}</div>
                        <div className="pay-total">{fmt(m.total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid-right">
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                  Score Finance App
                </div>
                <Link className="card-action" to="/app/score">
                  Ver mais →
                </Link>
              </div>
              <div className="card-body">
                <div className="score-mini-wrap">
                  <div className="score-gauge">
                    <svg viewBox="0 0 110 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M10 60 A45 45 0 0 1 100 60" stroke="rgba(255,255,255,.06)" strokeWidth="8" strokeLinecap="round" fill="none" />
                      <path
                        d="M10 60 A45 45 0 0 1 100 60"
                        stroke="url(#scoreGradDash)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray="141"
                        strokeDashoffset={String(141 - Math.round((Math.min(1000, Math.max(0, currentScore.score)) / 1000) * 141))}
                      />
                      <defs>
                        <linearGradient id="scoreGradDash" x1="10" y1="60" x2="100" y2="60">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="60%" stopColor="#22C55E" />
                          <stop offset="100%" stopColor="#16A34A" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="score-num">{currentScore.score}</div>
                  </div>

                  <div className="score-mini-info">
                    <div className="score-mini-label">Histórico</div>
                    <div className="score-hist">
                      {scoreSeries.length === 0
                        ? [0, 0, 0, 0, 0].map((_, i) => (
                            <div key={i} className="score-bar" style={{ height: "55%" }}>
                              <div className="score-bar-fill" style={{ height: "30%" }} />
                            </div>
                          ))
                        : scoreSeries.map((s, i) => {
                            const pct = Math.max(5, Math.min(100, (s.score / 1000) * 100))
                            return (
                              <div key={s.month + i} className={["score-bar", i === scoreSeries.length - 1 ? "active" : ""].join(" ")} style={{ height: `${pct}%` }}>
                                <div className="score-bar-fill" style={{ height: "100%" }} />
                              </div>
                            )
                          })}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {(scoreSeries.length ? scoreSeries : [{ month: "—", score: 0 }, { month: "—", score: 0 }, { month: "—", score: 0 }, { month: "—", score: 0 }, { month: "—", score: 0 }]).map((s, i) => (
                        <div key={s.month + i} style={{ flex: 1, fontSize: 9, color: i === scoreSeries.length - 1 ? "var(--green-b)" : "var(--t3)", textAlign: "center", fontWeight: i === scoreSeries.length - 1 ? 600 : 500 }}>
                          {(s.month || "—").replace(".", "")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--bd)" }}>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Fatores</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {factors.map((f) => (
                      <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--t2)" }}>{f.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: f.points >= 0 ? "var(--green-b)" : "var(--red)" }}>
                          {f.points >= 0 ? "+" : "−"}
                          {Math.abs(f.points)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  </svg>
                  Investimentos
                </div>
                <Link className="card-action" to="/app/investimentos">
                  Ver →
                </Link>
              </div>
              <div className="card-body">
                {invests.length === 0 ? (
                  <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                    Nenhum investimento cadastrado. Adicione seus investimentos para acompanhar patrimônio e diversificação.
                  </div>
                ) : (
                  <>
                    <div className="invest-mini-grid">
                      <div className="invest-mini-item">
                        <div className="invest-mini-label">Patrimônio</div>
                        <div className="invest-mini-val">{fmt(investimentoInfo.patrimonio)}</div>
                        <div className="invest-mini-delta delta-up" style={{ fontSize: 11 }}>
                          Estimado
                        </div>
                      </div>
                      <div className="invest-mini-item">
                        <div className="invest-mini-label">Aportado</div>
                        <div className="invest-mini-val">{fmt(investimentoInfo.totalAportes)}</div>
                        <div className="invest-mini-delta" style={{ fontSize: 11, color: "var(--t3)" }}>
                          Total histórico
                        </div>
                      </div>
                    </div>

                    <div className="donut-wrap">
                      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
                        <circle cx="40" cy="40" r={donut.r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="14" />
                        {donut.segs.map((s) => (
                          <circle
                            key={s.label}
                            cx="40"
                            cy="40"
                            r={donut.r}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="14"
                            strokeDasharray={`${s.len} ${Math.max(0, donut.c - s.len)}`}
                            strokeDashoffset={-s.offset}
                            strokeLinecap="round"
                            transform="rotate(-90 40 40)"
                          />
                        ))}
                        <text x="40" y="45" textAnchor="middle" fontSize="11" fill="#EEEDE6" fontFamily="DM Sans,sans-serif" fontWeight="700">
                          {invests.length} ativo{invests.length === 1 ? "" : "s"}
                        </text>
                      </svg>
                      <div className="donut-legend">
                        {investDist.map((d) => (
                          <div key={d.key} className="donut-legend-item">
                            <div className="donut-legend-dot" style={{ background: d.color }} />
                            <span>{d.label}</span>
                            <span style={{ marginLeft: "auto", color: "var(--t1)", fontWeight: 600 }}>{fmtPct(d.pct)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Próximos Compromissos
                </div>
                <Link className="card-action" to="/app/planejamento">
                  Ver →
                </Link>
              </div>
              <div className="card-body">
                {planningItems.length === 0 ? (
                  <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                    Sem compromissos/assinaturas próximos. Crie itens em "Planejamento" para aparecerem aqui.
                  </div>
                ) : (
                  planningItems.map((p) => (
                    <div key={p.label + p.dateISO} className="plan-item">
                      <div className="plan-dot" style={{ background: p.color }} />
                      <div className="plan-info">
                        <div className="plan-name">{p.label}</div>
                        <div className="plan-date">{humanDueTextPtBR(p.dateISO)}</div>
                      </div>
                      <div className="plan-val">{fmt(p.value)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdjustBalance ? (
        <AdjustBalanceModal
          lang={lang}
          currency={currency}
          currentBalance={saldo}
          initialTargetBalance={adjustInitialTarget}
          initialReason={adjustInitialReason}
          onClose={() => setShowAdjustBalance(false)}
          onConfirm={async ({ targetBalance, reason }) => {
            if (!user) return
            const res = await createBalanceAdjustment(user.id, {
              currentBalance: saldo,
              targetBalance,
              reason,
              cycleId,
            })
            if (res.created) {
              toast.success("Saldo atualizado", { description: "Ajuste registrado no histórico e dashboard recalculada." })
              setShowAdjustBalance(false)
              requestSync()
            } else {
              toast.message("Nenhum ajuste necessário", { description: "O novo saldo é igual ao saldo atual." })
              setShowAdjustBalance(false)
            }
          }}
        />
      ) : null}
    </div>
  )
}
