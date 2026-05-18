import { supabase } from "../lib/supabase"

export type ChatRole = "system" | "user" | "assistant"
export type ChatMessage = { role: ChatRole; content: string }

export type AiRequestInput =
  | {
      prompt: string
      task?: string
      context?: unknown
      maxTokens?: number
      temperature?: number
      messages?: ChatMessage[]
    }
  | string

export async function aiRequest(input: AiRequestInput, maxTokensFallback = 400): Promise<string> {
  const req =
    typeof input === "string"
      ? { prompt: input, maxTokens: maxTokensFallback }
      : {
          prompt: input.prompt,
          task: input.task,
          context: input.context,
          maxTokens: input.maxTokens ?? maxTokensFallback,
          temperature: input.temperature,
          messages: input.messages,
        }

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error("Faça login para usar a IA.")

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(req),
  })

  const payload = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    const base = payload?.error?.message ?? `Erro ${res.status} na API`
    const detail = payload?.error?.detail ? ` (${payload.error.detail})` : ""
    throw new Error(`${base}${detail}`)
  }

  const content = payload?.content
  return typeof content === "string" && content.trim() ? content : "Não foi possível gerar a análise."
}
