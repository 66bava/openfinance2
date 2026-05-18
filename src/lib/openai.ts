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
  if (!res.ok) {
    const base = payload?.error?.message ?? `Erro ${res.status} na API`
    const detail = payload?.error?.detail ? ` (${payload.error.detail})` : ""
    throw new Error(`${base}${detail}`)
  }

  const content = payload?.content
  return typeof content === "string" && content.trim() ? content : "Não foi possível gerar a análise."
}

function isAiKeyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "")
  const s = msg.toLowerCase()
  return (
    s.includes("invalid api key") ||
    s.includes("api key not valid") ||
    (s.includes("chave") && (s.includes("inválida") || s.includes("expirada"))) ||
    s.includes("server is missing groq_api_key") ||
    s.includes("server is missing") && s.includes("api key")
  )
}

function fmtBRL(v: number): string {
  const n = Number(v) || 0
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
}

function pct(v: number): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return "0%"
  return `${Math.round(n)}%`
}

function offlineScore(ctx: ScoreContext): string {
  const renda = round2(ctx.totalRenda)
  const gastos = round2(ctx.totalGastos)
  const saldo = round2(renda - gastos)
  const econ = round2(ctx.percentualEconomia)
  const topCat = ctx.categorias?.[0]?.name ? `${ctx.categorias[0].name} (${pct(ctx.categorias[0].percent)})` : "sem categorias suficientes"

  const why =
    renda === 0 && gastos === 0
      ? "Dados insuficientes: ainda não há transações suficientes no ciclo para explicar o score."
      : saldo < 0
        ? `Você gastou mais do que recebeu (saldo ${fmtBRL(saldo)}). Isso derruba o equilíbrio gastos/renda.`
        : `Sua economia está em ${pct(econ)} com saldo ${fmtBRL(saldo)}; isso é o principal driver do score.`

  const actions: string[] = []
  if (renda === 0 && gastos === 0) {
    actions.push("Registre suas transações do ciclo (meta: 10+ transações) para o score refletir seu comportamento.")
    actions.push("Categorize as despesas principais (5 categorias) e marque método de pagamento para melhorar a leitura do padrão.")
    actions.push("Defina uma meta simples de economia (ex: guardar 5% da renda) e acompanhe por 30 dias.")
  } else {
    actions.push(`Defina um teto semanal para sua maior categoria (${topCat}) e reduza 5% nesta semana.`)
    actions.push(`Trave recorrências: revise assinaturas/compromissos e corte 1 item para liberar pelo menos ${fmtBRL(Math.max(10, renda * 0.01))}/mês.`)
    actions.push(`Automatize 1 hábito: programe um aporte recorrente (mesmo pequeno) e mantenha por 30 dias.`)
  }

  return [
    "**Resumo:**",
    `- Score atual: ${ctx.score} (${ctx.scoreLabel})`,
    `- Renda: ${fmtBRL(renda)} · Gastos: ${fmtBRL(gastos)} · Saldo: ${fmtBRL(saldo)}`,
    `- Economia: ${pct(econ)} · Maior categoria: ${topCat}`,
    "",
    "**Por que seu score está assim:**",
    why,
    "",
    "**3 ações para melhorar:**",
    `1. ${actions[0]}`,
    `2. ${actions[1]}`,
    `3. ${actions[2]}`,
  ].join("\n")
}

function offlineCategoria(ctx: CategoriaContext): string {
  const valor = round2(ctx.valor)
  const pctTotal = round2(ctx.percentualDoTotal)
  const total = round2(ctx.totalGastos)

  const avaliacao =
    total === 0 ? "Dados insuficientes para avaliar a categoria." :
      pctTotal >= 30 ? "Categoria muito concentrada no seu orçamento." :
        pctTotal >= 15 ? "Categoria relevante e com espaço para otimização." :
          "Categoria sob controle no geral."

  const porQue =
    total === 0
      ? "Sem despesas suficientes no período informado."
      : `Essa categoria soma ${fmtBRL(valor)} no período (${pct(pctTotal)} de ${fmtBRL(total)}), com ${ctx.numTransacoes} transações.`

  const a1 = `Defina um teto para ${ctx.categoria} (meta: -5% no próximo ciclo) e acompanhe semanalmente.`
  const a2 = `Escolha 1 descritor recorrente e reduza frequência/valor (meta: cortar ${fmtBRL(Math.max(10, valor * 0.05))} no mês).`

  return [
    "**Avaliação:**",
    avaliacao,
    "",
    "**Por que isso acontece:**",
    porQue,
    "",
    "**2 ações concretas para reduzir:**",
    `1. ${a1}`,
    `2. ${a2}`,
  ].join("\n")
}

function offlineRelatorio(context: any): string {
  const totais = context?.totais ?? {}
  const renda = round2(totais.totalRenda)
  const gastos = round2(totais.totalGastos)
  const saldo = round2(totais.saldoDisponivel)
  const econ = round2(totais.percentualEconomia)
  const gastoDia = round2(totais.gastoMedioDia)
  const topCats = Array.isArray(context?.topExpenseCategories) ? context.topExpenseCategories.slice(0, 4) : []

  const causas: string[] = []
  if (renda === 0 && gastos === 0) causas.push("Dados insuficientes: poucas transações no período.")
  if (saldo < 0) causas.push(`Saldo negativo (${fmtBRL(saldo)}): gastos acima da renda.`)
  if (topCats[0]?.name) causas.push(`Concentração em ${topCats[0].name} (${fmtBRL(topCats[0].total)}; ${pct(topCats[0].percent)} dos gastos).`)
  if (context?.assinaturas?.totalMensal != null) causas.push(`Recorrências: ${fmtBRL(round2(context.assinaturas.totalMensal))}/mês em assinaturas.`)

  const metas: string[] = []
  if (renda > 0) metas.push(`Economia: subir de ${pct(econ)} para ${pct(Math.min(50, econ + 5))} em 30 dias.`)
  if (topCats[0]?.name) metas.push(`Maior categoria (${topCats[0].name}): reduzir 5% no próximo ciclo.`)
  metas.push("Registro: manter 100% das despesas categorizadas no próximo ciclo.")

  const perguntas: string[] = []
  if (!Array.isArray(context?.topMerchants) || context.topMerchants.length === 0) perguntas.push("Você registra a descrição/estabelecimento em todas as despesas?")
  if (!context?.investimentos) perguntas.push("Você tem investimentos fora do app (renda fixa/variável) que ainda não cadastrou?")

  return [
    "**Resumo do período:**",
    `- Renda: ${fmtBRL(renda)} · Gastos: ${fmtBRL(gastos)} · Saldo: ${fmtBRL(saldo)}`,
    `- Economia: ${pct(econ)} · Gasto médio/dia: ${fmtBRL(gastoDia)}`,
    `- Transações: ${context?.contagens?.transacoes ?? 0} (receitas: ${context?.contagens?.receitas ?? 0}, despesas: ${context?.contagens?.despesas ?? 0})`,
    "",
    "**Por que está assim (causas prováveis):**",
    ...(causas.length ? causas.map((c) => `- ${c}`) : ["- Dados insuficientes para apontar causas com segurança."]),
    "",
    "**Plano de ação (7 dias):**",
    "- Categorize/ajuste as 20 transações mais recentes para melhorar a precisão.",
    "- Defina teto semanal para a maior categoria e acompanhe diariamente.",
    "- Revise recorrências e cancele/negocie 1 item se existir.",
    "",
    "**Plano de ação (30 dias):**",
    "- Reduzir 5% da maior categoria e medir impacto no saldo.",
    "- Criar uma reserva (ou aporte recorrente) mesmo pequena e manter consistência.",
    "- Ajustar métodos de pagamento/categorização para reduzir gastos invisíveis (dinheiro).",
    "",
    "**Plano de ação (90 dias):**",
    "- Consolidar orçamento por categoria com metas mensais realistas.",
    "- Reavaliar assinaturas/compromissos e manter apenas as de maior valor percebido.",
    "- Se possível, aumentar aportes e diversificar investimentos gradualmente.",
    "",
    "**Metas sugeridas:**",
    ...metas.map((m) => `- ${m}`),
    "",
    "**Perguntas (se faltar dado):**",
    ...(perguntas.length ? perguntas.map((p) => `- ${p}`) : ["- Sem perguntas no momento."]),
  ].join("\n")
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

  try {
    return await aiRequest({ task: "score", prompt, context, maxTokens: 500, temperature: 0.4 })
  } catch (err) {
    if (isAiKeyError(err)) return offlineScore(ctx)
    return offlineScore(ctx)
  }
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

  try {
    return await aiRequest({ task: "categoria", prompt, context, maxTokens: 450, temperature: 0.5 })
  } catch (err) {
    if (isAiKeyError(err)) return offlineCategoria(ctx)
    return offlineCategoria(ctx)
  }
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

  try {
    return await aiRequest({ task: "report", prompt, context, maxTokens: 900, temperature: 0.45 })
  } catch (err) {
    if (isAiKeyError(err)) return offlineRelatorio(context)
    return offlineRelatorio(context)
  }
}

