import { supabase } from "../supabase"

export type NotificationRow = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
  read_at: string | null
}

export async function getNotifications(userId: string, opts?: { limit?: number }): Promise<NotificationRow[]> {
  const limit = Math.max(1, Math.min(100, opts?.limit ?? 30))
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return ((data as any) || []) as NotificationRow[]
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
  if (error) return 0
  return count ?? 0
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
  if (error) throw error
}

export async function createNotification(
  userId: string,
  input: Pick<NotificationRow, "type" | "title" | "message"> & { metadata?: Record<string, unknown> | null },
): Promise<void> {
  const payload = {
    user_id: userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata ?? null,
  }
  const { error } = await supabase.from("notifications").insert(payload)
  if (error) throw error
}

