import type { ScoreInputs, ScoreInsight, ScoreLevel, ScoreResult } from "./types"

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function round1(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(1)) : 0
}

function safeNumber(n: unknown, fallback = 0) {
  const v = typeof n === "number" ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function computeIncomeVariabilityPct(evolucao?: Array<{ income: number; expenses: number }> | null): number | null {
  const arr = (evolucao ?? []).map((e) => safeNumber(e.income, 0)).filter((n) => n > 0)
  if (arr.length < 3) return null
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  if (mean <= 0) return null
  const variance = arr.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / arr.length
  const sd = Math.sqrt(variance)
  return round1((sd / mean) * 100)
}

function levelFromScore(score: number): ScoreLevel {
  if (score >= 850) return "excelente"
  if (score >= 700) return "otimo"
  if (score >= 400) return "regular"
  return "critico"
}

export function calculateFinancialScore(input: ScoreInputs): ScoreResult {
  const totalRendaPeriodo = Math.max(0, safeNumber(input.totalRendaPeriodo, 0))
  const totalGastosPeriodo = Math.max(0, safeNumber(input.totalGastosPeriodo, 0))

  const rendaDeclarada = Math.max(0, safeNumber(input.rendaMensalDeclarada ?? 0, 0))
  const rendaRef = totalRendaPeriodo > 0 ? totalRendaPeriodo : rendaDeclarada

  const saldo = rendaRef - totalGastosPeriodo
  const economiaPct = rendaRef > 0 ? (saldo / rendaRef) * 100 : 0
  const gastosSobreRendaPct = rendaRef > 0 ? (totalGastosPeriodo / rendaRef) * 100 : null

  const assinaturasMensal = Math.max(0, safeNumber(input.assinaturasMensal ?? 0, 0))
  const compromissosMensal = Math.max(0, safeNumber(input.compromissosMensal ?? 0, 0))
  const burdenRecorrenciasPct =
    rendaRef > 0 ? round1(((assinaturasMensal + compromissosMensal) / rendaRef) * 100) : null

  const variabilityPct = computeIncomeVariabilityPct(input.evolucao ?? null)

  // Score (0-1000): base + pilares, com cap por pilar.
  const base = 300

  // P1 Economia (0..400): 0% => 0, 20%+ => 400.
  const econRatio = clamp01(economiaPct / 20)
  const economiaPoints = Math.round(econRatio * 400)

  // P2 Equilíbrio (50..300): gastos/renda
  const ratio = rendaRef > 0 ? totalGastosPeriodo / rendaRef : 2
  const equilibrioPoints = ratio <= 0.8 ? 300 : ratio <= 1 ? 150 : 50

  // P3 Recorrências/Endividamento (-150..+50): peso mensal relativo
  let recorrenciasPoints = 0
  if (rendaRef <= 0) recorrenciasPoints = -80
  else {
    const burden = (assinaturasMensal + compromissosMensal) / rendaRef
    if (burden >= 0.35) recorrenciasPoints = -150
    else if (burden >= 0.25) recorrenciasPoints = -110
    else if (burden >= 0.15) recorrenciasPoints = -70
    else if (burden >= 0.08) recorrenciasPoints = -30
    else recorrenciasPoints = 30
  }

  // P4 Investimentos (0..200)
  const inv = input.investimentos ?? null
  let investimentosPoints = 0
  if (inv) {
    const recorr = Math.min(1, safeNumber(inv.recorrentes, 0) / 2) // 0..2+
    const divers = Math.min(1, safeNumber(inv.diversificacao, 0) / 4) // 0..4+
    const patrRatio = rendaRef > 0 ? Math.min(1, safeNumber(inv.patrimonioEstimado, 0) / (rendaRef * 3)) : 0
    investimentosPoints = Math.round(60 + recorr * 50 + divers * 40 + patrRatio * 50)
    investimentosPoints = Math.max(0, Math.min(200, investimentosPoints))
  }

  // P5 Estabilidade (0..100)
  let estabilidadePoints = 0
  if (variabilityPct == null) estabilidadePoints = 50
  else if (variabilityPct <= 8) estabilidadePoints = 100
  else if (variabilityPct <= 15) estabilidadePoints = 80
  else if (variabilityPct <= 25) estabilidadePoints = 55
  else estabilidadePoints = 25

  const rawScore =
    base + economiaPoints + equilibrioPoints + recorrenciasPoints + investimentosPoints + estabilidadePoints
  const score = Math.round(Math.min(1000, Math.max(0, rawScore)))

  const issues: ScoreInsight[] = []
  const opportunities: ScoreInsight[] = []

  if (rendaRef <= 0) {
    issues.push({
      code: "no_income",
      title: "Renda não informada",
      message: "Sem renda no período, o score fica limitado. Informe renda mensal e registre entradas.",
      severity: "high",
    })
  }

  if (rendaRef > 0 && totalGastosPeriodo > rendaRef) {
    issues.push({
      code: "spend_over_income",
      title: "Gastos acima da renda",
      message: "Você está no negativo no ciclo atual. O foco é reduzir despesas rapidamente.",
      severity: "high",
    })
  } else if (rendaRef > 0 && economiaPct < 10) {
    issues.push({
      code: "low_savings",
      title: "Pouca economia",
      message: "Tente aumentar sua sobra mensal para pelo menos 10% da renda.",
      severity: economiaPct < 5 ? "high" : "medium",
    })
  } else if (economiaPct >= 20) {
    opportunities.push({
      code: "strong_savings",
      title: "Boa taxa de economia",
      message: "Você está acima de 20% de sobra. Ótima base para acelerar metas e investimentos.",
      severity: "low",
    })
  }

  if (burdenRecorrenciasPct != null && burdenRecorrenciasPct >= 15) {
    issues.push({
      code: "high_recurring_burden",
      title: "Recorrências pesadas",
      message: "Assinaturas/parcelas estão consumindo uma fatia relevante da sua renda.",
      severity: burdenRecorrenciasPct >= 25 ? "high" : "medium",
    })
  } else if (burdenRecorrenciasPct != null && burdenRecorrenciasPct <= 6) {
    opportunities.push({
      code: "healthy_recurring_burden",
      title: "Boa folga em recorrências",
      message: "Seu peso de recorrências está sob controle, o que aumenta sua flexibilidade.",
      severity: "low",
    })
  }

  if (!inv || safeNumber(inv.patrimonioEstimado, 0) <= 0) {
    opportunities.push({
      code: "start_investing",
      title: "Espaço para investir",
      message: "Com uma rotina simples de aportes, você melhora estabilidade e acelera patrimônio.",
      severity: "low",
    })
  } else if (safeNumber(inv.diversificacao, 0) < 2) {
    opportunities.push({
      code: "diversify",
      title: "Diversificação pode melhorar",
      message: "Diversificar ajuda a reduzir risco e aumentar consistência do crescimento.",
      severity: "low",
    })
  }

  if (variabilityPct != null && variabilityPct >= 20) {
    issues.push({
      code: "income_unstable",
      title: "Renda instável",
      message: "Sua renda varia bastante. Reserve uma margem maior e priorize um colchão de liquidez.",
      severity: "medium",
    })
  }

  const quickActions = [
    rendaRef > 0 && totalGastosPeriodo > rendaRef
      ? {
          code: "cut_expenses_now",
          title: "Corte 10% dos gastos hoje",
          message: "Escolha 1 categoria e reduza 10% no próximo ciclo (ex.: alimentação, delivery, apps).",
          impact: "high" as const,
        }
      : economiaPct < 10
        ? {
            code: "auto_save_10",
            title: "Automatize 10% de sobra",
            message: "Defina um valor fixo para reservar no dia do pagamento e trate como conta obrigatória.",
            impact: "high" as const,
          }
        : {
            code: "keep_savings",
            title: "Mantenha a consistência",
            message: "Repita o que funcionou: preservar sobra mensal é o pilar mais forte do score.",
            impact: "medium" as const,
          },
    burdenRecorrenciasPct != null && burdenRecorrenciasPct >= 15
      ? {
          code: "review_recurring",
          title: "Revisar recorrências",
          message: "Cancele/renegocie 1 item e reduza o peso mensal para < 10% da renda.",
          impact: "high" as const,
        }
      : {
          code: "track_recurring",
          title: "Acompanhe recorrências",
          message: "Marque assinaturas e parcelas para o app te alertar antes do vencimento.",
          impact: "medium" as const,
        },
    !inv || safeNumber(inv.patrimonioEstimado, 0) <= 0
      ? {
          code: "start_simple_investing",
          title: "Comece com aportes simples",
          message: "Faça 1 aporte pequeno por mês (renda fixa) para criar rotina e elevar o score.",
          impact: "medium" as const,
        }
      : {
          code: "improve_diversification",
          title: "Melhore a diversificação",
          message: "Adicione 1 classe/objetivo (ex.: liquidez + longo prazo) para reduzir risco.",
          impact: "low" as const,
        },
  ]

  const explanationParts: string[] = []
  if (gastosSobreRendaPct != null) explanationParts.push(`Seus gastos estão em ${Math.round(gastosSobreRendaPct)}% da renda de referência.`)
  if (Number.isFinite(economiaPct)) explanationParts.push(`Sua economia está em ${Math.round(economiaPct)}%.`)
  if (burdenRecorrenciasPct != null) explanationParts.push(`Recorrências pesam ${Math.round(burdenRecorrenciasPct)}% da renda.`)
  const explanation =
    explanationParts.length > 0
      ? explanationParts.join(" ")
      : "Dados insuficientes para explicar o score. Registre entradas/saídas e configure sua renda mensal."

  return {
    score,
    level: levelFromScore(score),
    explanation,
    issues: issues.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    quickActions: quickActions.slice(0, 3),
    breakdown: [
      { pillar: "economia", points: economiaPoints, maxPoints: 400 },
      { pillar: "equilibrio", points: equilibrioPoints, maxPoints: 300 },
      { pillar: "recorrencias", points: recorrenciasPoints, maxPoints: 50 },
      { pillar: "investimentos", points: investimentosPoints, maxPoints: 200 },
      { pillar: "estabilidade", points: estabilidadePoints, maxPoints: 100 },
    ],
    metrics: {
      rendaRef,
      economiaPct: round1(economiaPct),
      gastosSobreRendaPct: gastosSobreRendaPct == null ? null : round1(gastosSobreRendaPct),
      burdenRecorrenciasPct,
      rendaVariabilityPct: variabilityPct,
    },
  }
}
