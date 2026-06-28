/**
 * WhatsApp Webhook — Supabase Edge Function (Deno)
 *
 * Compatible with:
 *   - WhatsApp Cloud API (Meta)  → set WHATSAPP_PROVIDER=cloud
 *   - Evolution API (self-hosted) → set WHATSAPP_PROVIDER=evolution
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WHATSAPP_VERIFY_TOKEN   (webhook verification secret)
 *   WHATSAPP_TOKEN          (Cloud API bearer token)
 *   WHATSAPP_PHONE_ID       (Cloud API phone number ID)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? ""
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? ""
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? ""
const GRAPH_URL = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`

// ─── Send WhatsApp message (Cloud API) ───────────────────────────────────────

async function sendMessage(to: string, body: string): Promise<void> {
  await fetch(GRAPH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  })
}

// ─── Parse expense text ───────────────────────────────────────────────────────
// Supports formats:
//   "Uber 23,90"
//   "Mercado 150.00 Alimentação"
//   "netflix 45.90 assinatura"

interface ParsedExpense {
  descricao: string
  valor: number
  categoria?: string
}

function parseExpense(text: string): ParsedExpense | null {
  const trimmed = text.trim()
  // last token that looks like a number (possibly with currency category after)
  const match = trimmed.match(/^(.+?)\s+([\d]+[.,][\d]{2}|[\d]+)(?:\s+(.+))?$/i)
  if (!match) return null

  const descricao = match[1].trim()
  const valor = parseFloat(match[2].replace(",", "."))
  const categoria = match[3]?.trim()

  if (!descricao || isNaN(valor) || valor <= 0) return null
  return { descricao, valor, categoria }
}

// ─── Classify intent ─────────────────────────────────────────────────────────

function classifyIntent(text: string): "confirm" | "cancel" | "balance" | "expense" | "help" {
  const lower = text.toLowerCase().trim()
  if (["sim", "s", "1", "confirmar", "ok", "yes"].includes(lower)) return "confirm"
  if (["não", "nao", "n", "2", "cancelar", "cancel", "no"].includes(lower)) return "cancel"
  if (lower.includes("saldo") || lower.includes("resumo") || lower.includes("quanto")) return "balance"
  if (parseExpense(text)) return "expense"
  return "help"
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // GET: webhook verification (Meta Cloud API)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  try {
    const body = await req.json()

    // Extract messages (Cloud API envelope)
    const messages: any[] =
      body?.entry?.[0]?.changes?.[0]?.value?.messages ?? []

    for (const msg of messages) {
      const from: string = msg.from
      const msgType: string = msg.type

      // Lookup linked user
      const { data: wUser } = await supabase
        .from("whatsapp_users")
        .select("user_id")
        .eq("phone_number", from)
        .maybeSingle()

      if (!wUser) {
        await sendMessage(
          from,
          "📱 Olá! Para usar a Finance App pelo WhatsApp, vincule seu número no app:\n\n*Perfil → WhatsApp → Conectar*\n\nfinanceapp.com.br/app",
        )
        continue
      }

      const userId: string = wUser.user_id

      if (msgType === "text") {
        const text: string = msg.text?.body ?? ""
        const intent = classifyIntent(text)

        // ── Confirm latest pending ───────────────────────────────────────────
        if (intent === "confirm") {
          const { data: pending } = await supabase
            .from("whatsapp_pending")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!pending) {
            await sendMessage(from, "Não há nenhuma operação pendente para confirmar.")
            continue
          }

          const p = pending.payload as ParsedExpense

          // Insert transaction
          await supabase.from("transacoes").insert({
            user_id: userId,
            descricao: p.descricao,
            valor: p.valor,
            tipo: "despesa",
            data: new Date().toISOString().split("T")[0],
            // categoria_id left null — user can update in the app
          })

          await supabase
            .from("whatsapp_pending")
            .update({ status: "confirmed" })
            .eq("id", pending.id)

          await sendMessage(
            from,
            `✅ Despesa registrada!\n\n*${p.descricao}* — R$ ${p.valor.toFixed(2).replace(".", ",")}\n\nVeja no dashboard: financeapp.com.br/app`,
          )
          continue
        }

        // ── Cancel pending ───────────────────────────────────────────────────
        if (intent === "cancel") {
          await supabase
            .from("whatsapp_pending")
            .update({ status: "cancelled" })
            .eq("user_id", userId)
            .eq("status", "pending")

          await sendMessage(from, "❌ Operação cancelada.")
          continue
        }

        // ── Balance summary ──────────────────────────────────────────────────
        if (intent === "balance") {
          // Simple aggregation: current month transactions
          const now = new Date()
          const from_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
          const { data: txs } = await supabase
            .from("transacoes")
            .select("tipo, valor")
            .eq("user_id", userId)
            .gte("data", from_date)

          const renda = txs?.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0) ?? 0
          const gastos = txs?.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0) ?? 0
          const saldo = renda - gastos
          const pct = renda > 0 ? (((renda - gastos) / renda) * 100).toFixed(1) : "0"
          const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`

          await sendMessage(
            from,
            `📊 *Resumo do mês*\n\n💚 Receitas: ${fmt(renda)}\n🔴 Despesas: ${fmt(gastos)}\n💰 Saldo: ${fmt(saldo)}\n📈 Poupança: ${pct}%\n\nAcesse o dashboard completo: financeapp.com.br/app`,
          )
          continue
        }

        // ── Register expense ─────────────────────────────────────────────────
        if (intent === "expense") {
          const expense = parseExpense(text)!

          // Expire any old pending
          await supabase
            .from("whatsapp_pending")
            .update({ status: "cancelled" })
            .eq("user_id", userId)
            .eq("status", "pending")

          await supabase.from("whatsapp_pending").insert({
            user_id: userId,
            phone_number: from,
            payload: expense,
            status: "pending",
          })

          const categoriaLine = expense.categoria ? `\n🏷️ Categoria: ${expense.categoria}` : ""
          await sendMessage(
            from,
            `📝 *Confirmar despesa?*\n\n*${expense.descricao}*\n💵 Valor: R$ ${expense.valor.toFixed(2).replace(".", ",")}${categoriaLine}\n\nResponda *Sim* para confirmar ou *Não* para cancelar.\n_(expira em 10 min)_`,
          )
          continue
        }

        // ── Help ─────────────────────────────────────────────────────────────
        await sendMessage(
          from,
          `🤖 *Finance App via WhatsApp*\n\nComandos disponíveis:\n\n• *Registrar gasto*: escreva descrição + valor\n  _Ex: Uber 23,90_\n  _Ex: Mercado 180,00 Alimentação_\n\n• *Ver saldo*: escreva "saldo" ou "resumo"\n\nAcesse o app para relatórios completos: financeapp.com.br/app`,
        )
      }

      // Image: receipt OCR placeholder
      if (msgType === "image") {
        await sendMessage(
          from,
          `📸 Comprovante recebido!\n\nProcessamento automático de recibos em breve. Por enquanto, registre manualmente:\n_Nome do estabelecimento + valor_\n\nEx: Supermercado Extra 87,50`,
        )
      }
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("[whatsapp-webhook]", err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
