import { supabase } from "../supabase"
import { getCurrentCycleRange, getLastCycles } from "../financial-cycle"
import type { Assinatura, Compromisso, Investimento, MetodoPagamento, Profile, Transacao } from "../types"
import { calculateFinancialScore } from "../../score-engine"
import type { ScoreResult } from "../../score-engine"
import { getUserFinancialSettings } from "./financial-settings"
import { calcularTotalMensal, getAssinaturas } from "./assinaturas"
import { getCompromissos } from "./futuro"
import { getInvestimentos, calcularPatrimonioEstimado } from "./investimentos"
import { ensureActiveCycle, getActiveCycle, getCycleHistory } from "./cycles"
import { getImportBatches, type ImportBatchRow } from "./imports"
import { getUnreadNotificationsCount } from "./notifications"

export type SnapshotPeriod =
  | { kind: "current_cycle" }
  | { kind: "cycle"; inicio: string; fim: string; label?: string }
  | { kind: "range"; inicio: string; fim: string; label?: string }

export type CategoryAgg = { name: string; value: number; percent: number }
export type MetodoAgg = { metodo_pagamento: MetodoPagamento | null; total: number; count: number }

export type UserCycleSnapshot = {
  id?: string | null
  status?: string | null
  inicio: string
  fim: string
  label: string
  totals: {
    renda: number
    gastos: number
    saldo: number
    economiaPct: number
    transacoes: number
    origem: "manual" | "importado" | "misto" | "vazio"
  }
  score: Pick<ScoreResult, "score" | "level">
}

export type UserFinancialSnapshot = {
  period: { inicio: string; fim: string; label: string }
  cycle: {
    id: string | null
    status: "active" | "closed" | "reset" | string
    opening_balance: number
    closing_balance: number | null
    carried_balance: number
    income_total: number | null
    expense_total: number | null
    investment_total: number | null
    score_snapshot: number | null
    reset_at: string | null
    closed_at: string | null
  } | null
  profile: Pick<Profile, "renda_mensal" | "meta_economia" | "idioma" | "notificacoes"> | null
  transacoes: Transacao[]
  totals: {
    totalRenda: number
    totalGastos: number
    saldoDisponivel: number
    saldoPeriodo: number
    saldoHerdado: number
    economia: number
    percentualEconomia: number
    transacoesCount: number
    transacoesManualCount: number
    transacoesImportadasCount: number
    origem: "manual" | "importado" | "misto" | "vazio"
  }
  categorias: CategoryAgg[]
  metodosPagamento: MetodoAgg[]
  evolucao: Array<{ month: string; income: number; expenses: number }>
  assinaturas: Assinatura[]
  compromissos: Compromisso[]
  contasFixas: Compromisso[]
  financiamentos: Compromisso[]
  investimentos: Investimento[]
  patrimonioEstimado: number
  importacoesRecentes: ImportBatchRow[]
  ciclosRecentes: Array<{
    id: string
    start_date: string
    end_date: string
    status: string
    opening_balance: number
    closing_balance: number | null
    carried_balance: number
    income_total: number | null
    expense_total: number | null
    score_snapshot: number | null
    reset_at: string | null
    closed_at: string | null
  }>
  alertas: Array<{ type: string; title: string; message: string; metadata?: Record<string, unknown> }>
  unreadNotifications: number
  score: ScoreResult
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function calcularCategoriasFromTx(transacoes: Array<Pick<Transacao, "tipo" | "valor"> & { categorias?: any }>): CategoryAgg[] {
  const despesas = transacoes.filter((t: any) => t.tipo === "despesa")
  const total = despesas.reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)
  if (total === 0) return []

  const agrupado = despesas.reduce((acc: Record<string, number>, t: any) => {
    const nome = t.categorias?.nome || "Outros"
    acc[nome] = (acc[nome] || 0) + (Number(t.valor) || 0)
    return acc
  }, {})

  return Object.entries(agrupado)
    .map(([nome, valor]) => ({
      name: nome,
      value: Number(valor) || 0,
      percent: Number((((Number(valor) || 0) / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value)
}

function calcularMetodosFromTx(transacoes: Array<Pick<Transacao, "tipo" | "valor" | "metodo_pagamento">>): MetodoAgg[] {
  const map = new Map<string, { metodo: MetodoPagamento | null; total: number; count: number }>()
  for (const t of transacoes || []) {
    if ((t as any).tipo !== "despesa") continue
    const metodo = ((t as any).metodo_pagamento ?? null) as MetodoPagamento | null
    const key = String(metodo ?? "null")
    const cur = map.get(key) ?? { metodo, total: 0, count: 0 }
    cur.total += Number((t as any).valor) || 0
    cur.count += 1
    map.set(key, cur)
  }
  return [...map.values()]
    .map((x) => ({ metodo_pagamento: x.metodo, total: x.total, count: x.count }))
    .sort((a, b) => b.total - a.total)
}

function origemFromCounts(total: number, manual: number, imported: number): "manual" | "importado" | "misto" | "vazio" {
  if (total <= 0) return "vazio"
  if (imported > 0 && manual > 0) return "misto"
  if (imported > 0) return "importado"
  return "manual"
}

export async function getUserFinancialSnapshot(
  userId: string,
  period: SnapshotPeriod = { kind: "current_cycle" },
  opts?: { evolucaoMeses?: number },
): Promise<UserFinancialSnapshot> {
  const settings = await getUserFinancialSettings(userId)

  let inicio = ""
  let fim = ""
  let label = "Ciclo atual"
  let activeCycle: any | null = null
  if (period.kind === "current_cycle") {
    const r = getCurrentCycleRange({ cycle_start_day: settings.cycle_start_day })
    inicio = r.inicio
    fim = r.fim
    label = "Ciclo atual"

    // Tenta usar a tabela de ciclos (quando existente) como fonte do saldo herdado.
    // Se o schema ainda não tiver financial_cycles, cai no modo por data (sem side effects).
    try {
      // Se já houver ciclo ativo, reusa; senão cria garantindo opening_balance do último ciclo fechado.
      const existing = await getActiveCycle(userId)
      activeCycle = existing ?? (await ensureActiveCycle(userId, inicio, fim))
      if (activeCycle?.start_date && activeCycle?.end_date) {
        inicio = String(activeCycle.start_date)
        fim = String(activeCycle.end_date)
      }
    } catch {
      activeCycle = null
    }
  } else {
    inicio = period.inicio
    fim = period.fim
    label = period.label || "Período"
  }

  const evolucaoMeses = Math.max(2, Math.min(24, opts?.evolucaoMeses ?? 5))

  const [profile, transacoes, investimentos, assinaturas, compromissos, evolucao, importacoesRecentes, ciclosRecentes, unreadNotifications] =
    await Promise.all([
    (async () => {
      const { data, error } = await supabase.from("profiles").select("renda_mensal,meta_economia,idioma,notificacoes").eq("id", userId).maybeSingle()
      if (error) return null
      return (data as any) as Profile | null
    })(),
    (async () => {
      const { data, error } = await supabase
        .from("transacoes")
        .select("id,user_id,categoria_id,descricao,valor,tipo,data,metodo_pagamento,confirmado,import_id,categorias(id,nome,icone,emoji,cor,tipo,is_padrao)")
        .eq("user_id", userId)
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false })
      if (error) return []
      return ((data as any) || []) as Transacao[]
    })(),
    getInvestimentos(userId),
    getAssinaturas(userId),
    getCompromissos(userId),
    (async () => {
      const cycles = getLastCycles({ cycle_start_day: settings.cycle_start_day }, evolucaoMeses)
      if (cycles.length === 0) return []
      const earliest = cycles[0]!.inicio
      const latest = cycles[cycles.length - 1]!.fim

      const { data, error } = await supabase
        .from("transacoes")
        .select("valor,tipo,data")
        .eq("user_id", userId)
        .gte("data", earliest)
        .lte("data", latest)
        .order("data", { ascending: true })
      if (error) return []

      const out = cycles.map((c) => ({ month: c.label, income: 0, expenses: 0, inicio: c.inicio, fim: c.fim }))
      const byIndex = (dateStr: string) => {
        for (let i = 0; i < cycles.length; i++) {
          const c = cycles[i]!
          if (dateStr >= c.inicio && dateStr <= c.fim) return i
        }
        return -1
      }

      for (const t of data || []) {
        const idx = byIndex((t as any).data)
        if (idx < 0) continue
        if ((t as any).tipo === "receita") out[idx]!.income += Number((t as any).valor) || 0
        else out[idx]!.expenses += Number((t as any).valor) || 0
      }

      return out.map(({ month, income, expenses }) => ({ month, income, expenses }))
    })(),
    (async () => {
      try {
        return await getImportBatches(userId)
      } catch {
        return []
      }
    })(),
    (async () => {
      try {
        const rows = await getCycleHistory(userId, 12)
        return (rows ?? []).map((c: any) => ({
          id: String(c.id),
          start_date: String(c.start_date),
          end_date: String(c.end_date),
          status: String(c.status),
          opening_balance: Number(c.opening_balance ?? 0),
          closing_balance: c.closing_balance == null ? null : Number(c.closing_balance),
          carried_balance: Number(c.carried_balance ?? 0),
          income_total: c.income_total == null ? null : Number(c.income_total),
          expense_total: c.expense_total == null ? null : Number(c.expense_total),
          score_snapshot: c.score_snapshot == null ? null : Number(c.score_snapshot),
          reset_at: c.reset_at == null ? null : String(c.reset_at),
          closed_at: c.closed_at == null ? null : String(c.closed_at),
        }))
      } catch {
        return []
      }
    })(),
    (async () => {
      try {
        return await getUnreadNotificationsCount(userId)
      } catch {
        return 0
      }
    })(),
  ])

  const totalGastos = transacoes.filter((t: any) => t.tipo === "despesa").reduce((acc, t: any) => acc + (Number(t.valor) || 0), 0)
  const totalRenda = transacoes.filter((t: any) => t.tipo === "receita").reduce((acc, t: any) => acc + (Number(t.valor) || 0), 0)
  const saldoPeriodo = totalRenda - totalGastos
  const saldoHerdado = activeCycle ? Number(activeCycle.opening_balance ?? 0) : 0
  const saldoDisponivel = saldoHerdado + saldoPeriodo
  const economia = Math.max(0, saldoPeriodo)
  const percentualEconomia = totalRenda > 0 ? clamp01((totalRenda - totalGastos) / totalRenda) * 100 : 0

  const manualCount = transacoes.filter((t: any) => !t.import_id).length
  const importCount = transacoes.filter((t: any) => Boolean(t.import_id)).length
  const origem = origemFromCounts(transacoes.length, manualCount, importCount)

  const categorias = calcularCategoriasFromTx(transacoes as any)
  const metodosPagamento = calcularMetodosFromTx(transacoes as any)

  const subsMensal = calcularTotalMensal((assinaturas as any) || [])
  const compsMensal = (compromissos || []).reduce((s, c: any) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0)

  const totalAportes = (investimentos || []).reduce((s, i: any) => s + (Number(i.valor_aporte) || 0), 0)
  const patrimonio = calcularPatrimonioEstimado(investimentos || [])
  const recorrentes = (investimentos || []).filter((i: any) => i.aporte_recorrente).length
  const diversificacao = new Set((investimentos || []).map((i: any) => i.categoria_investimento)).size

  const score = calculateFinancialScore({
    totalRendaPeriodo: totalRenda,
    totalGastosPeriodo: totalGastos,
    assinaturasMensal: subsMensal,
    compromissosMensal: compsMensal,
    investimentos: {
      totalAportes,
      patrimonioEstimado: patrimonio,
      recorrentes,
      diversificacao,
    },
    evolucao: evolucao.map((e) => ({ income: e.income, expenses: e.expenses })),
  })

  const contasFixas = (compromissos as any[]).filter((c) => (c as any).tipo === "despesa_fixa")
  const financiamentos = (compromissos as any[]).filter((c) => (c as any).tipo === "financiamento")

  const alertas: Array<{ type: string; title: string; message: string; metadata?: Record<string, unknown> }> = []
  if (saldoDisponivel < 0) {
    alertas.push({
      type: "negative_balance",
      title: "Saldo negativo no ciclo",
      message: `Seus gastos superam receitas em ${Math.abs(saldoDisponivel).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} neste ciclo.`,
      metadata: { saldoDisponivel },
    })
  }
  if (categorias.length > 0) {
    const top = categorias[0]!
    if (top.percent >= 40) {
      alertas.push({
        type: "high_category_spend",
        title: `${top.name} está alta`,
        message: `${top.name} representa ${Math.round(top.percent)}% das suas despesas neste ciclo.`,
        metadata: { categoria: top.name, valor: top.value, percentual: top.percent },
      })
    }
  }

  return {
    period: { inicio, fim, label },
    cycle: activeCycle
      ? {
          id: String(activeCycle.id ?? null),
          status: (activeCycle.status ?? "active") as any,
          opening_balance: Number(activeCycle.opening_balance ?? 0),
          closing_balance: activeCycle.closing_balance == null ? null : Number(activeCycle.closing_balance),
          carried_balance: Number(activeCycle.carried_balance ?? saldoDisponivel),
          income_total: activeCycle.income_total == null ? null : Number(activeCycle.income_total),
          expense_total: activeCycle.expense_total == null ? null : Number(activeCycle.expense_total),
          investment_total: activeCycle.investment_total == null ? null : Number(activeCycle.investment_total),
          score_snapshot: activeCycle.score_snapshot == null ? null : Number(activeCycle.score_snapshot),
          reset_at: activeCycle.reset_at == null ? null : String(activeCycle.reset_at),
          closed_at: activeCycle.closed_at == null ? null : String(activeCycle.closed_at),
        }
      : null,
    profile: profile
      ? {
          renda_mensal: Number((profile as any).renda_mensal) || 0,
          meta_economia: Number((profile as any).meta_economia) || 0,
          idioma: (profile as any).idioma ?? null,
          notificacoes: (profile as any).notificacoes ?? true,
        }
      : null,
    transacoes,
    totals: {
      totalRenda,
      totalGastos,
      saldoDisponivel,
      saldoPeriodo,
      saldoHerdado,
      economia,
      percentualEconomia,
      transacoesCount: transacoes.length,
      transacoesManualCount: manualCount,
      transacoesImportadasCount: importCount,
      origem,
    },
    categorias,
    metodosPagamento,
    evolucao,
    assinaturas: (assinaturas as any) || [],
    compromissos: (compromissos as any) || [],
    contasFixas: (contasFixas as any) || [],
    financiamentos: (financiamentos as any) || [],
    investimentos: (investimentos as any) || [],
    patrimonioEstimado: patrimonio,
    importacoesRecentes: (importacoesRecentes as any) || [],
    ciclosRecentes: (ciclosRecentes as any) || [],
    alertas,
    unreadNotifications: unreadNotifications ?? 0,
    score,
  }
}

export async function getUserCyclesSnapshots(
  userId: string,
  count = 6,
): Promise<UserCycleSnapshot[]> {
  const settings = await getUserFinancialSettings(userId)

  // Preferência: se existir a tabela `financial_cycles`, usa o histórico real (com saldo herdado).
  // Caso não exista/esteja vazio, cai no modo "por range" derivado do ciclo_start_day.
  let cycles: Array<{ id?: string; status?: string; inicio: string; fim: string; label: string; opening_balance?: number; carried_balance?: number; score_snapshot?: number | null }> = []
  try {
    const hist = await getCycleHistory(userId, Math.max(2, Math.min(24, count + 6)))
    if ((hist ?? []).length > 0) {
      const sorted = [...(hist as any[])]
        .map((c) => ({
          id: String((c as any).id ?? ""),
          status: String((c as any).status ?? ""),
          inicio: String(c.start_date),
          fim: String(c.end_date),
          label: new Date(String(c.start_date) + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
          opening_balance: Number(c.opening_balance ?? 0),
          carried_balance: Number(c.carried_balance ?? 0),
          score_snapshot: c.score_snapshot == null ? null : Number(c.score_snapshot),
        }))
        .sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0))
      cycles = sorted.slice(-Math.max(2, Math.min(24, count)))
    }
  } catch {
    cycles = []
  }

  if (cycles.length === 0) {
    cycles = getLastCycles({ cycle_start_day: settings.cycle_start_day }, Math.max(2, Math.min(24, count))) as any
  }

  if (cycles.length === 0) return []

  const earliest = cycles[0]!.inicio
  const latest = cycles[cycles.length - 1]!.fim

  const [transacoes, investimentos, assinaturas, compromissos] = await Promise.all([
    (async () => {
      const { data, error } = await supabase
        .from("transacoes")
        .select("valor,tipo,data,import_id")
        .eq("user_id", userId)
        .gte("data", earliest)
        .lte("data", latest)
        .order("data", { ascending: true })
      if (error) return []
      return ((data as any) || []) as Array<{ valor: number; tipo: "receita" | "despesa"; data: string; import_id?: string | null }>
    })(),
    getInvestimentos(userId),
    getAssinaturas(userId),
    getCompromissos(userId),
  ])

  const subsMensal = calcularTotalMensal((assinaturas as any) || [])
  const compsMensal = (compromissos || []).reduce((s, c: any) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0)
  const totalAportes = (investimentos || []).reduce((s, i: any) => s + (Number(i.valor_aporte) || 0), 0)
  const patrimonio = calcularPatrimonioEstimado(investimentos || [])
  const recorrentes = (investimentos || []).filter((i: any) => i.aporte_recorrente).length
  const diversificacao = new Set((investimentos || []).map((i: any) => i.categoria_investimento)).size

  const emptyCycleScore = calculateFinancialScore({ totalRendaPeriodo: 0, totalGastosPeriodo: 0 })

  const out = cycles.map((c) => {
    const cycleTx = (transacoes || []).filter((t: any) => t.data >= c.inicio && t.data <= c.fim)
    const renda = cycleTx.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + (Number(t.valor) || 0), 0)
    const gastos = cycleTx.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + (Number(t.valor) || 0), 0)
    const opening = Number((c as any).opening_balance ?? 0)
    const saldo = opening + renda - gastos
    const economiaPct = renda > 0 ? clamp01((renda - gastos) / renda) * 100 : 0
    const manual = cycleTx.filter((t: any) => !t.import_id).length
    const imported = cycleTx.filter((t: any) => Boolean(t.import_id)).length
    const origem = origemFromCounts(cycleTx.length, manual, imported)
    const score = cycleTx.length
      ? calculateFinancialScore({
          totalRendaPeriodo: renda,
          totalGastosPeriodo: gastos,
          assinaturasMensal: subsMensal,
          compromissosMensal: compsMensal,
          investimentos: { totalAportes, patrimonioEstimado: patrimonio, recorrentes, diversificacao },
        })
      : emptyCycleScore

    return {
      id: (c as any).id ? String((c as any).id) : null,
      status: (c as any).status ? String((c as any).status) : null,
      inicio: c.inicio,
      fim: c.fim,
      label: c.label,
      totals: { renda, gastos, saldo, economiaPct, transacoes: cycleTx.length, origem },
      score: { score: score.score, level: score.level },
    } satisfies UserCycleSnapshot
  })

  return out
}
