import type { TransactionProvider } from "../transaction-providers"
import { MockTransactionProvider, NoopTransactionProvider } from "../transaction-providers"

function readBoolEnv(name: string): boolean {
  const viteEnv = (typeof import.meta !== "undefined" ? (import.meta as any).env?.[name] : undefined) as unknown
  const nodeEnv = ((globalThis as any)?.process?.env?.[name] as unknown) ?? undefined
  const value = (viteEnv ?? nodeEnv) as any
  const s = String(value ?? "").trim().toLowerCase()
  return s === "1" || s === "true" || s === "yes"
}

export function getTransactionProvider(): TransactionProvider {
  // Preparação para Open Finance real:
  // futuramente trocar este factory por uma implementação real (plugável).
  if (readBoolEnv("VITE_OPEN_FINANCE_MOCK")) return new MockTransactionProvider()
  return new NoopTransactionProvider()
}
