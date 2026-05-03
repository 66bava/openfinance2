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
  consentimento_politica?: boolean
  consentimento_marketing?: boolean
  data_consentimento?: string | null
  versao_politica?: string
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
  metodo_pagamento?: 'dinheiro' | 'debito' | 'credito' | 'pix' | 'transferencia' | null
  confirmado?: boolean
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

export type MetodoPagamento = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'transferencia'
export type TipoPagamentoFatura = 'total' | 'parcial'
export type BandeiraCartao = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outro'
export type TipoCartao = 'credito' | 'debito'
export type StatusFatura = 'aberta' | 'fechada' | 'paga' | 'parcial'
