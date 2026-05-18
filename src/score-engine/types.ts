export type ScoreLevel = "critico" | "regular" | "otimo" | "excelente"

export type ScoreSeverity = "high" | "medium" | "low"

export type ScoreInsight = {
  code: string
  title: string
  message: string
  severity: ScoreSeverity
}

export type ScoreAction = {
  code: string
  title: string
  message: string
  impact: "high" | "medium" | "low"
}

export type ScoreBreakdownItem = {
  pillar: string
  points: number
  maxPoints: number
}

export type ScoreInputs = {
  rendaMensalDeclarada?: number | null
  totalRendaPeriodo: number
  totalGastosPeriodo: number
  assinaturasMensal?: number
  compromissosMensal?: number
  investimentos?: {
    totalAportes: number
    patrimonioEstimado: number
    recorrentes: number
    diversificacao: number
  } | null
  evolucao?: Array<{ income: number; expenses: number }> | null
}

export type ScoreResult = {
  score: number
  level: ScoreLevel
  explanation: string
  issues: ScoreInsight[]
  opportunities: ScoreInsight[]
  quickActions: ScoreAction[]
  breakdown: ScoreBreakdownItem[]
  metrics: {
    rendaRef: number
    economiaPct: number
    gastosSobreRendaPct: number | null
    burdenRecorrenciasPct: number | null
    rendaVariabilityPct: number | null
  }
}
