import type { MetodoPagamento } from "../types"
import type { ImportedTransactionCandidate, ImportedTransactionType } from "./index"

export type DbTransacaoInsert = {
  user_id: string
  categoria_id: string | null
  descricao: string
  valor: number
  tipo: ImportedTransactionType
  data: string // ISO date YYYY-MM-DD
  metodo_pagamento?: MetodoPagamento | null
  confirmado?: boolean
  import_id?: string | null
  cycle_id?: string | null
  tx_fingerprint?: string | null
  cartao_id?: string | null
  fatura_id?: string | null
  grupo_parcela?: string | null
  parcela_atual?: number | null
  total_parcelas?: number | null
}

export type MapToDbOk = { ok: true; value: DbTransacaoInsert }
export type MapToDbErr = { ok: false; errors: string[]; value?: Partial<DbTransacaoInsert> }
export type MapToDbResult = MapToDbOk | MapToDbErr

function isIsoDate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d)
}

function isValidDate(d: string) {
  if (!isIsoDate(d)) return false
  const dt = new Date(`${d}T00:00:00.000Z`)
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === d
}

function isValidTipo(t: string): t is ImportedTransactionType {
  return t === "receita" || t === "despesa"
}

function isValidMetodoPagamento(m: unknown): m is MetodoPagamento {
  return (
    m === "dinheiro" ||
    m === "pix" ||
    m === "pix_qr_code" ||
    m === "transferencia" ||
    m === "debito" ||
    m === "credito" ||
    m === "boleto" ||
    m === "debito_automatico" ||
    m === "outro"
  )
}

export function mapImportedTransactionToDb(
  transaction: ImportedTransactionCandidate,
  userId: string,
  opts?: {
    categoriaId?: string | null
    importId?: string | null
    cycleId?: string | null
    txFingerprint?: string | null
    confirmado?: boolean
  },
): MapToDbResult {
  const errors: string[] = []

  const descricao = String(transaction.description ?? "").trim()
  const valor = Number(transaction.amount)
  const tipo = transaction.type
  const data = String(transaction.date ?? "").trim()
  const metodo_pagamento = transaction.paymentMethod

  const categoria_id = opts?.categoriaId ?? null
  const import_id = opts?.importId ?? null
  const cycle_id = opts?.cycleId ?? null
  const tx_fingerprint = opts?.txFingerprint ?? null
  const confirmado = opts?.confirmado ?? true

  if (!userId) errors.push("user_id ausente")
  if (!descricao) errors.push("descrição vazia")
  if (!Number.isFinite(valor) || valor <= 0) errors.push("valor inválido")
  if (!isValidTipo(tipo)) errors.push("tipo inválido")
  if (!isValidDate(data)) errors.push("data inválida (esperado YYYY-MM-DD)")
  if (metodo_pagamento != null && !isValidMetodoPagamento(metodo_pagamento)) errors.push("método de pagamento inválido")

  if (errors.length) {
    return {
      ok: false,
      errors,
      value: {
        user_id: userId,
        categoria_id: categoria_id ?? null,
        descricao,
        valor,
        tipo,
        data,
        metodo_pagamento: metodo_pagamento ?? null,
        confirmado,
        import_id,
        cycle_id,
        tx_fingerprint,
        cartao_id: null,
        fatura_id: null,
        grupo_parcela: null,
        parcela_atual: null,
        total_parcelas: null,
      },
    }
  }

  return {
    ok: true,
    value: {
      user_id: userId,
      categoria_id: categoria_id ?? null,
      descricao,
      valor,
      tipo,
      data,
      metodo_pagamento: metodo_pagamento ?? null,
      confirmado,
      import_id,
      cycle_id,
      tx_fingerprint,
      cartao_id: null,
      fatura_id: null,
      grupo_parcela: null,
      parcela_atual: null,
      total_parcelas: null,
    },
  }
}
