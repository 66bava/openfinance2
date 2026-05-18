import type { ImportedTransactionCandidate } from "./index"
import { detectRecurringTransactions } from "./index"
import type { StatementAnalysisResult } from "../types"

// ── Normaliza descrição para chave estável ────────────────────────────────────

function normalizeDescKey(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[|/\\]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// ── Fingerprint por transação ─────────────────────────────────────────────────
// Chave determinística para detectar duplicatas entre importações

export function computeTransactionFingerprint(
  date: string,
  amount: number,
  description: string,
  type: "receita" | "despesa",
): string {
  return `${date}|${normalizeDescKey(description)}|${type}|${Math.round(amount * 100)}`
}

// ── Análise do extrato ────────────────────────────────────────────────────────

export function analyzeStatement(
  candidates: ImportedTransactionCandidate[],
  existingFingerprints?: Set<string>,
): StatementAnalysisResult {
  if (candidates.length === 0) {
    return {
      period_start: null,
      period_end: null,
      opening_balance_detected: null,
      closing_balance_detected: null,
      confidence: 0,
      summary: "Nenhuma transação encontrada no arquivo.",
      warnings: ["Arquivo vazio ou sem transações reconhecidas."],
      detected_patterns: [],
      suggested_categories: [],
      possible_duplicates: [],
      investment_events: [],
      recurring_candidates: [],
    }
  }

  // ── Período ───────────────────────────────────────────────────────────────
  const dates = candidates.map((c) => c.date).sort()
  const period_start = dates[0] ?? null
  const period_end = dates[dates.length - 1] ?? null

  // ── Totais ────────────────────────────────────────────────────────────────
  const income = candidates.filter((c) => c.type === "receita").reduce((s, c) => s + c.amount, 0)
  const expenses = candidates.filter((c) => c.type === "despesa").reduce((s, c) => s + c.amount, 0)
  const balance = income - expenses

  // ── Duplicatas ────────────────────────────────────────────────────────────
  const possible_duplicates: StatementAnalysisResult["possible_duplicates"] = []

  if (existingFingerprints && existingFingerprints.size > 0) {
    for (const c of candidates) {
      const fp = computeTransactionFingerprint(c.date, c.amount, c.description, c.type)
      if (existingFingerprints.has(fp)) {
        possible_duplicates.push({
          date: c.date,
          description: c.description,
          amount: c.amount,
          existingCount: 1,
        })
      }
    }
  }

  // Dedup interno do arquivo (mesma transação aparecendo 2x)
  const fpsSeen = new Map<string, number>()
  for (const c of candidates) {
    const fp = computeTransactionFingerprint(c.date, c.amount, c.description, c.type)
    fpsSeen.set(fp, (fpsSeen.get(fp) ?? 0) + 1)
  }
  for (const c of candidates) {
    const fp = computeTransactionFingerprint(c.date, c.amount, c.description, c.type)
    const count = fpsSeen.get(fp) ?? 1
    if (count > 1 && !possible_duplicates.find((d) => d.description === c.description && d.date === c.date)) {
      possible_duplicates.push({
        date: c.date,
        description: c.description,
        amount: c.amount,
        existingCount: count,
      })
    }
  }

  // ── Investimentos ─────────────────────────────────────────────────────────
  const investment_events: StatementAnalysisResult["investment_events"] = candidates
    .filter((c) => c.isInvestment)
    .map((c) => ({ description: c.description, amount: c.amount, date: c.date, type: c.type }))

  // ── Recorrências ──────────────────────────────────────────────────────────
  const recurring = detectRecurringTransactions(candidates)
  const recurring_candidates = recurring.map((r) => ({
    description: r.description,
    amount: r.amountMedian,
    cadence: r.cadence,
  }))

  const detected_patterns = recurring.map((r) => ({
    key: r.key,
    description: r.description,
    count: r.count,
    cadence: r.cadence,
  }))

  // ── Categorias sugeridas ──────────────────────────────────────────────────
  const catMap = new Map<string, { count: number; total: number }>()
  for (const c of candidates) {
    const name = c.category.name
    const cur = catMap.get(name) ?? { count: 0, total: 0 }
    cur.count++
    cur.total += c.amount
    catMap.set(name, cur)
  }
  const suggested_categories = [...catMap.entries()]
    .map(([name, v]) => ({ name, count: v.count, total: v.total }))
    .sort((a, b) => b.total - a.total)

  // ── Warnings ─────────────────────────────────────────────────────────────
  const warnings: string[] = []

  if (possible_duplicates.length > 0) {
    warnings.push(
      `${possible_duplicates.length} transação(ões) já existem no ciclo atual e serão marcadas como duplicadas.`,
    )
  }
  if (investment_events.length > 0) {
    warnings.push(`${investment_events.length} evento(s) de investimento detectado(s).`)
  }
  const avgConfidence = candidates.reduce((s, c) => s + c.category.confidence, 0) / candidates.length
  if (avgConfidence < 0.6) {
    warnings.push("Confiança média de categorização abaixo de 60%. Revise as categorias antes de confirmar.")
  }
  const othersCandidates = candidates.filter((c) => c.category.name === "Outros")
  if (othersCandidates.length > candidates.length * 0.3) {
    warnings.push(
      `${othersCandidates.length} transações foram classificadas como "Outros". Considere revisar.`,
    )
  }

  // ── Confiança geral ───────────────────────────────────────────────────────
  let confidence = avgConfidence
  if (possible_duplicates.length > 0) confidence *= 0.8
  if (candidates.length < 3) confidence *= 0.7
  confidence = Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100

  // ── Resumo ────────────────────────────────────────────────────────────────
  const summary = [
    `${candidates.length} transações de ${period_start} a ${period_end}.`,
    `Receitas: R$ ${income.toFixed(2)}, Despesas: R$ ${expenses.toFixed(2)}, Saldo: R$ ${balance.toFixed(2)}.`,
    recurring.length > 0 ? `${recurring.length} padrão(ões) recorrente(s) detectado(s).` : null,
    investment_events.length > 0 ? `${investment_events.length} evento(s) de investimento.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return {
    period_start,
    period_end,
    opening_balance_detected: null,
    closing_balance_detected: null,
    confidence,
    summary,
    warnings,
    detected_patterns,
    suggested_categories,
    possible_duplicates,
    investment_events,
    recurring_candidates,
  }
}
