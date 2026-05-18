export type ImportedTransactionType = "receita" | "despesa"

export type ImportedTransaction = {
  id: string
  userId: string
  connectionId: string
  description: string
  amount: number
  type: ImportedTransactionType
  date: string // YYYY-MM-DD
  currency: "BRL"
  raw?: Record<string, unknown> | null
}

