import { supabase } from '../supabase'

export interface ReceitaRecorrente {
  id: string
  user_id: string
  descricao: string
  valor: number
  dia_do_mes: number
  categoria_id: string | null
  ativo: boolean
  created_at: string
}

export type NovaReceitaRecorrente = Pick<ReceitaRecorrente, 'descricao' | 'valor' | 'dia_do_mes' | 'categoria_id'>

export async function getReceitasRecorrentes(userId: string): Promise<ReceitaRecorrente[]> {
  const { data, error } = await supabase
    .from('receitas_recorrentes')
    .select('*')
    .eq('user_id', userId)
    .order('dia_do_mes', { ascending: true })

  if (error) return []
  return data || []
}

export async function upsertReceitaRecorrente(
  userId: string,
  receita: NovaReceitaRecorrente,
  id?: string
): Promise<ReceitaRecorrente> {
  const payload = id
    ? { id, user_id: userId, ...receita }
    : { user_id: userId, ...receita }

  const { data, error } = await supabase
    .from('receitas_recorrentes')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error || !data) throw new Error('Erro ao salvar receita recorrente')
  return data
}

export async function toggleReceitaRecorrente(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('receitas_recorrentes')
    .update({ ativo })
    .eq('id', id)

  if (error) throw error
}

export async function deleteReceitaRecorrente(id: string): Promise<void> {
  const { error } = await supabase
    .from('receitas_recorrentes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function verificarIncrementarIaReport(userId: string): Promise<{
  success: boolean
  message?: string
  usado: number
  limite: number
}> {
  const { data, error } = await supabase.rpc('incrementar_relatorio_ia', { p_user_id: userId })

  if (error) throw new Error(error.message)
  return data as { success: boolean; message?: string; usado: number; limite: number }
}
