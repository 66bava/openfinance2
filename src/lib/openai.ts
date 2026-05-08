import { supabase } from "./supabase"

type ChatRole = "system" | "user" | "assistant"
type ChatMessage = { role: ChatRole; content: string }

type AiRequestInput =
  | { prompt: string; task?: string; context?: unknown; maxTokens?: number; temperature?: number; messages?: ChatMessage[] }
  | string

async function aiRequest(input: AiRequestInput, maxTokensFallback = 400): Promise<string> {
  const req =
    typeof input === "string"
      ? { prompt: input, maxTokens: maxTokensFallback }
      : {
          prompt: input.prompt,
          task: input.task,
          context: input.context,
          maxTokens: input.maxTokens ?? maxTokensFallback,
          temperature: input.temperature,
          messages: input.messages,
        }

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error("Faça login para usar o Conselheiro IA.")

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(req),
  })

  const payload = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(payload?.error?.message ?? `Erro ${res.status} na API`)

  const content = payload?.content
  return typeof content === "string" && content.trim() ? content : "Não foi possível gerar a análise."
}

export interface ScoreContext {
  score: number
  scoreLabel: string
  totalGastos: number
  totalRenda: number
  percentualEconomia: number
  categorias: Array<{ name: string; percent: number }>
  investimentos?: {
    totalAportes: number
    patrimonioEstimado: number
    recorrentes: number
    diversificacao: number
  }
  assinaturas?: {
    totalMensal: number
    count: number
  }
}

export async function analisarScore(ctx: ScoreContext): Promise<string> {
  const context = {
    score: ctx.score,
    scoreLabel: ctx.scoreLabel,
    totalRenda: Number(ctx.totalRenda.toFixed(2)),
    totalGastos: Number(ctx.totalGastos.toFixed(2)),
    percentualEconomia: Number(ctx.percentualEconomia.toFixed(1)),
    categorias: ctx.categorias.slice(0, 8),
    investimentos: ctx.investimentos
      ? {
          totalAportes: round2(ctx.investimentos.totalAportes),
          patrimonioEstimado: round2(ctx.investimentos.patrimonioEstimado),
          recorrentes: ctx.investimentos.recorrentes,
          diversificacao: ctx.investimentos.diversificacao,
        }
      : null,
    assinaturas: ctx.assinaturas
      ? {
          totalMensal: round2(ctx.assinaturas.totalMensal),
          count: ctx.assinaturas.count,
        }
      : null,
    scoreRegras: {
      base: 300,
      poupancaScore: "min(percentualEconomia * 20, 400)",
      equilibrioScore: "gastos/renda < 0.8 => 300; < 1.0 => 150; senão => 50",
      investimentos: "bonus por investir: patrimonio, recorrencia, diversificacao",
      assinaturas: "ajuste por assinaturas: peso mensal vs renda e excesso de assinaturas",
      max: 1000,
    },
  }

  const prompt =
    "Analise o score e responda seguindo exatamente o formato pedido nas instruções do sistema. Use apenas os dados do CONTEXTO."

  return aiRequest({ task: "score", prompt, context, maxTokens: 500, temperature: 0.4 })
}

export interface CategoriaContext {
  categoria: string
  valor: number
  percentualDoTotal: number
  totalGastos: number
  numTransacoes: number
  periodo: string
  topDescricoes: string[]
}

export async function analisarCategoria(ctx: CategoriaContext): Promise<string> {
  const context = {
    categoria: ctx.categoria,
    valor: Number(ctx.valor.toFixed(2)),
    percentualDoTotal: Number(ctx.percentualDoTotal.toFixed(1)),
    totalGastos: Number(ctx.totalGastos.toFixed(2)),
    numTransacoes: ctx.numTransacoes,
    periodo: ctx.periodo,
    topDescricoes: ctx.topDescricoes.slice(0, 8),
  }

  const prompt =
    "Faça a análise da categoria e responda seguindo exatamente o formato pedido nas instruções do sistema. Use apenas os dados do CONTEXTO."

  return aiRequest({ task: "categoria", prompt, context, maxTokens: 450, temperature: 0.5 })
}

type TransacaoLike = {
  tipo: "receita" | "despesa"
  valor: number
  data: string
  descricao?: string | null
  categorias?: { nome?: string | null } | null
  metodo_pagamento?: string | null
}

function normalizeDesc(desc: string) {
  return desc
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function round2(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
}

function daysBetweenInclusive(start: string, end: string) {
  const a = new Date(start + "T00:00:00")
  const b = new Date(end + "T00:00:00")
  const ms = b.getTime() - a.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
  return Math.max(1, days)
}

export interface RelatorioContext {
  periodoLabel: string
  inicio: string
  fim: string
  transacoes: TransacaoLike[]
  transacoesPrev?: TransacaoLike[]
  inicioPrev?: string
  fimPrev?: string
  investimentos?: {
    totalAportes: number
    patrimonioEstimado: number
    recorrentes: number
    diversificacao: number
    aportesNoPeriodo?: number
  }
  assinaturas?: {
    totalMensal: number
    count: number
  }
}

export async function analisarRelatorio(ctx: RelatorioContext): Promise<string> {
  const tx = Array.isArray(ctx.transacoes) ? ctx.transacoes : []
  const txPrev = Array.isArray(ctx.transacoesPrev) ? ctx.transacoesPrev : []
  const despesas = tx.filter((t) => t.tipo === "despesa")
  const receitas = tx.filter((t) => t.tipo === "receita")
  const despesasPrev = txPrev.filter((t) => t.tipo === "despesa")
  const receitasPrev = txPrev.filter((t) => t.tipo === "receita")

  const totalGastos = despesas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
  const totalRenda = receitas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
  const totalGastosPrev = despesasPrev.reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
  const totalRendaPrev = receitasPrev.reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
  const saldoDisponivel = totalRenda - totalGastos
  const percentualEconomia = totalRenda > 0 ? ((saldoDisponivel) / totalRenda) * 100 : 0
  const gastosSobreRenda = totalRenda > 0 ? (totalGastos / totalRenda) * 100 : null

  const dias = daysBetweenInclusive(ctx.inicio, ctx.fim)
  const gastoMedioDia = totalGastos / dias

  const catMap = new Map<string, { total: number; count: number }>()
  for (const t of despesas) {
    const nome = (t.categorias?.nome || "Outros").toString()
    const cur = catMap.get(nome) ?? { total: 0, count: 0 }
    cur.total += Number(t.valor) || 0
    cur.count += 1
    catMap.set(nome, cur)
  }

  const topExpenseCategories = [...catMap.entries()]
    .map(([name, v]) => ({
      name,
      total: round2(v.total),
      count: v.count,
      percent: totalGastos > 0 ? round2((v.total / totalGastos) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const incomeCatMap = new Map<string, { total: number; count: number }>()
  for (const t of receitas) {
    const nome = (t.categorias?.nome || "Receitas").toString()
    const cur = incomeCatMap.get(nome) ?? { total: 0, count: 0 }
    cur.total += Number(t.valor) || 0
    cur.count += 1
    incomeCatMap.set(nome, cur)
  }

  const topIncomeCategories = [...incomeCatMap.entries()]
    .map(([name, v]) => ({ name, total: round2(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  const merchantMap = new Map<string, { total: number; count: number; raw: string }>()
  for (const t of despesas) {
    const raw = (t.descricao || "").toString().trim()
    if (!raw) continue
    const key = normalizeDesc(raw)
    const cur = merchantMap.get(key) ?? { total: 0, count: 0, raw }
    cur.total += Number(t.valor) || 0
    cur.count += 1
    if (raw.length > cur.raw.length) cur.raw = raw
    merchantMap.set(key, cur)
  }

  const topMerchants = [...merchantMap.values()]
    .map((m) => ({
      descricao: m.raw.slice(0, 60),
      total: round2(m.total),
      count: m.count,
      avg: round2(m.total / Math.max(1, m.count)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const recurringMerchants = [...merchantMap.values()]
    .filter((m) => m.count >= 3)
    .map((m) => ({
      descricao: m.raw.slice(0, 60),
      count: m.count,
      avg: round2(m.total / Math.max(1, m.count)),
      total: round2(m.total),
    }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 8)

  const topExpenses = [...despesas]
    .map((t) => ({
      data: t.data,
      descricao: ((t.descricao || "") as string).toString().slice(0, 60),
      categoria: (t.categorias?.nome || "Outros").toString(),
      valor: round2(Number(t.valor) || 0),
      metodo: (t.metodo_pagamento || null) as string | null,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 12)

  const topIncomes = [...receitas]
    .map((t) => ({
      data: t.data,
      descricao: ((t.descricao || "") as string).toString().slice(0, 60),
      categoria: (t.categorias?.nome || "Receitas").toString(),
      valor: round2(Number(t.valor) || 0),
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)

  const context = {
    periodo: { label: ctx.periodoLabel, inicio: ctx.inicio, fim: ctx.fim, dias },
    periodoAnterior: ctx.inicioPrev && ctx.fimPrev ? {
      inicio: ctx.inicioPrev,
      fim: ctx.fimPrev,
      totalRenda: round2(totalRendaPrev),
      totalGastos: round2(totalGastosPrev),
    } : null,
    totais: {
      totalRenda: round2(totalRenda),
      totalGastos: round2(totalGastos),
      saldoDisponivel: round2(saldoDisponivel),
      percentualEconomia: round2(percentualEconomia),
      gastosSobreRendaPercent: gastosSobreRenda == null ? null : round2(gastosSobreRenda),
      gastoMedioDia: round2(gastoMedioDia),
    },
    contagens: { transacoes: tx.length, receitas: receitas.length, despesas: despesas.length },
    topExpenseCategories,
    topIncomeCategories,
    topMerchants,
    recurringMerchants,
    topExpenses,
    topIncomes,
    investimentos: ctx.investimentos
      ? {
          totalAportes: round2(ctx.investimentos.totalAportes),
          patrimonioEstimado: round2(ctx.investimentos.patrimonioEstimado),
          recorrentes: ctx.investimentos.recorrentes,
          diversificacao: ctx.investimentos.diversificacao,
          aportesNoPeriodo: ctx.investimentos.aportesNoPeriodo == null ? null : round2(ctx.investimentos.aportesNoPeriodo),
        }
      : null,
    assinaturas: ctx.assinaturas
      ? {
          totalMensal: round2(ctx.assinaturas.totalMensal),
          count: ctx.assinaturas.count,
        }
      : null,
  }

  const prompt =
    "Gere uma análise completa do período e um plano de ação elaborado. Inclua insights sobre investimentos e assinaturas quando houver dados no CONTEXTO. Use somente o CONTEXTO; não invente referências externas."

  return aiRequest({ task: "report", prompt, context, maxTokens: 900, temperature: 0.45 })
}

