import { supabase } from "../supabase"

type ResetResult = { deleted: Record<string, number | null> }

function formatTableCountKey(table: string) {
  return table.replace(/\W+/g, "_")
}

async function safeDeleteByUser(table: string, userId: string): Promise<number | null> {
  try {
    const { error, count } = await supabase.from(table as any).delete({ count: "exact" }).eq("user_id", userId)
    if (error) {
      const msg = String((error as any)?.message || "")
      // compat: schema desatualizado
      if (/does not exist/i.test(msg) || /schema cache/i.test(msg) || /could not find/i.test(msg) || /relation/i.test(msg)) return null
      throw error
    }
    return count ?? 0
  } catch (e: any) {
    const msg = String(e?.message || "")
    if (/does not exist/i.test(msg) || /schema cache/i.test(msg) || /could not find/i.test(msg) || /relation/i.test(msg)) return null
    throw e
  }
}

// Alguns schemas podem usar `id` em profiles e `user_id` nas tabelas financeiras.
// Esse reset é feito via client (respeita RLS): só apaga dados do próprio usuário.
export async function resetFinancialData(userId: string): Promise<ResetResult> {
  const tables = [
    "transacoes",
    "import_batches",
    "cycle_resets",
    "financial_cycles",
    "investimentos",
    "assinaturas",
    "compromissos",
    "metas",
    "faturas",
    "cartoes",
    "notifications",
    "user_categorization_rules",
    "user_category_preferences",
  ]

  const deleted: Record<string, number | null> = {}

  // Ordem importa: transacoes referencia import_batches/ciclos (ON DELETE CASCADE pode existir, mas não assumimos).
  for (const t of tables) {
    deleted[formatTableCountKey(t)] = await safeDeleteByUser(t, userId)
  }

  return { deleted }
}

