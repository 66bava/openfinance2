import type { ImportedTransaction, ImportedTransactionType } from "../../types"

function clampToISODate(date: string) {
  // Aceita YYYY-MM-DD ou ISO; normaliza para YYYY-MM-DD.
  const d = new Date(date)
  if (!Number.isFinite(d.getTime())) {
    // fallback: tenta cortar se vier com hora
    return (date || "").slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

function inferType(amount: number): ImportedTransactionType {
  return amount >= 0 ? "receita" : "despesa"
}

export function normalizeImportedTransaction(input: {
  id: string
  userId: string
  connectionId: string
  description: string
  amount: number
  date: string
  currency?: string | null
  type?: ImportedTransactionType | "credit" | "debit" | "in" | "out" | null
  raw?: Record<string, unknown> | null
}): ImportedTransaction {
  const amount = Number(input.amount) || 0

  const normalizedType: ImportedTransactionType =
    input.type === "receita" || input.type === "despesa"
      ? input.type
      : input.type === "credit" || input.type === "in"
        ? "receita"
        : input.type === "debit" || input.type === "out"
          ? "despesa"
          : inferType(amount)

  const normalizedAmount = Math.abs(amount)
  // Mantemos `amount` sempre positivo (valor absoluto); o tipo define sinal/semântica.

  return {
    id: input.id,
    userId: input.userId,
    connectionId: input.connectionId,
    description: (input.description || "").trim() || "Transação importada",
    amount: normalizedAmount,
    type: normalizedType,
    date: clampToISODate(input.date),
    currency: "BRL",
    raw: input.raw ?? null,
  }
}
