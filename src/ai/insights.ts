// Camada de insights automáticos (não-chatbot).
// Usa /api/ai no backend para manter chaves fora do browser e aplicar guardrails.

export type InsightTone = "neutro" | "urgente" | "positivo"

export type Insight = {
  title: string
  message: string
  tone: InsightTone
  tags?: string[]
}

import { aiRequest } from "./client"

type InsightsContext = {
  periodo?: string
  totais?: {
    renda?: number
    gastos?: number
    saldo?: number
    economiaPct?: number
  }
  categoriasTop?: Array<{ name?: string; value?: number; percent?: number }>
  assinaturas?: { totalMensal?: number; count?: number }
  compromissos?: { totalMensal?: number; count?: number }
  investimentos?: { patrimonioEstimado?: number; totalAportes?: number; count?: number }
  metodosPagamento?: Array<{ metodo_pagamento?: string | null; total?: number; count?: number }>
  score?: { score?: number; level?: string; issues?: any[]; opportunities?: any[] }
  format?: { currencyExample?: string }
}

function n(value: unknown): number {
  const x = typeof value === "number" ? value : Number(value)
  return Number.isFinite(x) ? x : 0
}

function currency(value: number, example?: string): string {
  // Tentativa de inferir a moeda/local pelo exemplo vindo do caller (formatCurrency).
  // Se não existir, cai no padrão pt-BR BRL.
  try {
    const hasBRL = typeof example === "string" && example.includes("R$")
    const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: hasBRL ? "BRL" : "BRL" })
    return fmt.format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

function pct(value: number): string {
  if (!Number.isFinite(value)) return "0%"
  return `${Math.round(value)}%`
}

function offlineWeeklyInsight(ctx: InsightsContext): string {
  const renda = n(ctx?.totais?.renda)
  const gastos = n(ctx?.totais?.gastos)
  const saldo = n(ctx?.totais?.saldo)
  const econ = n(ctx?.totais?.economiaPct)
  const top = Array.isArray(ctx?.categoriasTop) ? ctx.categoriasTop[0] : null
  const topName = (top?.name || "categoria principal").toString()
  const topPct = n((top as any)?.percent)
  const title =
    renda === 0 && gastos === 0
      ? "Sem dados suficientes"
      : saldo < 0
        ? "Saldo negativo no ciclo"
        : econ >= 20
          ? "Boa taxa de economia"
          : "Atenção à economia"

  const msg =
    renda === 0 && gastos === 0
      ? "Ainda não há transações suficientes no ciclo atual para detectar um padrão."
      : saldo < 0
        ? `Você fechou o ciclo com saldo negativo (${currency(Math.abs(saldo), ctx?.format?.currencyExample)}). O foco da semana é cortar 1 gasto não essencial.`
        : `Sua economia no ciclo está em ${pct(econ)}. A maior categoria é ${topName}${topPct ? ` (${pct(topPct)} dos gastos)` : ""}.`

  const action =
    renda === 0 && gastos === 0
      ? "Cadastre 3 transações (receita + 2 despesas) para ativar insights automáticos."
      : saldo < 0
        ? "Liste 3 despesas flexíveis e reduza 1 delas hoje (meta: -5% na semana)."
        : econ >= 20
          ? "Programe um aporte recorrente pequeno (ex: 1% da renda) para consolidar o hábito."
          : "Defina um teto semanal para a categoria principal e acompanhe diariamente."

  return `**Título:** ${title}\n**Mensagem:** ${msg}\n**Ação:** ${action}`
}

function offlineRiskAlert(ctx: InsightsContext): string {
  const saldo = n(ctx?.totais?.saldo)
  const renda = n(ctx?.totais?.renda)
  const gastos = n(ctx?.totais?.gastos)
  const subs = n(ctx?.assinaturas?.totalMensal)
  const comps = n(ctx?.compromissos?.totalMensal)
  const recorr = subs + comps
  const recorrPct = renda > 0 ? (recorr / renda) * 100 : 0

  const risk =
    renda === 0 && gastos === 0
      ? "Dados insuficientes"
      : saldo < 0
        ? "Você está gastando mais do que ganha no ciclo."
        : recorrPct >= 45
          ? "Recorrências estão consumindo grande parte da sua renda."
          : "Risco baixo no momento."

  const why =
    renda === 0 && gastos === 0
      ? "Sem transações suficientes para avaliar risco."
      : saldo < 0
        ? `Saldo do ciclo está negativo em ${currency(Math.abs(saldo), ctx?.format?.currencyExample)}.`
        : recorrPct >= 45
          ? `Assinaturas + compromissos somam ${currency(recorr, ctx?.format?.currencyExample)}/mês (~${pct(recorrPct)} da renda do ciclo).`
          : `Saldo do ciclo está positivo (${currency(saldo, ctx?.format?.currencyExample)}).`

  const todo =
    renda === 0 && gastos === 0
      ? "Cadastre pelo menos uma receita e 2 despesas para avaliar risco."
      : saldo < 0
        ? "Corte/negocie 1 recorrência hoje e evite novas despesas até o saldo ficar positivo."
        : recorrPct >= 45
          ? "Revise recorrências e cancele 1 item (meta: reduzir 5–10% ao mês)."
          : "Mantenha o controle e registre método/categoria em todas as despesas novas."

  return `**Risco:** ${risk}\n**Por que agora:** ${why}\n**O que fazer hoje:** ${todo}`
}

function offlineOpportunityInsight(ctx: InsightsContext): string {
  const econ = n(ctx?.totais?.economiaPct)
  const top = Array.isArray(ctx?.categoriasTop) ? ctx.categoriasTop[0] : null
  const topName = (top?.name || "categoria principal").toString()
  const topValue = n((top as any)?.value)

  const opp =
    econ >= 20
      ? "Aumentar aportes com consistência"
      : topValue > 0
        ? `Reduzir ${topName} sem perder qualidade`
        : "Organizar categorias para ganhar visibilidade"

  const why =
    topValue > 0
      ? `${topName} foi seu maior gasto no ciclo (${currency(topValue, ctx?.format?.currencyExample)}).`
      : econ >= 20
        ? `Você já está economizando ${pct(econ)}.`
        : "Com mais consistência de registro, os insights ficam mais precisos."

  const next =
    econ >= 20
      ? "Configure um aporte recorrente pequeno (ex: 1–2% da renda) e acompanhe por 30 dias."
      : topValue > 0
        ? `Defina um teto semanal para ${topName} e tente reduzir 5% nesta semana.`
        : "Reclassifique 5 transações antigas para melhorar a análise automática."

  return `**Oportunidade:** ${opp}\n**Por que vale a pena:** ${why}\n**Próximo passo:** ${next}`
}

function offlineFinancialSummary(ctx: InsightsContext): string {
  const renda = n(ctx?.totais?.renda)
  const gastos = n(ctx?.totais?.gastos)
  const saldo = n(ctx?.totais?.saldo)
  const econ = n(ctx?.totais?.economiaPct)
  const subs = n(ctx?.assinaturas?.totalMensal)
  const comps = n(ctx?.compromissos?.totalMensal)

  const bullets =
    renda === 0 && gastos === 0
      ? ["Sem transações suficientes no ciclo atual.", "Cadastre receitas e despesas para gerar insights.", "Use categorias e método de pagamento para melhorar a análise."]
      : [
          `Renda: ${currency(renda, ctx?.format?.currencyExample)} · Gastos: ${currency(gastos, ctx?.format?.currencyExample)}.`,
          `Saldo: ${currency(saldo, ctx?.format?.currencyExample)} · Economia: ${pct(econ)}.`,
          `Recorrências: ${currency(subs + comps, ctx?.format?.currencyExample)}/mês (assinaturas + compromissos).`,
        ]

  const focus =
    renda === 0 && gastos === 0
      ? "Complete o registro do ciclo (mínimo: 3 transações)."
      : saldo < 0
        ? "Virar o saldo para positivo cortando 1 gasto flexível."
        : econ < 15
          ? "Subir a economia do ciclo em +3–5 pontos percentuais."
          : "Manter a consistência e aumentar aportes aos poucos."

  return `**Resumo:**\n- ${bullets[0]}\n- ${bullets[1]}\n- ${bullets[2]}\n**1 foco da semana:** ${focus}`
}

function isInvalidKeyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "")
  const s = msg.toLowerCase()
  return s.includes("invalid api key") || s.includes("api key not valid") || s.includes("chave") && s.includes("inválida")
}

export async function generateWeeklyInsight(context: unknown): Promise<string> {
  try {
    return await aiRequest({
      task: "weekly_insight",
      prompt: "Gere um insight semanal automático usando apenas o CONTEXTO.",
      context,
      maxTokens: 220,
      temperature: 0.4,
    })
  } catch (err) {
    // Fallback definitivo: funciona mesmo sem chave de IA.
    if (isInvalidKeyError(err)) return offlineWeeklyInsight(context as InsightsContext)
    return offlineWeeklyInsight(context as InsightsContext)
  }
}

export async function generateRiskAlert(context: unknown): Promise<string> {
  try {
    return await aiRequest({
      task: "risk_alert",
      prompt: "Gere um alerta de risco com ação imediata usando apenas o CONTEXTO.",
      context,
      maxTokens: 240,
      temperature: 0.4,
    })
  } catch (err) {
    if (isInvalidKeyError(err)) return offlineRiskAlert(context as InsightsContext)
    return offlineRiskAlert(context as InsightsContext)
  }
}

export async function generateOpportunityInsight(context: unknown): Promise<string> {
  try {
    return await aiRequest({
      task: "opportunity_insight",
      prompt: "Gere um insight de oportunidade rápido e acionável usando apenas o CONTEXTO.",
      context,
      maxTokens: 240,
      temperature: 0.45,
    })
  } catch (err) {
    if (isInvalidKeyError(err)) return offlineOpportunityInsight(context as InsightsContext)
    return offlineOpportunityInsight(context as InsightsContext)
  }
}

export async function generateFinancialSummary(context: unknown): Promise<string> {
  try {
    return await aiRequest({
      task: "financial_summary",
      prompt: "Gere um resumo financeiro curto usando apenas o CONTEXTO.",
      context,
      maxTokens: 260,
      temperature: 0.35,
    })
  } catch (err) {
    if (isInvalidKeyError(err)) return offlineFinancialSummary(context as InsightsContext)
    return offlineFinancialSummary(context as InsightsContext)
  }
}
