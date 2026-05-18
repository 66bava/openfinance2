import type { MetodoPagamento } from "./types"

export type QuickTxType = "receita" | "despesa"

export type CategorySuggestion = {
  categoria: string
  confidence: number
}

export type UserCategorizationRuleLite = {
  key: string
  tipo: QuickTxType | null
  categoria_nome: string
  confidence?: number | null
}

export type QuickTxDraft = {
  amount: number | null
  description: string
  type: QuickTxType | null
  categorySuggestion: CategorySuggestion | null
  paymentMethod: MetodoPagamento | null
  dateISO: string | null
}

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function parseBRLAmount(raw: string): number | null {
  const s = (raw || "").trim()
  if (!s) return null

  // Heurística BR: "1.234,56" -> 1234.56 | "123,45" -> 123.45 | "123.45" -> 123.45 | "1234" -> 1234
  let cleaned = s.replace(/[^\d.,]/g, "")
  if (!cleaned) return null

  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")

  if (hasComma && hasDot) {
    // assume "." thousands and "," decimal
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (hasComma && !hasDot) {
    cleaned = cleaned.replace(",", ".")
  }

  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

function extractAmount(text: string): number | null {
  const m =
    text.match(/(?:r\$|\$)\s*([\d.,]+)/i) ||
    text.match(/([\d]{1,3}(?:\.[\d]{3})*(?:,[\d]{2})|[\d]+(?:,[\d]{2})|[\d]+(?:\.[\d]{2})?)/)
  return m ? parseBRLAmount(m[1] || m[0] || "") : null
}

function extractDateISO(textNorm: string): string | null {
  if (/\bhoje\b/.test(textNorm)) return todayISO()
  if (/\bontem\b/.test(textNorm)) return yesterdayISO()

  const m = textNorm.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  let yyyy = m[3] ? Number(m[3]) : new Date().getFullYear()
  if (yyyy < 100) yyyy += 2000
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null
  const d = new Date(yyyy, mm - 1, dd)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export function suggestPaymentMethod(text: string): MetodoPagamento | null {
  const t = normalizeText(text)
  if (!t) return null
  if (/\bpix qr\b|\bqrcode\b|\bqr code\b/.test(t)) return "pix_qr_code"
  if (/\bpix\b/.test(t)) return "pix"
  if (/\bcredito\b|\bcr[eé]dito\b|\bcartao de credito\b|\bcartao credito\b/.test(t)) return "credito"
  if (/\bdebito\b|\bd[eé]bito\b|\bcartao de debito\b|\bcartao debito\b/.test(t)) return "debito"
  if (/\bdinheiro\b|\bespecie\b/.test(t)) return "dinheiro"
  if (/\btransferencia\b|\bted\b|\bdoc\b/.test(t)) return "transferencia"
  if (/\bboleto\b/.test(t)) return "boleto"
  if (/\bdebito automatico\b/.test(t)) return "debito_automatico"
  return null
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function suggestTransactionCategoryWithRules(
  description: string,
  amount: number | null,
  type: QuickTxType | null,
  userRules: UserCategorizationRuleLite[] | null,
): CategorySuggestion | null {
  const d = normalizeText(description)
  if (!d) return null

  if (userRules && userRules.length) {
    for (const r of userRules) {
      const key = normalizeText(r.key || "")
      if (!key || key.length < 2) continue
      if (r.tipo && type && r.tipo !== type) continue
      const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, "i")
      if (re.test(d) || d.includes(key)) {
        const conf = typeof r.confidence === "number" ? Number(r.confidence) : 0.92
        return { categoria: r.categoria_nome, confidence: Math.max(0.7, Math.min(0.99, conf)) }
      }
    }
  }

  const rules: Array<{ re: RegExp; categoria: string; confidence: number; type?: QuickTxType }> = [
    { re: /\bmercado\b|\bsupermercado\b|\bcarrefour\b|\bextra\b|\batacadao\b/, categoria: "Alimentação", confidence: 0.86, type: "despesa" },
    { re: /\buber\b|\b99\b|\bgasolina\b|\bcombustivel\b|\bonibus\b|\bmetr[oô]\b|\bposto\b/, categoria: "Transporte", confidence: 0.84, type: "despesa" },
    { re: /\bsalario\b|\bsal[aá]rio\b|\bpix recebido\b|\brecebi pix\b|\bganhei\b|\bfreela\b|\bfreelance\b/, categoria: "Receita", confidence: 0.78, type: "receita" },
    { re: /\bnetflix\b|\bspotify\b|\bclaude\b|\bchatgpt\b|\bassinatura\b|\bprime\b|\byoutube premium\b/, categoria: "Assinaturas", confidence: 0.83 },
    { re: /\bfarmacia\b|\bfarm[aá]cia\b|\bremedio\b|\brem[eé]dio\b/, categoria: "Saúde", confidence: 0.84 },
    { re: /\bescola\b|\bcurso\b|\blivro\b|\buniversidade\b/, categoria: "Educação", confidence: 0.8 },
    { re: /\bacademia\b|\besporte\b|\btreino\b/, categoria: "Esportes", confidence: 0.78 },
  ]

  for (const r of rules) {
    if (r.type && type && r.type !== type) continue
    if (r.re.test(d)) return { categoria: r.categoria, confidence: r.confidence }
  }

  return { categoria: type === "receita" ? "Receita" : "Outros", confidence: 0.55 }
}

export function suggestTransactionCategory(description: string, amount: number | null, type: QuickTxType | null): CategorySuggestion | null {
  return suggestTransactionCategoryWithRules(description, amount, type, null)
}

function guessType(textNorm: string): QuickTxType | null {
  if (/\brecebi\b|\bganhei\b|\bentrada\b|\bentrou\b/.test(textNorm)) return "receita"
  if (/\bgastei\b|\bpaguei\b|\bcomprei\b|\bdebitei\b|\bpix de\b/.test(textNorm)) return "despesa"
  if (/\bsalario\b|\bsal[aá]rio\b/.test(textNorm)) return "receita"
  return null
}

function guessDescription(original: string): string {
  const s = original.trim()
  if (!s) return ""

  // Remove valores e tokens comuns mantendo o "alvo" da frase.
  let out = s
    .replace(/(?:r\$|\$)\s*[\d.,]+/gi, "")
    .replace(/[\d]{1,3}(?:\.[\d]{3})*(?:,[\d]{2})|[\d]+(?:,[\d]{2})|[\d]+(?:\.[\d]{2})?/g, "")
    .replace(/\b(gastei|paguei|comprei|recebi|ganhei|pix|de|do|da|no|na|em|para|pro|pra)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return out || s
}

export function parseQuickTransactionText(text: string, userRules?: UserCategorizationRuleLite[] | null): QuickTxDraft {
  const original = (text || "").trim()
  const norm = normalizeText(original)

  const amount = extractAmount(original)
  const type = guessType(norm)
  const dateISO = extractDateISO(norm) || todayISO()
  const paymentMethod = suggestPaymentMethod(original)
  const description = guessDescription(original)
  const categorySuggestion = suggestTransactionCategoryWithRules(description, amount, type, userRules ?? null)

  return {
    amount,
    description,
    type,
    categorySuggestion,
    paymentMethod,
    dateISO,
  }
}
