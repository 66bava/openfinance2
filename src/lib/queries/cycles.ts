import { supabase } from "../supabase"
import type { FinancialCycle, CycleReset, ImportBatch } from "../types"
import { createNotification } from "./notifications"

// ── Ciclo ativo ───────────────────────────────────────────────────────────────

export async function getActiveCycle(userId: string): Promise<FinancialCycle | null> {
  const { data, error } = await supabase
    .from("financial_cycles")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  if (error) return null
  return (data as FinancialCycle) ?? null
}

// ── Histórico de ciclos ───────────────────────────────────────────────────────

export async function getCycleHistory(userId: string, limit = 12): Promise<FinancialCycle[]> {
  const { data, error } = await supabase
    .from("financial_cycles")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as FinancialCycle[]
}

// ── Garantir ciclo ativo ──────────────────────────────────────────────────────

export async function ensureActiveCycle(
  userId: string,
  startDate: string,
  endDate: string,
  openingBalanceOverride?: number,
): Promise<FinancialCycle> {
  const existing = await getActiveCycle(userId)
  if (existing) return existing

  let openingBalance = openingBalanceOverride ?? 0
  if (openingBalanceOverride == null) {
    const { data: lastClosed } = await supabase
      .from("financial_cycles")
      .select("closing_balance, carried_balance")
      .eq("user_id", userId)
      .eq("status", "closed")
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastClosed) {
      openingBalance = Number((lastClosed as any).closing_balance ?? (lastClosed as any).carried_balance ?? 0)
    }
  }

  const { data, error } = await supabase
    .from("financial_cycles")
    .insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: "active",
      opening_balance: openingBalance,
      carried_balance: openingBalance,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as FinancialCycle
}

// ── Fechar ciclo ──────────────────────────────────────────────────────────────

export interface CloseCycleOpts {
  incomeTotal: number
  expenseTotal: number
  investmentTotal: number
  scoreSnapshot: number
  closingBalanceOverride?: number
}

export interface CloseCycleResult {
  closedCycle: FinancialCycle
  newCycle: FinancialCycle
}

export async function closeCycle(
  userId: string,
  cycleId: string,
  nextStartDate: string,
  nextEndDate: string,
  opts: CloseCycleOpts,
): Promise<CloseCycleResult> {
  const cycle = await getActiveCycle(userId)
  if (!cycle || cycle.id !== cycleId) throw new Error("Ciclo ativo não encontrado")

  const closingBalance =
    opts.closingBalanceOverride ??
    cycle.opening_balance + opts.incomeTotal - opts.expenseTotal

  const { data: closed, error: closeErr } = await supabase
    .from("financial_cycles")
    .update({
      status: "closed",
      closing_balance: closingBalance,
      carried_balance: closingBalance,
      income_total: opts.incomeTotal,
      expense_total: opts.expenseTotal,
      investment_total: opts.investmentTotal,
      score_snapshot: opts.scoreSnapshot,
      closed_at: new Date().toISOString(),
    })
    .eq("id", cycleId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (closeErr) throw closeErr

  const { data: newCycle, error: createErr } = await supabase
    .from("financial_cycles")
    .insert({
      user_id: userId,
      start_date: nextStartDate,
      end_date: nextEndDate,
      status: "active",
      opening_balance: closingBalance,
      carried_balance: closingBalance,
    })
    .select("*")
    .single()

  if (createErr) throw createErr

  return {
    closedCycle: closed as FinancialCycle,
    newCycle: newCycle as FinancialCycle,
  }
}

// ── Resetar ciclo ─────────────────────────────────────────────────────────────

export type ResetType = "imports_only" | "all_transactions" | "imports_keep_manual"

export interface ResetCycleResult {
  cycleReset: CycleReset | null
  affectedTransactions: number
  affectedImports: number
}

export async function resetCycle(
  userId: string,
  cycleId: string,
  resetType: ResetType,
): Promise<ResetCycleResult> {
  const cycle = await getActiveCycle(userId)
  if (!cycle || cycle.id !== cycleId) throw new Error("Ciclo ativo não encontrado")

  const previousSnapshot = {
    income_total: cycle.income_total,
    expense_total: cycle.expense_total,
    opening_balance: cycle.opening_balance,
    status: cycle.status,
    reset_at: new Date().toISOString(),
  }

  let affectedTransactions = 0
  let affectedImports = 0

  if (resetType === "all_transactions") {
    // Delete all transactions in the cycle date range
    const { count } = await supabase
      .from("transacoes")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .gte("data", cycle.start_date)
      .lte("data", cycle.end_date)

    affectedTransactions = count ?? 0

    // Marca imports do ciclo como removidos (soft), quando possível
    try {
      const { data: rows, error } = await supabase
        .from("import_batches")
        .select("id")
        .eq("user_id", userId)
        .eq("cycle_id", cycleId)
      if (!error) {
        const ids = (rows ?? []).map((r: any) => String(r.id)).filter(Boolean)
        affectedImports = ids.length
        if (ids.length > 0) {
          await supabase
            .from("import_batches")
            .update({ status: "failed", error_message: "reset_by_user" })
            .eq("user_id", userId)
            .in("id", ids)
        }
      }
    } catch {
      // cycle_id column not yet in schema – ignore
    }

  } else {
    // imports_only / imports_keep_manual – remove only imported transactions (mantém manuais)
    let importIds: string[] = []

    try {
      const { data: imports } = await supabase
        .from("import_batches")
        .select("id")
        .eq("user_id", userId)
        .eq("cycle_id", cycleId)
      importIds = (imports ?? []).map((i: any) => i.id as string)
    } catch {
      // cycle_id column not in schema yet
    }

    if (importIds.length > 0) {
      const { count } = await supabase
        .from("transacoes")
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .in("import_id", importIds)

      affectedTransactions = count ?? 0
      affectedImports = importIds.length

      // imports_only: marca o batch como removido; imports_keep_manual: não mexe no histórico
      if (resetType === "imports_only") {
        await supabase
          .from("import_batches")
          .update({ status: "failed", error_message: "reset_by_user" })
          .eq("user_id", userId)
          .in("id", importIds)
      }
    } else {
      // Fallback: sem importIds (schema antigo ou batches sem cycle_id): remove importadas por date range
      const { count } = await supabase
        .from("transacoes")
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .gte("data", cycle.start_date)
        .lte("data", cycle.end_date)
        .not("import_id", "is", null)

      affectedTransactions = count ?? 0
    }
  }

  // Recalculate cycle totals from remaining transactions
  const { data: remaining } = await supabase
    .from("transacoes")
    .select("valor, tipo")
    .eq("user_id", userId)
    .gte("data", cycle.start_date)
    .lte("data", cycle.end_date)

  let incomeTotal = 0
  let expenseTotal = 0
  for (const t of remaining ?? []) {
    if ((t as any).tipo === "receita") incomeTotal += Number((t as any).valor)
    else expenseTotal += Number((t as any).valor)
  }

  const newSnapshot = {
    income_total: incomeTotal,
    expense_total: expenseTotal,
    opening_balance: cycle.opening_balance,
    reset_type: resetType,
    affected_transactions: affectedTransactions,
  }

  await supabase
    .from("financial_cycles")
    .update({
      income_total: incomeTotal,
      expense_total: expenseTotal,
      carried_balance: cycle.opening_balance + incomeTotal - expenseTotal,
      reset_at: new Date().toISOString(),
    })
    .eq("id", cycleId)
    .eq("user_id", userId)

  // Record audit – table may not exist if migration not applied yet
  let resetRecord: CycleReset | null = null
  try {
    const { data, error: resetErr } = await supabase
      .from("cycle_resets")
      .insert({
        user_id: userId,
        cycle_id: cycleId,
        reset_type: resetType,
        affected_transactions_count: affectedTransactions,
        affected_imports_count: affectedImports,
        previous_snapshot: previousSnapshot,
        new_snapshot: newSnapshot,
      })
      .select("*")
      .single()

    if (!resetErr) resetRecord = data as CycleReset
  } catch {
    // cycle_resets table may not exist yet
  }

  // Notificação (best-effort)
  createNotification(userId, {
    type: "cycle_reset",
    title: "Ciclo resetado",
    message:
      resetType === "all_transactions"
        ? `Você removeu todas as transações do ciclo atual (${affectedTransactions}).`
        : `Você removeu transações importadas do ciclo atual (${affectedTransactions}).`,
    metadata: {
      cycle_id: cycleId,
      reset_type: resetType,
      affected_transactions: affectedTransactions,
      affected_imports: affectedImports,
    },
  }).catch(() => {})

  return {
    cycleReset: resetRecord,
    affectedTransactions,
    affectedImports,
  }
}

// ── Apagar ciclo (fechado/resetado) ───────────────────────────────────────────

export async function deleteCycle(
  userId: string,
  cycleId: string,
): Promise<{ deletedTransactions: number }> {
  const { data: cycle, error } = await supabase
    .from("financial_cycles")
    .select("id, status, start_date, end_date")
    .eq("id", cycleId)
    .eq("user_id", userId)
    .single()

  if (error || !cycle) throw new Error("Ciclo não encontrado")
  if ((cycle as any).status === "active") {
    throw new Error("Não é possível apagar o ciclo ativo. Feche-o primeiro ou resete-o.")
  }

  const { start_date, end_date } = cycle as { start_date: string; end_date: string }

  // Delete all transactions in the date range
  const { count: txCount } = await supabase
    .from("transacoes")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .gte("data", start_date)
    .lte("data", end_date)

  // Delete import batches linked to this cycle
  try {
    await supabase
      .from("import_batches")
      .delete()
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
  } catch {}

  // Delete reset audit records
  try {
    await supabase
      .from("cycle_resets")
      .delete()
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
  } catch {}

  // Delete the cycle record itself
  const { error: delErr } = await supabase
    .from("financial_cycles")
    .delete()
    .eq("id", cycleId)
    .eq("user_id", userId)

  if (delErr) throw delErr

  return { deletedTransactions: txCount ?? 0 }
}

// ── Atualizar totais do ciclo ativo ───────────────────────────────────────────

export async function refreshActiveCycleTotals(userId: string): Promise<void> {
  const cycle = await getActiveCycle(userId)
  if (!cycle) return

  const { data } = await supabase
    .from("transacoes")
    .select("valor, tipo")
    .eq("user_id", userId)
    .gte("data", cycle.start_date)
    .lte("data", cycle.end_date)

  let incomeTotal = 0
  let expenseTotal = 0
  for (const t of data ?? []) {
    if ((t as any).tipo === "receita") incomeTotal += Number((t as any).valor)
    else expenseTotal += Number((t as any).valor)
  }

  await supabase
    .from("financial_cycles")
    .update({
      income_total: incomeTotal,
      expense_total: expenseTotal,
      carried_balance: cycle.opening_balance + incomeTotal - expenseTotal,
    })
    .eq("id", cycle.id)
    .eq("user_id", userId)
}

// ── Importações do ciclo ──────────────────────────────────────────────────────

export async function getCycleImports(userId: string, cycleId: string): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: false })

  if (error) return []
  return (data ?? []) as ImportBatch[]
}

// ── Regras de categorização (aprendizado) ────────────────────────────────────

export interface CategorizationRuleUpsert {
  key: string
  tipo: "receita" | "despesa" | null
  categoria_nome: string
  category_id?: string | null
  confidence?: number
  source?: "user_correction" | "import_confirmation" | "manual_rule"
}

export async function upsertCategorizationRule(
  userId: string,
  rule: CategorizationRuleUpsert,
): Promise<void> {
  const payload = {
    user_id: userId,
    key: rule.key,
    tipo: rule.tipo,
    categoria_nome: rule.categoria_nome,
    category_id: rule.category_id ?? null,
    confidence: rule.confidence ?? 0.92,
    source: rule.source ?? "user_correction",
    last_used_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("user_categorization_rules")
    .upsert(payload, { onConflict: "user_id,key,tipo" })

  if (!error) {
    await supabase.rpc("increment_categorization_rule_use_count", {
      p_user_id: userId,
      p_key: rule.key,
      p_tipo: rule.tipo,
    }).maybeSingle()
  }
}

export async function getUserCategorizationRules(userId: string) {
  const { data } = await supabase
    .from("user_categorization_rules")
    .select("key, tipo, categoria_nome, confidence")
    .eq("user_id", userId)
    .order("confidence", { ascending: false })
    .limit(500)

  return (data ?? []) as Array<{
    key: string
    tipo: string | null
    categoria_nome: string
    confidence: number
  }>
}

// ── Dedup: checar fingerprints existentes ─────────────────────────────────────

export async function getExistingFingerprints(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("transacoes")
    .select("tx_fingerprint")
    .eq("user_id", userId)
    .gte("data", startDate)
    .lte("data", endDate)
    .not("tx_fingerprint", "is", null)

  const set = new Set<string>()
  for (const row of data ?? []) {
    const fp = (row as any).tx_fingerprint
    if (fp) set.add(String(fp))
  }
  return set
}
