import { supabase } from '../supabase'
import type { Cartao, Fatura, Transacao } from '../types'
import { getOrCreateCategoria } from '../queries'

// ─── Cartões ──────────────────────────────────────────────────────────────────

export async function getCartoes(userId: string): Promise<Cartao[]> {
  const { data, error } = await supabase
    .from('cartoes')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .order('criado_em', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function criarCartao(
  userId: string,
  dados: Omit<Cartao, 'id' | 'user_id' | 'ativo' | 'criado_em'>
): Promise<Cartao> {
  const { data: cartao, error } = await supabase
    .from('cartoes')
    .insert({ ...dados, user_id: userId, ativo: true })
    .select()
    .single()

  if (error) throw error

  // Criar fatura do mês atual para cartões de crédito
  if (dados.tipo === 'credito') {
    const agora = new Date()
    await supabase.from('faturas').upsert(
      {
        cartao_id: cartao.id,
        user_id: userId,
        mes: agora.getMonth() + 1,
        ano: agora.getFullYear(),
        valor_total: 0,
        valor_pago: 0,
        status: 'aberta',
      },
      { onConflict: 'cartao_id,mes,ano' }
    )
  }

  return cartao
}

export async function deletarCartao(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('cartoes')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Faturas ──────────────────────────────────────────────────────────────────

export async function getFaturaAtual(
  cartaoId: string,
  mes: number,
  ano: number,
  userId: string
): Promise<Fatura> {
  // Tenta buscar fatura existente
  const { data: existente } = await supabase
    .from('faturas')
    .select('*')
    .eq('cartao_id', cartaoId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle()

  if (existente) return existente

  // Cria nova fatura se não existir
  const { data: nova, error } = await supabase
    .from('faturas')
    .insert({
      cartao_id: cartaoId,
      user_id: userId,
      mes,
      ano,
      valor_total: 0,
      valor_pago: 0,
      status: 'aberta',
    })
    .select()
    .single()

  if (error) throw error
  return nova
}

export async function getFaturas(cartaoId: string, userId: string): Promise<Fatura[]> {
  const { data, error } = await supabase
    .from('faturas')
    .select('*')
    .eq('cartao_id', cartaoId)
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getFaturaById(faturaId: string, userId: string): Promise<Fatura | null> {
  const { data, error } = await supabase
    .from('faturas')
    .select('*, cartoes(*)')
    .eq('id', faturaId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

// ─── Transações de fatura ─────────────────────────────────────────────────────

export async function getTransacoesFatura(
  faturaId: string,
  userId: string
): Promise<Transacao[]> {
  const { data, error } = await supabase
    .from('transacoes')
    .select('*, categorias(*)')
    .eq('fatura_id', faturaId)
    .eq('user_id', userId)
    .order('data', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getTransacoesCartaoMes(
  cartaoId: string,
  userId: string,
  mes: number,
  ano: number
): Promise<Transacao[]> {
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('transacoes')
    .select('*, categorias(*)')
    .eq('cartao_id', cartaoId)
    .eq('user_id', userId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ─── Recalcular fatura ────────────────────────────────────────────────────────

export async function recalcularFatura(faturaId: string, userId: string): Promise<void> {
  const { data: txs } = await supabase
    .from('transacoes')
    .select('valor')
    .eq('fatura_id', faturaId)
    .eq('user_id', userId)
    .eq('tipo', 'despesa')

  const total = (txs ?? []).reduce((acc, t) => acc + t.valor, 0)

  await supabase
    .from('faturas')
    .update({ valor_total: total })
    .eq('id', faturaId)
    .eq('user_id', userId)
}

// ─── Pagar fatura ─────────────────────────────────────────────────────────────

export async function pagarFatura(
  faturaId: string,
  userId: string,
  valorPago: number,
  tipo: 'total' | 'parcial',
  metodo: string,
  dataPagamento: string,
  nomeCartao: string,
  mes: number,
  ano: number
): Promise<void> {
  const fatura = await getFaturaById(faturaId, userId)
  if (!fatura) throw new Error('Fatura não encontrada')

  const novoStatus = tipo === 'total' ? 'paga' : 'parcial'
  const valorFinal = tipo === 'total' ? fatura.valor_total : valorPago

  // Atualiza fatura
  const { error: erroFatura } = await supabase
    .from('faturas')
    .update({
      status: novoStatus,
      valor_pago: valorFinal,
      data_pagamento: dataPagamento,
    })
    .eq('id', faturaId)
    .eq('user_id', userId)

  if (erroFatura) throw erroFatura

  // Cria transação de pagamento
  const mesNome = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })
  const categoriaId = await getOrCreateCategoria(userId, 'Pagamento de fatura')

  await supabase.from('transacoes').insert({
    user_id: userId,
    categoria_id: categoriaId,
    descricao: `Pagamento fatura ${nomeCartao} ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}/${ano}`,
    valor: valorFinal,
    tipo: 'despesa',
    data: dataPagamento,
    metodo_pagamento: metodo,
    confirmado: true,
  })
}

// ─── Confirmar transação ──────────────────────────────────────────────────────

export async function confirmarTransacao(transacaoId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('transacoes')
    .update({ confirmado: true })
    .eq('id', transacaoId)
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Resumo do mês ────────────────────────────────────────────────────────────

export async function getResumoPagamentosMes(userId: string) {
  const agora = new Date()
  const mes = agora.getMonth() + 1
  const ano = agora.getFullYear()

  const { data: faturas } = await supabase
    .from('faturas')
    .select('*, cartoes(*)')
    .eq('user_id', userId)
    .eq('mes', mes)
    .eq('ano', ano)

  const lista = faturas ?? []

  const aPagar = lista
    .filter((f) => f.status === 'aberta' || f.status === 'parcial')
    .reduce((acc, f) => acc + (f.valor_total - f.valor_pago), 0)

  const jaPago = lista.reduce((acc, f) => acc + (f.valor_pago ?? 0), 0)

  // Faturas com vencimento nos próximos 7 dias
  const em7Dias = lista.filter((f) => {
    if (f.status === 'paga') return false
    const cartao = f.cartoes as Cartao | undefined
    if (!cartao?.dia_vencimento) return false
    const vencimento = new Date(ano, mes - 1, cartao.dia_vencimento)
    const diff = (vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  })

  return { aPagar, jaPago, venceEmBreve: em7Dias, faturas: lista }
}
