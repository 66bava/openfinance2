import type { BankConnection, ImportedTransaction } from "../../types"
import type { DateRange, TransactionProvider } from "./TransactionProvider"

// Provider vazio (sem Open Finance real). Mantém o app funcional sem "inventar" dados.
export class NoopTransactionProvider implements TransactionProvider {
  async listConnections(_userId: string): Promise<BankConnection[]> {
    return []
  }

  async listImportedTransactions(_userId: string, _range: DateRange): Promise<ImportedTransaction[]> {
    return []
  }
}

