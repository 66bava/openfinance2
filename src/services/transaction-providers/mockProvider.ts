import type { BankConnection, ImportedTransaction } from "../../types"
import type { DateRange, TransactionProvider } from "./TransactionProvider"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export class MockTransactionProvider implements TransactionProvider {
  async listConnections(userId: string): Promise<BankConnection[]> {
    const now = new Date().toISOString()
    const base = (suffix: string) => `mock-conn-${suffix}-${userId.slice(0, 8)}`
    return [
      {
        id: base("nubank"),
        userId,
        institution: { id: "nubank", name: "Nubank", brandColor: "#7C3AED" },
        status: "connected",
        createdAt: now,
        updatedAt: now,
        lastSyncAt: now,
      },
      {
        id: base("bb"),
        userId,
        institution: { id: "bb", name: "Banco do Brasil", brandColor: "#2563EB" },
        status: "connected",
        createdAt: now,
        updatedAt: now,
        lastSyncAt: now,
      },
      {
        id: base("itau"),
        userId,
        institution: { id: "itau", name: "Itaú", brandColor: "#F97316" },
        status: "pending",
        createdAt: now,
        updatedAt: now,
        lastSyncAt: null,
      },
    ]
  }

  async listImportedTransactions(userId: string, range: DateRange): Promise<ImportedTransaction[]> {
    const connId = `mock-conn-nubank-${userId.slice(0, 8)}`
    const base: ImportedTransaction[] = [
      {
        id: `mock-tx-1-${userId.slice(0, 6)}`,
        userId,
        connectionId: connId,
        description: "Salário",
        amount: 5200,
        type: "receita",
        date: daysAgoISO(10),
        currency: "BRL",
      },
      {
        id: `mock-tx-2-${userId.slice(0, 6)}`,
        userId,
        connectionId: connId,
        description: "Supermercado",
        amount: 286.4,
        type: "despesa",
        date: daysAgoISO(6),
        currency: "BRL",
      },
      {
        id: `mock-tx-3-${userId.slice(0, 6)}`,
        userId,
        connectionId: connId,
        description: "Assinatura streaming",
        amount: 39.9,
        type: "despesa",
        date: daysAgoISO(4),
        currency: "BRL",
      },
      {
        id: `mock-tx-4-${userId.slice(0, 6)}`,
        userId,
        connectionId: connId,
        description: "Restaurante",
        amount: 74.5,
        type: "despesa",
        date: daysAgoISO(2),
        currency: "BRL",
      },
      {
        id: `mock-tx-5-${userId.slice(0, 6)}`,
        userId,
        connectionId: connId,
        description: "Transferência recebida",
        amount: 250,
        type: "receita",
        date: todayISO(),
        currency: "BRL",
      },
    ]

    return base.filter((t) => t.date >= range.inicio && t.date <= range.fim)
  }
}

