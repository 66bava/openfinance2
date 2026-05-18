export interface Profile {
  id: string
  nome: string
  email: string
  telefone?: string
  data_nascimento?: string | null
  renda_mensal: number
  meta_economia: number
  avatar_url?: string
  plano: string
  score?: number | null
  onboarding_completo?: boolean | null
  consentimento_politica?: boolean
  consentimento_marketing?: boolean
  data_consentimento?: string | null
  versao_politica?: string
  versao_termos_aceita?: string | null
  data_aceite_termos?: string | null
  notificacoes?: boolean
  moeda?: string
  idioma?: string
  theme_preference?: "light" | "dark" | "system" | null
  currency_preference?: string | null
  date_format_preference?: string | null
  objetivo_financeiro?: string | null
  perfil_financeiro?: string | null
}

// ── Ciclos Financeiros ────────────────────────────────────────────────────────

export interface FinancialCycle {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: 'active' | 'closed' | 'reset'
  opening_balance: number
  closing_balance: number | null
  carried_balance: number
  income_total: number | null
  expense_total: number | null
  investment_total: number | null
  score_snapshot: number | null
  created_at: string
  closed_at: string | null
  reset_at: string | null
  metadata?: Record<string, unknown> | null
}

export interface CycleReset {
  id: string
  user_id: string
  cycle_id: string
  reset_type: 'imports_only' | 'all_transactions' | 'imports_keep_manual'
  affected_transactions_count: number
  affected_imports_count: number
  previous_snapshot: Record<string, unknown> | null
  new_snapshot: Record<string, unknown> | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

export interface CategoryTrainingRule {
  id: string
  user_id: string
  key: string
  tipo: 'receita' | 'despesa' | null
  categoria_nome: string
  category_id: string | null
  confidence: number
  source: 'user_correction' | 'import_confirmation' | 'manual_rule'
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface StatementAnalysisResult {
  period_start: string | null
  period_end: string | null
  opening_balance_detected: number | null
  closing_balance_detected: number | null
  confidence: number
  summary: string
  warnings: string[]
  detected_patterns: Array<{ key: string; description: string; count: number; cadence: string }>
  suggested_categories: Array<{ name: string; count: number; total: number }>
  possible_duplicates: Array<{ date: string; description: string; amount: number; existingCount: number }>
  investment_events: Array<{ description: string; amount: number; date: string; type: 'receita' | 'despesa' }>
  recurring_candidates: Array<{ description: string; amount: number; cadence: string }>
}

export interface ImportBatch {
  id: string
  user_id: string
  source: 'csv' | 'ofx' | 'xlsx'
  filename: string
  filesize_bytes?: number | null
  status: 'processing' | 'completed' | 'failed'
  transactions_count: number
  total_income?: number | null
  total_expenses?: number | null
  statement_balance?: number | null
  score_before?: number | null
  score_after?: number | null
  recurring_count?: number | null
  subscriptions_count?: number | null
  payment_methods?: Record<string, unknown> | null
  categories_top?: Record<string, unknown> | null
  error_message?: string | null
  cycle_id?: string | null
  created_at: string
  completed_at?: string | null
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  acao: string
  detalhes: Record<string, unknown> | null
  criado_em: string
}

export interface Categoria {
  id: string
  user_id: string | null
  nome: string
  icone: string
  cor: string
  tipo: 'receita' | 'despesa'
  is_padrao: boolean
  emoji?: string | null
  descricao?: string | null
  ativo?: boolean
  ordem?: number
}

export interface Transacao {
  id: string
  user_id: string
  categoria_id: string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa'
  data: string
  categorias?: Categoria
  cartao_id?: string | null
  fatura_id?: string | null
  metodo_pagamento?: MetodoPagamento | null
  confirmado?: boolean
  import_id?: string | null
  grupo_parcela?: string | null
  parcela_atual?: number | null
  total_parcelas?: number | null
}

export interface Compromisso {
  id: string
  user_id: string
  descricao: string
  valor: number
  categoria_id?: string | null
  categorias?: Categoria
  tipo: 'financiamento' | 'despesa_fixa' | 'assinatura'
  dia_vencimento: number
  data_inicio: string
  data_fim?: string | null
  ativo: boolean
  criado_em: string

  financiamento_tipo?: 'carro' | 'casa' | 'apartamento' | 'moto' | 'outro' | null
  valor_total_financiado?: number | null
  valor_entrada?: number | null
  valor_parcela?: number | null
  parcelas_total?: number | null
  parcelas_pagas?: number | null
  metodo_pagamento?: MetodoPagamento | null
  observacoes?: string | null
}

export interface Meta {
  id: string
  user_id: string
  nome: string
  valor_alvo: number
  valor_atual: number
  prazo: string
  concluida: boolean
}

export interface Cartao {
  id: string
  user_id: string
  nome: string
  tipo: 'credito' | 'debito'
  bandeira: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outro' | null
  limite: number
  dia_vencimento: number | null
  dia_fechamento: number | null
  cor: string
  ativo: boolean
  criado_em: string
}

export interface Fatura {
  id: string
  cartao_id: string
  user_id: string
  mes: number
  ano: number
  valor_total: number
  valor_pago: number
  status: 'aberta' | 'fechada' | 'paga' | 'parcial'
  data_pagamento: string | null
  criado_em: string
  cartoes?: Cartao
}

export type MetodoPagamento =
  | 'dinheiro'
  | 'pix'
  | 'pix_qr_code'
  | 'transferencia'
  | 'debito'
  | 'credito'
  | 'boleto'
  | 'debito_automatico'
  | 'outro'
export type TipoPagamentoFatura = 'total' | 'parcial'
export type BandeiraCartao = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outro'
export type TipoCartao = 'credito' | 'debito'
export type StatusFatura = 'aberta' | 'fechada' | 'paga' | 'parcial'

export type CategoriaInvestimento = 'renda_fixa' | 'renda_variavel' | 'fundos' | 'outros'
export type RiscoInvestimento = 'baixo' | 'moderado' | 'alto'
export type LiquidezInvestimento = 'diaria' | 'curto' | 'media' | 'longo'
export type RecorrenciaInvestimento = 'semanal' | 'quinzenal' | 'mensal' | 'anual'

export interface Investimento {
  id: string
  user_id: string
  nome: string
  tipo: string
  categoria_investimento: CategoriaInvestimento
  corretora?: string | null
  corretora_personalizada?: string | null
  valor_aporte: number
  aporte_recorrente: boolean
  recorrencia?: RecorrenciaInvestimento | null
  rentabilidade?: number | null
  rentabilidade_tipo: 'percent' | 'reais'
  data_investimento: string
  vencimento?: string | null
  observacoes?: string | null
  risco: RiscoInvestimento
  liquidez: LiquidezInvestimento
  ativo: boolean
  created_at: string
  updated_at: string
}

export type RecorrenciaAssinatura = 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

export interface Assinatura {
  id: string
  user_id: string
  nome: string
  valor: number
  recorrencia: RecorrenciaAssinatura
  categoria?: string | null
  proximo_pagamento?: string | null
  renovacao_automatica: boolean
  ativo: boolean
  icone?: string | null
  cor?: string | null
  observacoes?: string | null
  categoria_financeira_id?: string | null
  metodo_pagamento?: MetodoPagamento | null
  dia_cobranca?: number | null
  created_at: string
  updated_at: string
}
