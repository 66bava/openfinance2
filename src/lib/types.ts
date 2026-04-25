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
  user_id: string
  nome: string
  icone: string
  cor: string
  tipo: 'receita' | 'despesa'
  is_padrao: boolean
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
