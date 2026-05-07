import { supabase } from './supabase'
import type { Transacao, Profile } from './types'

// ─── Transações ────────────────────────────────────────────────────────────

export async function getTransacoesMes(userId: string) {
  const inicio = new Date()
  inicio.setDate(1)

  const { data, error } = await supabase
    .from('transacoes')
    .select('*, categorias(*)')
    .eq('user_id', userId)
    .gte('data', inicio.toISOString().split('T')[0])
    .order('data', { ascending: false })

  if (error) return []
  return data || []
}

export async function getTransacoesPeriodo(
  userId: string,
  dataInicio: string,
  dataFim: string
) {
  const { data, error } = await supabase
    .from('transacoes')
    .select('*, categorias(*)')
    .eq('user_id', userId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false })

  if (error) return []
  return data || []
}

export async function getTransacoesMesEspecifico(
  userId: string,
  mes: number,
  ano: number
) {
  const dataInicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
  const lastDay = new Date(ano, mes + 1, 0).getDate()
  const dataFim = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return getTransacoesPeriodo(userId, dataInicio, dataFim)
}

// ─── Totais ────────────────────────────────────────────────────────────────

export function calcularTotais(transacoes: any[]) {
  const totalGastos = transacoes
    .filter((t: any) => t.tipo === 'despesa')
    .reduce((acc: number, t: any) => acc + t.valor, 0)

  const totalRenda = transacoes
    .filter((t: any) => t.tipo === 'receita')
    .reduce((acc: number, t: any) => acc + t.valor, 0)

  return {
    totalGastos,
    totalRenda,
    saldoDisponivel: totalRenda - totalGastos,
    percentualEconomia:
      totalRenda > 0 ? ((totalRenda - totalGastos) / totalRenda) * 100 : 0,
  }
}

export async function getTotaisMes(userId: string) {
  const transacoes = await getTransacoesMes(userId)
  return calcularTotais(transacoes)
}

// ─── Categorias (agrupamento) ──────────────────────────────────────────────

export function calcularCategorias(transacoes: any[]) {
  const despesas = transacoes.filter((t: any) => t.tipo === 'despesa')
  const total = despesas.reduce((acc: number, t: any) => acc + t.valor, 0)

  if (total === 0) return []

  const agrupado = despesas.reduce((acc: Record<string, number>, t: any) => {
    const nome = t.categorias?.nome || 'Outros'
    acc[nome] = (acc[nome] || 0) + t.valor
    return acc
  }, {})

  return Object.entries(agrupado)
    .map(([nome, valor]) => ({
      name: nome,
      value: valor,
      percent: parseFloat(((valor / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value)
}

export async function getGastosPorCategoria(userId: string) {
  const transacoes = await getTransacoesMes(userId)
  return calcularCategorias(transacoes)
}

// ─── Evolução mensal ───────────────────────────────────────────────────────

export async function getEvolucaoMensal(userId: string, meses = 6) {
  const dataInicio = new Date()
  dataInicio.setMonth(dataInicio.getMonth() - (meses - 1))
  dataInicio.setDate(1)

  const { data, error } = await supabase
    .from('transacoes')
    .select('valor, tipo, data')
    .eq('user_id', userId)
    .gte('data', dataInicio.toISOString().split('T')[0])
    .order('data', { ascending: true })

  if (error) return []

  const mesesMap: Record<string, { month: string; income: number; expenses: number }> = {}

  for (const t of data || []) {
    const date = new Date(t.data + 'T00:00:00')
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' })

    if (!mesesMap[key]) {
      mesesMap[key] = { month: monthLabel, income: 0, expenses: 0 }
    }

    if (t.tipo === 'receita') {
      mesesMap[key].income += t.valor
    } else {
      mesesMap[key].expenses += t.valor
    }
  }

  return Object.values(mesesMap)
}

// ─── Adicionar / deletar transação ────────────────────────────────────────

export async function deleteTransacao(id: string) {
  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addTransacao(
  userId: string,
  transacao: Omit<Transacao, 'id' | 'user_id'>
) {
  const { data, error } = await supabase
    .from('transacoes')
    .insert({ ...transacao, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Categorias (tabela) ───────────────────────────────────────────────────

export async function getOrCreateCategoria(
  userId: string,
  nome: string,
  tipo: 'despesa' | 'receita' = 'despesa'
): Promise<string> {
  const { data: existing } = await supabase
    .from('categorias')
    .select('id')
    .eq('nome', nome)
    .or(`user_id.eq.${userId},is_padrao.eq.true`)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: nova, error } = await supabase
    .from('categorias')
    .upsert(
      { user_id: userId, nome, tipo, icone: '📦', cor: '#777777', is_padrao: false },
      { onConflict: 'user_id,nome', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error || !nova) throw new Error('Erro ao criar categoria')
  return nova.id
}

// ─── Perfil ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  return data || null
}

export async function upsertProfile(
  userId: string,
  email: string,
  dados: Partial<Omit<Profile, 'id' | 'email'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, ...dados }, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
