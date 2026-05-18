import { supabase } from "../supabase"

export type ImportBatchRow = {
  id: string
  user_id: string
  cycle_id?: string | null
  source: "csv" | "ofx" | "xlsx"
  filename: string
  filesize_bytes: number | null
  status: "processing" | "completed" | "failed"
  transactions_count: number
  valid_transactions_count?: number
  failed_transactions_count?: number
  total_income: number | null
  total_expenses: number | null
  statement_balance: number | null
  score_before: number | null
  score_after: number | null
  recurring_count: number | null
  subscriptions_count: number | null
  payment_methods: Record<string, number> | null
  categories_top: Array<{ name: string; value: number }> | null
  error_message: string | null
  error_details: Record<string, unknown> | null
  bank_detected?: string | null
  period_start?: string | null
  period_end?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  completed_at: string | null
  imported_at?: string | null
}

export async function getImportBatches(userId: string): Promise<ImportBatchRow[]> {
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25)
  if (error) return []
  const rows = ((data as any) || []) as any[]
  return rows.map((r) => ({
    ...r,
    filesize_bytes: r.filesize_bytes == null ? null : Number(r.filesize_bytes),
    transactions_count: Number(r.transactions_count ?? 0),
    valid_transactions_count: r.valid_transactions_count == null ? undefined : Number(r.valid_transactions_count),
    failed_transactions_count: r.failed_transactions_count == null ? undefined : Number(r.failed_transactions_count),
    total_income: r.total_income == null ? null : Number(r.total_income),
    total_expenses: r.total_expenses == null ? null : Number(r.total_expenses),
    statement_balance: r.statement_balance == null ? null : Number(r.statement_balance),
    score_before: r.score_before == null ? null : Number(r.score_before),
    score_after: r.score_after == null ? null : Number(r.score_after),
    recurring_count: r.recurring_count == null ? null : Number(r.recurring_count),
    subscriptions_count: r.subscriptions_count == null ? null : Number(r.subscriptions_count),
  })) as ImportBatchRow[]
}

export async function createImportBatch(
  userId: string,
  input: Omit<ImportBatchRow, "id" | "user_id" | "created_at" | "completed_at" | "status" | "error_message" | "error_details">,
): Promise<ImportBatchRow> {
  const basePayload: any = {
    ...input,
    user_id: userId,
    status: "processing",
    completed_at: null,
    error_message: null,
    error_details: null,
  }

  const tryInsert = async (payload: Record<string, any>) => {
    return await supabase.from("import_batches").insert(payload).select("*").single()
  }

  const extractMissingColumn = (err: any): string | null => {
    const msg = String(err?.message || "")
    const m1 = msg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i)
    if (m1 && (m1[2] || "").toLowerCase() === "import_batches") return m1[1] || null
    const m2 = msg.match(/column \"([^\"]+)\" of relation \"([^\"]+)\" does not exist/i)
    if (m2 && (m2[2] || "").toLowerCase() === "import_batches") return m2[1] || null
    return null
  }

  // Resiliência: schema pode estar sem cycle_id/metadata/etc em deployments desatualizados
  const droppable = new Set(["cycle_id"])

  let payload = { ...basePayload }
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await tryInsert(payload)
    if (!error) return data as any
    const missing = extractMissingColumn(error)
    if (!missing || !droppable.has(missing)) throw error
    const copy: any = { ...payload }
    delete copy[missing]
    payload = copy
  }

  const { data, error } = await tryInsert(payload)
  if (error) throw error
  return data as any
}

export async function completeImportBatch(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("import_batches")
    .update({ status: "completed", completed_at: new Date().toISOString(), imported_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
  if (error) throw error
}

export async function updateImportBatch(userId: string, id: string, patch: Partial<ImportBatchRow>): Promise<void> {
  const { error } = await supabase.from("import_batches").update(patch).eq("id", id).eq("user_id", userId)
  if (error) throw error
}

export async function failImportBatch(
  userId: string,
  id: string,
  input?: { message?: string | null; details?: Record<string, unknown> | null } | null,
): Promise<void> {
  const { error } = await supabase
    .from("import_batches")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      imported_at: new Date().toISOString(),
      error_message: input?.message ?? null,
      error_details: input?.details ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
  if (error) throw error
}

export async function deleteImportBatch(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("import_batches").delete().eq("id", id).eq("user_id", userId)
  if (error) throw error
}

// ─── Deduplicação cross-batch ─────────────────────────────────────────────

function normalizeDescForFingerprint(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function candidateFingerprint(c: { date: string; description: string; amount: number; type: string }): string {
  return `${c.date}|${normalizeDescForFingerprint(c.description)}|${c.type}|${Math.round(c.amount * 100)}`
}

export async function checkImportDuplicates(
  userId: string,
  candidates: Array<{ date: string; description: string; amount: number; type: string }>,
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set()

  const dates = candidates.map((c) => c.date).sort()
  const earliest = dates[0]!
  const latest = dates[dates.length - 1]!

  const { data, error } = await supabase
    .from("transacoes")
    .select("descricao,valor,tipo,data")
    .eq("user_id", userId)
    .gte("data", earliest)
    .lte("data", latest)

  if (error || !data) return new Set()

  const existing = new Set<string>()
  for (const row of data as any[]) {
    const fp = candidateFingerprint({
      date: String(row.data ?? ""),
      description: String(row.descricao ?? ""),
      amount: Math.abs(Number(row.valor) || 0),
      type: String(row.tipo ?? ""),
    })
    existing.add(fp)
  }
  return existing
}
