import { supabase } from '../supabase'
import type { Categoria } from '../types'

export const LIMITE_FREE = 4

// ─── Buscar categorias ────────────────────────────────────────────────────────

export async function getCategorias(userId: string): Promise<Categoria[]> {
  const { data: prefs } = await supabase
    .from('user_category_preferences')
    .select('categoria_id, hidden')
    .eq('user_id', userId)
    .eq('hidden', true)

  const hiddenPadrao = new Set((prefs ?? []).map((p: any) => String(p.categoria_id)))

  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .or(`is_padrao.eq.true,user_id.eq.${userId}`)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) throw error
  return (data ?? [])
    .filter((c: any) => !(c.is_padrao === true && hiddenPadrao.has(String(c.id))))
    .map((c: any) => ({
    ...c,
    ativo: c.ativo ?? true,
    ordem: c.ordem ?? 0,
  }))
}

export async function getCategoriasPadraoOcultas(userId: string): Promise<Categoria[]> {
  const { data: prefs, error: prefsErr } = await supabase
    .from('user_category_preferences')
    .select('categoria_id')
    .eq('user_id', userId)
    .eq('hidden', true)

  if (prefsErr) return []
  const ids = (prefs ?? []).map((p: any) => String(p.categoria_id)).filter(Boolean)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .in('id', ids)
    .eq('is_padrao', true)
    .order('nome', { ascending: true })

  if (error) return []
  return (data ?? []).map((c: any) => ({
    ...c,
    ativo: c.ativo ?? true,
    ordem: c.ordem ?? 0,
  }))
}

export async function setCategoriaPadraoOculta(userId: string, categoriaId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase
    .from('user_category_preferences')
    .upsert({ user_id: userId, categoria_id: categoriaId, hidden }, { onConflict: 'user_id,categoria_id' })

  if (error) throw error
}

export async function getCategoriasAtivas(userId: string): Promise<Categoria[]> {
  const todas = await getCategorias(userId)
  return todas.filter((c) => c.ativo !== false)
}

// ─── Contar personalizadas ────────────────────────────────────────────────────

export async function contarCategoriasPersonalizadas(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('categorias')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_padrao', false)
    .neq('ativo', false)

  if (error) throw error
  return count ?? 0
}

// ─── Criar categoria ──────────────────────────────────────────────────────────

export async function criarCategoria(
  userId: string,
  plano: string,
  dados: {
    nome: string
    tipo: 'receita' | 'despesa'
    icone: string
    cor: string
    descricao?: string
  }
): Promise<Categoria> {
  // Verificar limite do plano free
  if (plano === 'free') {
    const count = await contarCategoriasPersonalizadas(userId)
    if (count >= LIMITE_FREE) {
      const err = new Error('LIMITE_ATINGIDO')
      throw err
    }
  }

  const { data, error } = await supabase
    .from('categorias')
    .insert({
      user_id: userId,
      nome: dados.nome.trim(),
      tipo: dados.tipo,
      icone: dados.icone,
      emoji: dados.icone,
      cor: dados.cor,
      descricao: dados.descricao ?? null,
      is_padrao: false,
      ativo: true,
      ordem: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Editar categoria ─────────────────────────────────────────────────────────

export async function editarCategoria(
  id: string,
  userId: string,
  dados: {
    nome?: string
    tipo?: 'receita' | 'despesa'
    icone?: string
    cor?: string
    descricao?: string
  }
): Promise<Categoria> {
  const update: Record<string, unknown> = { ...dados }
  if (dados.nome) update.nome = dados.nome.trim()
  if (dados.icone) update.emoji = dados.icone

  const { data, error } = await supabase
    .from('categorias')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Deletar categoria ────────────────────────────────────────────────────────

export async function deletarCategoria(id: string, userId: string): Promise<void> {
  // Verificar se tem transações vinculadas
  const { count } = await supabase
    .from('transacoes')
    .select('*', { count: 'exact', head: true })
    .eq('categoria_id', id)
    .eq('user_id', userId)

  if ((count ?? 0) > 0) {
    throw new Error('CATEGORIA_COM_TRANSACOES')
  }

  const { error } = await supabase
    .from('categorias')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}
