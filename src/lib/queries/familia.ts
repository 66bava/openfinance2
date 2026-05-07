import { supabase } from "../supabase"

export interface FamiliaGrupo {
  id: string
  admin_id: string
  nome: string
  created_at: string
}

export interface FamiliaMembro {
  id: string
  grupo_id: string
  user_id: string
  status: "pendente" | "aceito" | "rejeitado"
  created_at: string
}

export interface MembroComPerfil extends FamiliaMembro {
  nome: string
  email: string
  avatar_url: string | null
}

// ─── Grupo (admin) ───────────────────────────────────────────

export async function getMyGrupo(userId: string): Promise<FamiliaGrupo | null> {
  const { data } = await supabase
    .from("familia_grupos")
    .select("*")
    .eq("admin_id", userId)
    .maybeSingle()
  return data ?? null
}

export async function createGrupo(userId: string, nome: string): Promise<FamiliaGrupo> {
  const { data, error } = await supabase
    .from("familia_grupos")
    .insert({ admin_id: userId, nome })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGrupoNome(grupoId: string, nome: string) {
  const { error } = await supabase
    .from("familia_grupos")
    .update({ nome })
    .eq("id", grupoId)
  if (error) throw error
}

// ─── Membros ─────────────────────────────────────────────────

export async function getMembros(grupoId: string): Promise<MembroComPerfil[]> {
  const { data: membros } = await supabase
    .from("familia_membros")
    .select("*")
    .eq("grupo_id", grupoId)
    .neq("status", "rejeitado")
    .order("created_at", { ascending: true })

  if (!membros || membros.length === 0) return []

  const userIds = membros.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .in("id", userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  return membros.map((m) => ({
    ...m,
    nome: profileMap[m.user_id]?.nome ?? "Usuário",
    email: profileMap[m.user_id]?.email ?? "",
    avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
  }))
}

// ─── Membership do usuário (como membro, não admin) ──────────

export async function getMinhaMembresia(userId: string): Promise<(FamiliaMembro & { grupo: FamiliaGrupo | null }) | null> {
  const { data } = await supabase
    .from("familia_membros")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pendente", "aceito"])
    .maybeSingle()

  if (!data) return null

  const { data: grupo } = await supabase
    .from("familia_grupos")
    .select("*")
    .eq("id", data.grupo_id)
    .maybeSingle()

  return { ...data, grupo: grupo ?? null }
}

// ─── Admin do grupo (para membro ver quem convidou) ───────────

export async function getAdminPerfil(adminId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .eq("id", adminId)
    .maybeSingle()
  return data
}

// ─── Busca por email (para convidar) ─────────────────────────

export async function buscarPerfilPorEmail(email: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .ilike("email", email.trim())
    .maybeSingle()
  return data
}

// ─── Convite ──────────────────────────────────────────────────

export async function convidarMembro(grupoId: string, userId: string) {
  const { error } = await supabase
    .from("familia_membros")
    .insert({ grupo_id: grupoId, user_id: userId, status: "pendente" })
  if (error) throw error
}

export async function responderConvite(membroId: string, aceitar: boolean) {
  const { error } = await supabase
    .from("familia_membros")
    .update({ status: aceitar ? "aceito" : "rejeitado" })
    .eq("id", membroId)
  if (error) throw error
}

export async function removerMembro(membroId: string) {
  const { error } = await supabase
    .from("familia_membros")
    .delete()
    .eq("id", membroId)
  if (error) throw error
}

export async function sairDaFamilia(userId: string) {
  const { error } = await supabase
    .from("familia_membros")
    .delete()
    .eq("user_id", userId)
    .in("status", ["aceito", "pendente"])
  if (error) throw error
}
