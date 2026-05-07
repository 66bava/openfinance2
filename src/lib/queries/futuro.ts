import { supabase } from '../supabase'
import type { Transacao, Compromisso } from '../types'

export async function getParcelasFuturas(userId: string): Promise<Transacao[]> {
  const hoje = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('transacoes')
    .select('*, categorias(*)')
    .eq('user_id', userId)
    .eq('tipo', 'despesa')
    .gt('data', hoje)
    .not('total_parcelas', 'is', null)
    .order('data', { ascending: true })
  if (error) return []
  return data || []
}

export async function getCompromissos(userId: string): Promise<Compromisso[]> {
  const { data, error } = await supabase
    .from('compromissos')
    .select('*, categorias(*)')
    .eq('user_id', userId)
    .eq('ativo', true)
    .order('dia_vencimento', { ascending: true })
  if (error) return []
  return data || []
}

export async function criarCompromisso(
  userId: string,
  dados: Omit<Compromisso, 'id' | 'user_id' | 'criado_em' | 'categorias'>
): Promise<Compromisso> {
  const { data, error } = await supabase
    .from('compromissos')
    .insert({ ...dados, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerCompromisso(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('compromissos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function inativarCompromisso(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('compromissos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
