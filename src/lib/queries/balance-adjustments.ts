import { supabase } from "../supabase"
import { getOrCreateCategoria } from "../queries"
import { refreshActiveCycleTotals } from "./cycles"
import type { Transacao } from "../types"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function createBalanceAdjustment(
  userId: string,
  input: {
    currentBalance: number
    targetBalance: number
    reason?: string | null
    cycleId?: string | null
  },
): Promise<{ created: boolean; delta: number; transacao?: Transacao | null }> {
  const current = Number(input.currentBalance) || 0
  const target = Number(input.targetBalance) || 0
  const delta = target - current

  if (!Number.isFinite(delta) || Math.abs(delta) < 0.005) {
    return { created: false, delta: 0, transacao: null }
  }

  const tipo = delta >= 0 ? ("receita" as const) : ("despesa" as const)
  const valor = Math.round(Math.abs(delta) * 100) / 100
  const data = todayISO()

  const baseDesc = "Ajuste de saldo"
  const motivo = (input.reason || "").trim()
  const descricao = motivo ? `${baseDesc} — ${motivo}` : baseDesc

  const categoriaId = await getOrCreateCategoria(userId, baseDesc, tipo)

  const payload: any = {
    user_id: userId,
    categoria_id: categoriaId,
    descricao,
    valor,
    tipo,
    data,
    metodo_pagamento: null,
    confirmado: true,
    import_id: null,
    cycle_id: input.cycleId ?? null,
    tx_fingerprint: null,
  }

  const { data: inserted, error } = await supabase.from("transacoes").insert(payload).select("*, categorias(*)").single()
  if (error) throw error

  // Mantém carried_balance/income_total/expense_total coerentes
  try {
    await refreshActiveCycleTotals(userId)
  } catch {
    // best-effort
  }

  return { created: true, delta, transacao: (inserted as any) || null }
}

