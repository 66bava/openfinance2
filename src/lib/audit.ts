import { supabase } from './supabase'

export async function logAudit(
  userId: string,
  acao: string,
  detalhes?: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    acao,
    detalhes: detalhes ?? null,
  })
}
