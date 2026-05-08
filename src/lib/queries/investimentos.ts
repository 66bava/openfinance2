import { supabase } from '../supabase'
import type { Investimento } from '../types'

export async function getInvestimentos(userId: string): Promise<Investimento[]> {
  const { data, error } = await supabase
    .from('investimentos')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function getTotalInvestido(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('investimentos')
    .select('valor_aporte')
    .eq('user_id', userId)
    .eq('ativo', true)
  if (error) return 0
  return (data || []).reduce((acc, i) => acc + (i.valor_aporte ?? 0), 0)
}

export async function criarInvestimento(
  userId: string,
  dados: Omit<Investimento, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Investimento> {
  const { data, error } = await supabase
    .from('investimentos')
    .insert({ ...dados, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarInvestimento(
  id: string,
  userId: string,
  dados: Partial<Omit<Investimento, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('investimentos')
    .update(dados)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removerInvestimento(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('investimentos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export function calcularRentabilidadeEstimada(investimento: Investimento): number {
  if (!investimento.rentabilidade) return 0
  if (investimento.rentabilidade_tipo === 'reais') return investimento.rentabilidade
  return investimento.valor_aporte * (investimento.rentabilidade / 100)
}

export function calcularPatrimonioEstimado(investimentos: Investimento[]): number {
  return investimentos.reduce((acc, inv) => {
    const rent = calcularRentabilidadeEstimada(inv)
    return acc + inv.valor_aporte + rent
  }, 0)
}
