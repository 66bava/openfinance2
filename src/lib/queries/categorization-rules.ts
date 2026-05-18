import { supabase } from "../supabase"

export type UserCategorizationRule = {
  id: string
  user_id: string
  key: string
  tipo: "receita" | "despesa" | null
  categoria_nome: string
  category_id?: string | null
  confidence: number
  source?: "user_correction" | "import_confirmation" | "manual_rule"
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export async function getUserCategorizationRules(userId: string): Promise<UserCategorizationRule[]> {
  const { data, error } = await supabase
    .from("user_categorization_rules")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200)
  if (error) return []
  return (data as any[]) as UserCategorizationRule[]
}

export async function upsertUserCategorizationRule(input: {
  userId: string
  key: string
  tipo: "receita" | "despesa" | null
  categoriaNome: string
  confidence?: number
  source?: "user_correction" | "import_confirmation" | "manual_rule"
  categoryId?: string | null
}) {
  const payload: any = {
    user_id: input.userId,
    key: input.key,
    tipo: input.tipo,
    categoria_nome: input.categoriaNome,
    source: input.source ?? "user_correction",
    category_id: input.categoryId ?? null,
    last_used_at: new Date().toISOString(),
  }
  if (typeof input.confidence === "number") payload.confidence = input.confidence

  const { data, error } = await supabase
    .from("user_categorization_rules")
    .upsert(payload, { onConflict: "user_id,key,tipo", ignoreDuplicates: false })
    .select("*")
    .single()
  if (error) throw error

  // incrementa contagem de uso (best-effort; depende da migration de RPC)
  supabase
    .rpc("increment_categorization_rule_use_count", {
      p_user_id: input.userId,
      p_key: input.key,
      p_tipo: input.tipo,
    })
    .maybeSingle()
    .catch(() => {})

  return data as UserCategorizationRule
}
