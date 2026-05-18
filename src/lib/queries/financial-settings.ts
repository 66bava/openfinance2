import { supabase } from "../supabase"

export type UserFinancialSettings = {
  user_id: string
  payday_day: number
  reset_day: number
  recurring_post_day: number
  cycle_start_day: number
  timezone: string
  created_at?: string
  updated_at?: string
}

export function defaultFinancialSettings(userId: string): UserFinancialSettings {
  return {
    user_id: userId,
    payday_day: 5,
    reset_day: 1,
    recurring_post_day: 1,
    cycle_start_day: 1,
    timezone: "America/Sao_Paulo",
  }
}

export async function getUserFinancialSettings(userId: string): Promise<UserFinancialSettings> {
  const { data, error } = await supabase
    .from("user_financial_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return defaultFinancialSettings(userId)
  if (!data) return defaultFinancialSettings(userId)
  return {
    ...defaultFinancialSettings(userId),
    ...data,
  } as UserFinancialSettings
}

export async function upsertUserFinancialSettings(
  userId: string,
  settings: Omit<UserFinancialSettings, "user_id" | "created_at" | "updated_at">,
): Promise<UserFinancialSettings> {
  const payload = { user_id: userId, ...settings }
  const { data, error } = await supabase
    .from("user_financial_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single()

  if (error) throw error
  return data as UserFinancialSettings
}

