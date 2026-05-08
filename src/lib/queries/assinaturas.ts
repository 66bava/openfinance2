import { supabase } from '../supabase'
import type { Assinatura } from '../types'

export async function getAssinaturas(userId: string): Promise<Assinatura[]> {
  const { data, error } = await supabase
    .from('assinaturas')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .order('proximo_pagamento', { ascending: true })
  if (error) return []
  return data || []
}

export async function criarAssinatura(
  userId: string,
  dados: Omit<Assinatura, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Assinatura> {
  const { data, error } = await supabase
    .from('assinaturas')
    .insert({ ...dados, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarAssinatura(
  id: string,
  userId: string,
  dados: Partial<Omit<Assinatura, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('assinaturas')
    .update(dados)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removerAssinatura(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('assinaturas')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export function calcularTotalMensal(assinaturas: Assinatura[]): number {
  const MULTIPLIERS: Record<string, number> = {
    semanal: 4.33,
    quinzenal: 2,
    mensal: 1,
    bimestral: 0.5,
    trimestral: 0.333,
    semestral: 0.167,
    anual: 0.083,
  }
  return assinaturas
    .filter((a) => a.ativo)
    .reduce((acc, a) => acc + a.valor * (MULTIPLIERS[a.recorrencia] ?? 1), 0)
}

export function calcularTotalAnual(assinaturas: Assinatura[]): number {
  return calcularTotalMensal(assinaturas) * 12
}
