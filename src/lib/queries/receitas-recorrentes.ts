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

function mondayOfCurrentWeek(): string {
  const today = new Date()
  const dow = today.getDay()
  const daysBack = dow === 0 ? 6 : dow - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysBack)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export async function consultarLimiteIa(userId: string): Promise<{
  usado: number
  limite: number
}> {
  const { data } = await supabase
    .from('profiles')
    .select('plano, relatorios_ia_semana, semana_ia_reset')
    .eq('id', userId)
    .single()

  if (!data) return { usado: 0, limite: 3 }

  const semanaAtual = mondayOfCurrentWeek()
  const usado = !data.semana_ia_reset || data.semana_ia_reset < semanaAtual
    ? 0
    : data.relatorios_ia_semana

  const limite = data.plano === 'familia' ? -1 : data.plano === 'pro' ? 10 : 3
  return { usado, limite }
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
