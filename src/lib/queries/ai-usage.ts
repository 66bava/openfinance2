import { supabase } from "../supabase"

export type AiUsageStatus = {
  success: boolean
  message?: string
  usado: number
  limite: number
  reset_at?: string | null
}

export async function consultarConselheiroIa(userId: string): Promise<AiUsageStatus> {
  const { data, error } = await supabase.rpc("consultar_conselheiro_ia", { p_user_id: userId })
  if (error) throw new Error(error.message)
  return data as AiUsageStatus
}

export async function incrementarConselheiroIa(userId: string): Promise<AiUsageStatus> {
  const { data, error } = await supabase.rpc("incrementar_conselheiro_ia", { p_user_id: userId })
  if (error) throw new Error(error.message)
  return data as AiUsageStatus
}

