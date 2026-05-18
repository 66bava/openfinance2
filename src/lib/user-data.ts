import { supabase } from "./supabase"

type UserDataExport = {
  exported_at: string
  profile: any | null
  transacoes: any[]
  categorias: any[]
  assinaturas: any[]
  compromissos: any[]
  investimentos: any[]
  cartoes: any[]
  faturas: any[]
  relatorios: any[]
  relatorios_ia: any[]
  audit_logs: any[]
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function safeSelectAll(table: string, userId: string, select = "*") {
  const { data } = await supabase.from(table).select(select).eq("user_id", userId)
  return data ?? []
}

export async function exportUserDataToJson(userId: string, opts?: { includeAuditLogs?: boolean }) {
  const [profileRes, transacoes, categorias, assinaturas, compromissos, investimentos, cartoes, faturas, relatorios, relatoriosIa, auditLogs] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      safeSelectAll("transacoes", userId, "*,categorias(*)"),
      // categorias incluem padrão (is_padrao=true) via RLS, então filtramos explicitamente apenas do usuário
      safeSelectAll("categorias", userId),
      safeSelectAll("assinaturas", userId),
      safeSelectAll("compromissos", userId, "*,categorias(*)"),
      safeSelectAll("investimentos", userId),
      safeSelectAll("cartoes", userId),
      safeSelectAll("faturas", userId),
      safeSelectAll("relatorios", userId),
      safeSelectAll("relatorios_ia", userId),
      opts?.includeAuditLogs ? safeSelectAll("audit_logs", userId) : Promise.resolve([] as any[]),
    ])

  const payload: UserDataExport = {
    exported_at: new Date().toISOString(),
    profile: (profileRes as any)?.data ?? null,
    transacoes,
    categorias,
    assinaturas,
    compromissos,
    investimentos,
    cartoes,
    faturas,
    relatorios,
    relatorios_ia: relatoriosIa,
    audit_logs: auditLogs,
  }

  const date = new Date()
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  downloadJson(`openfy-dados-${stamp}.json`, payload)
  return payload
}

export async function requestUserDataOperation(userId: string, kind: "export" | "delete") {
  // Estrutura LGPD: registramos o pedido no banco (RLS garante isolamento).
  const { data, error } = await supabase
    .from("user_data_requests")
    .insert({ user_id: userId, kind, status: "requested" })
    .select("id,kind,status,requested_at")
    .single()
  if (error) throw error
  return data
}

