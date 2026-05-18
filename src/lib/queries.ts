import { supabase } from './supabase'
import type { Transacao, Profile, Categoria } from './types'
import { getCurrentCycleRange, getLastCycles } from './financial-cycle'
import { getUserFinancialSettings } from './queries/financial-settings'
export { getUserCyclesSnapshots, getUserFinancialSnapshot } from "./queries/financial-snapshot"
export * from "./queries/notifications"

// ─── Transações ────────────────────────────────────────────────────────────

export async function getTransacoesMes(userId: string) {
  const settings = await getUserFinancialSettings(userId)
  const { inicio, fim } = getCurrentCycleRange({ cycle_start_day: settings.cycle_start_day })

  const { data, error } = await supabase
    .from('transacoes')
    .select('*, categorias(*)')
    .eq('user_id', userId)
    .gte('data', inicio)
    .lte('data', fim)
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

export async function getTransacoesAll(userId: string, opts?: { limit?: number }) {
  const limit = Math.max(1, Math.min(2000, opts?.limit ?? 500))
  const { data, error } = await supabase
    .from("transacoes")
    .select("*, categorias(*)")
    .eq("user_id", userId)
    .order("data", { ascending: false })
    .limit(limit)

  if (error) return []
  return data || []
}

export async function getTransacaoById(userId: string, id: string): Promise<Transacao | null> {
  const { data, error } = await supabase
    .from("transacoes")
    .select("*, categorias(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return null
  return (data as any) || null
}

// ─── Totais ────────────────────────────────────────────────────────────────

export function calcularTotais(transacoes: any[]) {
  const totalGastos = transacoes
    .filter((t: any) => t.tipo === 'despesa')
    .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)

  const totalRenda = transacoes
    .filter((t: any) => t.tipo === 'receita')
    .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)

  const saldoDisponivel = totalRenda - totalGastos
  const percentualEconomia =
    totalRenda > 0 ? Math.max(0, Math.min(100, ((totalRenda - totalGastos) / totalRenda) * 100)) : 0

  return { totalGastos, totalRenda, saldoDisponivel, percentualEconomia }
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
  const settings = await getUserFinancialSettings(userId)
  const cycles = getLastCycles({ cycle_start_day: settings.cycle_start_day }, meses)
  if (cycles.length === 0) return []

  const earliest = cycles[0]!.inicio
  const latest = cycles[cycles.length - 1]!.fim

  const { data, error } = await supabase
    .from('transacoes')
    .select('valor, tipo, data')
    .eq('user_id', userId)
    .gte('data', earliest)
    .lte('data', latest)
    .order('data', { ascending: true })

  if (error) return []

  const out = cycles.map((c) => ({ month: c.label, income: 0, expenses: 0, inicio: c.inicio, fim: c.fim }))
  const byIndex = (dateStr: string) => {
    for (let i = 0; i < cycles.length; i++) {
      const c = cycles[i]!
      if (dateStr >= c.inicio && dateStr <= c.fim) return i
    }
    return -1
  }

  for (const t of data || []) {
    const idx = byIndex((t as any).data)
    if (idx < 0) continue
    if ((t as any).tipo === 'receita') out[idx]!.income += (t as any).valor
    else out[idx]!.expenses += (t as any).valor
  }

  return out.map(({ month, income, expenses }) => ({ month, income, expenses }))
}

// ─── Métodos de pagamento (agrupamento) ──────────────────────────────────────

export type MetodoPagamentoStats = {
  metodo_pagamento: Transacao["metodo_pagamento"]
  total: number
  count: number
}

export async function getGastosPorMetodoPagamento(
  userId: string,
  range?: { inicio: string; fim: string },
): Promise<MetodoPagamentoStats[]> {
  const settings = await getUserFinancialSettings(userId)
  const { inicio, fim } = range ?? getCurrentCycleRange({ cycle_start_day: settings.cycle_start_day })

  const { data, error } = await supabase
    .from("transacoes")
    .select("valor,tipo,metodo_pagamento")
    .eq("user_id", userId)
    .gte("data", inicio)
    .lte("data", fim)

  if (error) return []

  const map = new Map<string, { metodo: any; total: number; count: number }>()
  for (const t of data || []) {
    if ((t as any).tipo !== "despesa") continue
    const metodo = ((t as any).metodo_pagamento ?? null) as any
    const key = String(metodo ?? "null")
    const cur = map.get(key) ?? { metodo, total: 0, count: 0 }
    cur.total += Number((t as any).valor) || 0
    cur.count += 1
    map.set(key, cur)
  }

  return [...map.values()]
    .map((x) => ({ metodo_pagamento: x.metodo, total: x.total, count: x.count }))
    .sort((a, b) => b.total - a.total)
}

// ─── Adicionar / deletar transação ────────────────────────────────────────

export async function deleteTransacao(id: string) {
  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function deleteAllTransacoes(userId: string): Promise<number> {
  const { error, count } = await supabase
    .from("transacoes")
    .delete({ count: "exact" })
    .eq("user_id", userId)

  if (error) throw error
  return count ?? 0
}

export async function updateTransacao(
  userId: string,
  id: string,
  patch: Partial<Pick<Transacao, "descricao" | "valor" | "tipo" | "data" | "categoria_id" | "metodo_pagamento" | "confirmado">>,
): Promise<Transacao> {
  const payload: Record<string, any> = { ...patch }
  if (payload.valor != null) payload.valor = Number(payload.valor)

  const { data, error } = await supabase
    .from("transacoes")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, categorias(*)")
    .single()

  if (error) throw error
  return data as any
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

export async function addTransacoesBulk(
  userId: string,
  transacoes: Array<Omit<Transacao, "id" | "user_id">>,
  opts?: { chunkSize?: number },
) {
  const chunkSize = Math.max(1, Math.min(1000, opts?.chunkSize ?? 500))
  for (let i = 0; i < transacoes.length; i += chunkSize) {
    const chunk = transacoes.slice(i, i + chunkSize).map((t) => ({ ...t, user_id: userId }))
    const { error } = await supabase.from("transacoes").insert(chunk)
    if (error) throw error
  }
}

function extractMissingColumnFromSupabaseError(err: any): string | null {
  const msg = String(err?.message || "")
  // PostgREST schema cache: "Could not find the 'import_id' column of 'transacoes' in the schema cache"
  const m1 = msg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i)
  if (m1 && (m1[2] || "").toLowerCase() === "transacoes") return m1[1] || null
  // Postgres: column "import_id" of relation "transacoes" does not exist
  const m2 = msg.match(/column \"([^\"]+)\" of relation \"([^\"]+)\" does not exist/i)
  if (m2 && (m2[2] || "").toLowerCase() === "transacoes") return m2[1] || null
  return null
}

export async function addTransacoesBulkResilient(
  userId: string,
  transacoes: Array<Omit<Transacao, "id" | "user_id">>,
  opts?: { chunkSize?: number },
): Promise<{ droppedColumns: string[] }> {
  // Resiliência para deployments com schema desatualizado: tenta remover colunas opcionais ausentes.
  const droppable = new Set([
    "import_id",
    "cycle_id",
    "tx_fingerprint",
    "cartao_id",
    "fatura_id",
    "grupo_parcela",
    "parcela_atual",
    "total_parcelas",
    "confirmado",
    "metodo_pagamento",
  ])

  let payloads: Array<Record<string, any>> = transacoes as any
  const droppedColumns: string[] = []

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await addTransacoesBulk(userId, payloads as any, opts)
      return { droppedColumns }
    } catch (e: any) {
      const col = extractMissingColumnFromSupabaseError(e)
      if (!col || !droppable.has(col) || droppedColumns.includes(col)) throw e
      droppedColumns.push(col)
      payloads = payloads.map((t) => {
        const copy: Record<string, any> = { ...t }
        delete copy[col]
        return copy
      })
      continue
    }
  }

  await addTransacoesBulk(userId, payloads as any, opts)
  return { droppedColumns }
}

export type TransacoesBulkFailure = {
  idx: number
  message: string
  error: any
  payload: Record<string, any>
}

function formatSupabaseErrorShort(err: any): string {
  const msg = String(err?.message || err?.error_description || err?.error || "unknown")
  const details = String(err?.details || "")
  const hint = String(err?.hint || "")
  const code = String(err?.code || "")
  const parts = [msg, details, hint].filter(Boolean)
  const joined = parts.join(" | ").trim()
  return (code ? `[${code}] ` : "") + (joined || "unknown")
}

export async function addTransacoesBulkResilientWithReport(
  userId: string,
  items: Array<{ idx: number; payload: Record<string, any> }>,
  opts?: { chunkSize?: number },
): Promise<{ insertedIdxs: number[]; failed: TransacoesBulkFailure[]; droppedColumns: string[] }> {
  const droppable = new Set([
    "import_id",
    "cycle_id",
    "tx_fingerprint",
    "cartao_id",
    "fatura_id",
    "grupo_parcela",
    "parcela_atual",
    "total_parcelas",
    "confirmado",
    "metodo_pagamento",
  ])

  let droppedColumns: string[] = []
  let current = items.map((it) => ({ ...it, payload: { ...it.payload, user_id: userId } }))

  const insertedIdxs: number[] = []
  const failed: TransacoesBulkFailure[] = []

  async function tryInsertPayloads(payloads: Record<string, any>[]) {
    return await supabase.from("transacoes").insert(payloads)
  }

  function dropColumn(col: string) {
    if (!droppable.has(col) || droppedColumns.includes(col)) return false  // already in droppable check above
    droppedColumns = [...droppedColumns, col]
    current = current.map((it) => {
      const copy: Record<string, any> = { ...it.payload }
      delete copy[col]
      return { ...it, payload: copy }
    })
    return true
  }

  function payloadByIdx(idx: number) {
    return current.find((x) => x.idx === idx)?.payload ?? null
  }

  async function insertWithIsolation(slice: Array<{ idx: number; payload: Record<string, any> }>): Promise<void> {
    if (slice.length === 0) return
    const payloads = slice.map((s) => s.payload)
    const { error } = await tryInsertPayloads(payloads)
    if (!error) {
      for (const s of slice) insertedIdxs.push(s.idx)
      return
    }

    const missing = extractMissingColumnFromSupabaseError(error)
    if (missing && dropColumn(missing)) {
      // retry same slice with column removed
      const refreshed = slice
        .map((s) => ({ idx: s.idx, payload: payloadByIdx(s.idx) }))
        .filter((x): x is { idx: number; payload: Record<string, any> } => Boolean(x.payload))
      return await insertWithIsolation(refreshed)
    }

    if (slice.length === 1) {
      failed.push({ idx: slice[0]!.idx, message: formatSupabaseErrorShort(error), error, payload: slice[0]!.payload })
      return
    }

    const mid = Math.floor(slice.length / 2)
    await insertWithIsolation(slice.slice(0, mid))
    await insertWithIsolation(slice.slice(mid))
  }

  const chunkSize = Math.max(1, Math.min(1000, opts?.chunkSize ?? 500))
  for (let i = 0; i < current.length; i += chunkSize) {
    const chunk = current.slice(i, i + chunkSize)
    await insertWithIsolation(chunk)
  }

  return { insertedIdxs, failed, droppedColumns }
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

  const payload = { user_id: userId, nome, tipo, icone: '📦', cor: '#777777', is_padrao: false }

  const { data: nova, error } = await supabase
    .from('categorias')
    .upsert(payload, { onConflict: 'user_id,nome', ignoreDuplicates: false })
    .select('id')
    .single()

  if (!error && nova?.id) return nova.id

  // fallback para projetos onde o UNIQUE(user_id,nome) ainda não existe (onConflict falha)
  const msg = String((error as any)?.message || '')
  if (/no unique constraint/i.test(msg) || /matching the given keys for on conflict/i.test(msg)) {
    const { data: inserted, error: insErr } = await supabase.from('categorias').insert(payload).select('id').single()
    if (insErr || !inserted?.id) throw new Error('Erro ao criar categoria')
    return inserted.id
  }

  throw new Error('Erro ao criar categoria')
}

export async function getCategoriasForUser(userId: string, opts?: { tipo?: "despesa" | "receita" | "all" }): Promise<Categoria[]> {
  const tipo = opts?.tipo ?? "all"

  let q = supabase
    .from("categorias")
    .select("id,user_id,nome,icone,cor,tipo,is_padrao,emoji,descricao,ativo,ordem")
    .or(`user_id.eq.${userId},is_padrao.eq.true`)

  if (tipo !== "all") q = q.eq("tipo", tipo)

  const { data, error } = await q.order("is_padrao", { ascending: false }).order("nome", { ascending: true }).limit(300)
  if (error) return []
  return (data as any) || []
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
