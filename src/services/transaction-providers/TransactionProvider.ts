import type { BankConnection, ImportedTransaction } from "../../types"

export type DateRange = { inicio: string; fim: string }

export interface TransactionProvider {
  listConnections(userId: string): Promise<BankConnection[]>
  listImportedTransactions(userId: string, range: DateRange): Promise<ImportedTransaction[]>
}

