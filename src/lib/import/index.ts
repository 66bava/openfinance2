import * as XLSX from "xlsx"
import type { MetodoPagamento } from "../types"

export type ImportedTransactionType = "receita" | "despesa"

export type ImportedTransactionCandidate = {
  date: string // YYYY-MM-DD
  description: string
  amount: number // sempre positivo
  type: ImportedTransactionType
  currency: "BRL"
  paymentMethod: MetodoPagamento | null
  category: { name: string; confidence: number; reason: string }
  isRecurring: boolean
  isSubscription: boolean
  isSalary: boolean
  isInvestment: boolean
  raw: Record<string, unknown> | null
}

export type ImportParseResult = {
  source: "csv" | "ofx" | "xlsx"
  filename: string
  filesizeBytes: number
  statementBalance?: number | null
  rows: Array<Record<string, unknown>>
  diagnostics?: ImportDiagnostics
}

export type ImportDiagnostics = {
  encoding: "utf-8" | "latin1" | "unknown"
  delimiter: "," | ";" | "\t" | null
  bankHint: string | null
  formatHint: string | null
  parsedRows: number
  invalidRows: number
  issues: Array<{ code: string; message: string }>
}

export type RecurringDetection = {
  key: string
  description: string
  count: number
  cadence: "semanal" | "quinzenal" | "mensal" | "irregular"
  amountMedian: number
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim()
}

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim()
}

function normalizeDescKey(s: string) {
  const t = normalizeSpaces(s)
    .toLowerCase()
    .replace(/[|/\\]+/g, " ")
    .replace(/[\u0000-\u001F]/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
  return normalizeSpaces(t)
}

export function importedTxStableKey(t: { date: string; description: string; amount: number; type: ImportedTransactionType }) {
  return `${t.date}|${normalizeDescKey(t.description)}|${t.type}|${Math.round(t.amount * 100)}`
}

export function importedTxRecurringKey(t: { description: string; amount: number; type: ImportedTransactionType }) {
  return `${normalizeDescKey(t.description)}|${Math.round(t.amount * 100)}|${t.type}`
}

function parseBRAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  const s0 = safeTrim(raw)
  if (!s0) return null
  // aceita "1.234,56", "-123,45", "123.45"
  const s = s0
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove separador de milhar quando fizer sentido
    .replace(",", ".")
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return n
}

function toISODateYYYYMMDD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseDateLoose(raw: unknown): string | null {
  if (raw instanceof Date && Number.isFinite(raw.getTime())) return toISODateYYYYMMDD(raw)
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial date (aprox) - evita valores muito pequenos
    if (raw >= 20000 && raw <= 80000) {
      const ms = Math.round((raw - 25569) * 86400 * 1000)
      return toISODateYYYYMMDD(new Date(ms))
    }
  }
  const s = safeTrim(raw)
  if (!s) return null

  // YYYY-MM-DD (ou ISO)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // DD/MM/YYYY ou DD-MM-YYYY
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (br) {
    const dd = br[1]!.padStart(2, "0")
    const mm = br[2]!.padStart(2, "0")
    const yyyy = br[3]!
    return `${yyyy}-${mm}-${dd}`
  }

  // DD/MM/YY
  const br2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
  if (br2) {
    const dd = br2[1]!.padStart(2, "0")
    const mm = br2[2]!.padStart(2, "0")
    const yy = Number(br2[3]!)
    const yyyy = yy >= 70 ? 1900 + yy : 2000 + yy
    return `${yyyy}-${mm}-${dd}`
  }

  // "20260401" (OFX)
  const ymd = s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`

  // tenta Date.parse como fallback
  const ms = Date.parse(s)
  if (!Number.isFinite(ms)) return null
  return toISODateYYYYMMDD(new Date(ms))
}

function guessDelimiter(sample: string): "," | ";" | "\t" {
  const comma = (sample.match(/,/g) || []).length
  const semi = (sample.match(/;/g) || []).length
  const tab = (sample.match(/\t/g) || []).length
  if (tab >= comma && tab >= semi) return "\t"
  if (semi >= comma) return ";"
  return ","
}

function parseCSVRecords(text: string, delimiter: "," | ";" | "\t"): { records: string[][]; invalid: number } {
  const records: string[][] = []
  let row: string[] = []
  let cur = ""
  let inQuotes = false
  let invalid = 0

  // remove BOM
  const cleaned = text.replace(/^\uFEFF/, "")

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]!

    if (ch === '"') {
      const next = cleaned[i + 1]
      if (inQuotes && next === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    // newline handling (outside quotes)
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      // support \r\n
      if (ch === "\r" && cleaned[i + 1] === "\n") i++
      const trimmedCur = cur.trim()
      row.push(trimmedCur)
      cur = ""
      // ignore fully empty rows
      if (row.some((c) => c.trim().length > 0)) records.push(row)
      row = []
      continue
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cur.trim())
      cur = ""
      continue
    }

    cur += ch
  }

  if (inQuotes) {
    // tenta recuperar: fecha aspas "virtualmente"
    invalid += 1
    inQuotes = false
  }

  // flush
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim())
    if (row.some((c) => c.trim().length > 0)) records.push(row)
  }

  // compacta colunas finais vazias frequentes
  const compacted = records.map((r) => {
    let end = r.length
    while (end > 0 && r[end - 1] != null && String(r[end - 1]).trim() === "") end--
    return r.slice(0, Math.max(end, 1))
  })

  return { records: compacted, invalid }
}

function normalizeHeader(h: string) {
  return normalizeDescKey(h).replace(/\s/g, "_")
}

function looksLikeHeaderRow(cells: string[]): boolean {
  const joined = normalizeDescKey(cells.join(" "))
  // termos comuns em extratos BR
  return /\bdata\b|\bdescricao\b|\bhist[oó]rico\b|\bvalor\b|\bdebito\b|\bcredito\b|\blan[cç]amento\b|\btransa[cç][aã]o\b/.test(
    joined,
  )
}

function rowsFromCSV(text: string): { rows: Array<Record<string, unknown>>; delimiter: "," | ";" | "\t"; invalidRows: number } {
  const sample = text
    .slice(0, 4096)
    .split(/\r?\n/g)
    .slice(0, 8)
    .join("\n")
  const delimiter = guessDelimiter(sample)
  const { records, invalid } = parseCSVRecords(text, delimiter)
  if (records.length === 0) return { rows: [], delimiter, invalidRows: invalid }

  const first = records[0] ?? []
  const headerMode = looksLikeHeaderRow(first)

  const headers = headerMode
    ? first.map((h, idx) => (h ? normalizeHeader(h) : `col_${idx + 1}`))
    : first.map((_, idx) => `col_${idx + 1}`)

  const startIdx = headerMode ? 1 : 0
  const out: Array<Record<string, unknown>> = []
  let invalidRows = invalid
  for (let i = startIdx; i < records.length; i++) {
    const cols = records[i] ?? []
    if (cols.every((c) => String(c).trim() === "")) continue
    // se a linha tem muito menos colunas que o esperado, marca como inválida mas não quebra tudo
    if (cols.length < Math.min(2, headers.length)) {
      invalidRows += 1
      continue
    }
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) row[headers[j]!] = cols[j] ?? ""
    // preserva extras sem quebrar normalização (útil p/ debug interno)
    if (cols.length > headers.length) row.__extra = cols.slice(headers.length)
    out.push(row)
  }
  return { rows: out, delimiter, invalidRows }
}

function safeTextDecoder(encoding: string, fatal: boolean) {
  try {
    // @ts-expect-error browsers accept encoding string
    return new TextDecoder(encoding, { fatal })
  } catch {
    return null
  }
}

async function readFileTextAutoEncoding(file: File): Promise<{ text: string; encoding: ImportDiagnostics["encoding"] }> {
  const buf = await file.arrayBuffer()
  const u8 = new Uint8Array(buf)

  // tenta utf-8 "de verdade" (fatal)
  const utf8Fatal = safeTextDecoder("utf-8", true)
  if (utf8Fatal) {
    try {
      const text = utf8Fatal.decode(u8)
      return { text, encoding: "utf-8" }
    } catch {
      // fallback
    }
  }

  const latin1 = safeTextDecoder("windows-1252", false) ?? safeTextDecoder("iso-8859-1", false)
  if (latin1) {
    return { text: latin1.decode(u8), encoding: "latin1" }
  }

  // último fallback manual
  let s = ""
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!)
  return { text: s, encoding: "unknown" }
}

function guessBankFromHeaders(keys: string[]): { bankHint: string | null; formatHint: string | null } {
  const joined = normalizeDescKey(keys.join(" "))
  if (/\bnubank\b|\bnu_pagamentos\b|\bnu pagamentos\b/.test(joined)) return { bankHint: "Nubank", formatHint: "nubank_csv" }
  if (/\binter\b|\bbanco_inter\b|\bbanco inter\b/.test(joined)) return { bankHint: "Inter", formatHint: "inter_csv" }
  if (/\bita[uú]\b|\bitau\b/.test(joined)) return { bankHint: "Itaú", formatHint: "itau_csv" }
  if (/\bsantander\b/.test(joined)) return { bankHint: "Santander", formatHint: "santander_csv" }
  if (/\bc6\b|\bc6bank\b|\bc6 bank\b/.test(joined)) return { bankHint: "C6", formatHint: "c6_csv" }
  return { bankHint: null, formatHint: null }
}

function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    const nk = normalizeHeader(k)
    if (!nk) continue
    const cur = out[nk]
    if (cur == null || safeTrim(cur) === "") out[nk] = v
    else if (v != null && safeTrim(v) !== "") {
      // evita colisão sem perder informação
      let i = 2
      while (out[`${nk}_${i}`] != null) i++
      out[`${nk}_${i}`] = v
    }
  }
  return out
}

function stripOfxHeaders(text: string) {
  // OFX tem um header "chave:valor" até a linha em branco
  const idx = text.indexOf("<OFX")
  return idx >= 0 ? text.slice(idx) : text
}

function decodeOfxEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function tagValue(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i")
  const m = block.match(re)
  return m?.[1] ? decodeOfxEntities(m[1].trim()) : null
}

function parseOFXText(text: string): { rows: Array<Record<string, unknown>>; balance?: number | null } {
  const body = stripOfxHeaders(text)
  const blocks = body.split(/<STMTTRN>/i).slice(1)
  const rows: Array<Record<string, unknown>> = []
  for (const b of blocks) {
    const end = b.split(/<\/STMTTRN>/i)[0] ?? b
    const dt = tagValue(end, "DTPOSTED") || tagValue(end, "DTUSER")
    const trnamt = tagValue(end, "TRNAMT")
    const memo = tagValue(end, "MEMO") || tagValue(end, "NAME") || ""
    const fitid = tagValue(end, "FITID") || null
    const checknum = tagValue(end, "CHECKNUM") || null
    rows.push({
      dtposted: dt ?? "",
      trnamt: trnamt ?? "",
      memo,
      fitid,
      checknum,
      raw_block: end,
    })
  }

  // tenta saldo em <LEDGERBAL><BALAMT>
  const ledger = body.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]*)/i)
  const bal = ledger?.[1] ? parseBRAmount(ledger[1].trim()) : null
  return { rows, balance: bal == null ? null : bal }
}

export async function parseCSV(file: File): Promise<ImportParseResult> {
  const { text, encoding } = await readFileTextAutoEncoding(file)
  const parsed = rowsFromCSV(text)
  const bank = guessBankFromHeaders(Object.keys(parsed.rows[0] ?? {}))
  return {
    source: "csv",
    filename: file.name,
    filesizeBytes: file.size,
    rows: parsed.rows,
    statementBalance: null,
    diagnostics: {
      encoding,
      delimiter: parsed.delimiter,
      bankHint: bank.bankHint,
      formatHint: bank.formatHint,
      parsedRows: parsed.rows.length,
      invalidRows: parsed.invalidRows,
      issues: parsed.invalidRows > 0 ? [{ code: "csv_partial", message: "Algumas linhas foram ignoradas por estarem incompletas." }] : [],
    },
  }
}

export async function parseXLSX(file: File): Promise<ImportParseResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: false })
  const firstName = wb.SheetNames[0]
  const sheet = firstName ? wb.Sheets[firstName] : undefined
  const rawRows = sheet ? (XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Array<Record<string, unknown>>) : []
  const rows = rawRows.map((r) => normalizeRowKeys(r))
  const bank = guessBankFromHeaders(Object.keys(rows[0] ?? {}))
  return {
    source: "xlsx",
    filename: file.name,
    filesizeBytes: file.size,
    rows,
    statementBalance: null,
    diagnostics: {
      encoding: "unknown",
      delimiter: null,
      bankHint: bank.bankHint,
      formatHint: bank.formatHint,
      parsedRows: rows.length,
      invalidRows: 0,
      issues: [],
    },
  }
}

export async function parseOFX(file: File): Promise<ImportParseResult> {
  const { text, encoding } = await readFileTextAutoEncoding(file)
  const parsed = parseOFXText(text)
  return {
    source: "ofx",
    filename: file.name,
    filesizeBytes: file.size,
    rows: parsed.rows,
    statementBalance: parsed.balance ?? null,
    diagnostics: {
      encoding,
      delimiter: null,
      bankHint: null,
      formatHint: null,
      parsedRows: parsed.rows.length,
      invalidRows: 0,
      issues: [],
    },
  }
}

function pickFirst(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== "") return v
  }
  return null
}

function fallbackPickByValue(row: Record<string, unknown>): { date: unknown; amount: unknown; description: unknown } {
  const entries = Object.entries(row).filter(([k]) => k !== "__extra" && !k.startsWith("__"))

  let bestDate: { v: unknown; score: number } | null = null
  let bestAmount: { v: unknown; signed: number; score: number } | null = null
  let bestDesc: { v: unknown; score: number } | null = null

  for (const [k, v] of entries) {
    const key = normalizeDescKey(k)
    const s = safeTrim(v)
    if (!s) continue

    const d = parseDateLoose(v)
    if (d) {
      const score = /data|date|dt/.test(key) ? 3 : 1
      if (!bestDate || score > bestDate.score) bestDate = { v, score }
      continue
    }

    const n = parseBRAmount(v)
    if (n != null && Number.isFinite(n) && n !== 0) {
      const score =
        /valor|amount|trnamt|vlr/.test(key) ? 4 : /credito|cr[eé]dito|entrada|income|deposit/.test(key) ? 3 : /debito|d[eé]bito|sa[ií]da|withdraw/.test(key) ? 3 : 1
      if (!bestAmount || score > bestAmount.score) bestAmount = { v, signed: n, score }
      continue
    }

    // texto "provável descrição"
    const letters = /[\p{L}]/u.test(s)
    if (letters) {
      const score = Math.min(6, Math.max(1, Math.round(s.length / 8))) + (/desc|memo|hist|lan[cç]a/.test(key) ? 3 : 0)
      if (!bestDesc || score > bestDesc.score) bestDesc = { v, score }
    }
  }

  // fallback final: qualquer campo não vazio como descrição
  if (!bestDesc) {
    const any = entries.find(([, v]) => safeTrim(v) !== "")
    if (any) bestDesc = { v: any[1], score: 1 }
  }

  return { date: bestDate?.v ?? null, amount: bestAmount?.v ?? null, description: bestDesc?.v ?? null }
}

function detectPaymentMethodFromRow(
  row: Record<string, unknown>,
  description: string,
): { method: MetodoPagamento | null; confidence: number; reason: string } {
  const hintRaw =
    pickFirst(row, [
      "metodo_pagamento",
      "método_pagamento",
      "metodo_de_pagamento",
      "forma_pagamento",
      "tipo_pagamento",
      "payment_method",
      "paymentmethod",
      "method",
      "origem",
      "canal",
      "tipo_operacao",
      "tipo_operacao_2",
      "tipo",
      "operacao",
      "operação",
    ]) ?? null

  const hint = safeTrim(hintRaw)
  return detectPaymentMethod(hint ? `${description} ${hint}` : description)
}

function normalizeRowToCandidate(row: Record<string, unknown>, source: ImportParseResult["source"]): ImportedTransactionCandidate | null {
  // mapeia campos comuns por variações de header
  let dateRaw =
    pickFirst(row, [
      "data",
      "date",
      "dtposted",
      "dt_posted",
      "data_da_transacao",
      "data_transacao",
      "data_movimento",
      "data_do_movimento",
      "dt",
      "data_lancamento",
      "data_do_lancamento",
      "transaction_date",
    ]) ?? null
  let descRaw =
    pickFirst(row, [
      "descricao",
      "descrição",
      "description",
      "memo",
      "historico",
      "histórico",
      "lancamento",
      "lançamento",
      "nome",
      "name",
      "estabelecimento",
      "merchant",
    ]) ?? null

  // valores: pode vir como "valor" OU colunas separadas debito/credito
  let amountRaw =
    pickFirst(row, ["valor", "valor_r", "valor_rs", "amount", "trnamt", "value", "vlr", "vlr_transacao", "valor_transacao"]) ?? null
  const debitRaw = pickFirst(row, ["debito", "debito_r", "débito", "saidas", "saída", "saida", "withdrawal"]) ?? null
  const creditRaw = pickFirst(row, ["credito", "credito_r", "crédito", "entradas", "entrada", "deposit", "income"]) ?? null

  if (!dateRaw || !descRaw || (!amountRaw && !debitRaw && !creditRaw)) {
    const fb = fallbackPickByValue(row)
    dateRaw = dateRaw ?? fb.date
    descRaw = descRaw ?? fb.description
    amountRaw = amountRaw ?? fb.amount
  }

  const isoDate = parseDateLoose(dateRaw)
  const description = normalizeSpaces(safeTrim(descRaw))
  if (!isoDate || !description) return null

  let signed: number | null = null
  if (amountRaw != null && safeTrim(amountRaw) !== "") signed = parseBRAmount(amountRaw)
  if (signed == null) {
    const d = parseBRAmount(debitRaw)
    const c = parseBRAmount(creditRaw)
    if (d != null && d !== 0) signed = -Math.abs(d)
    else if (c != null && c !== 0) signed = Math.abs(c)
  }
  if (signed == null || !Number.isFinite(signed) || signed === 0) return null

  const type: ImportedTransactionType = signed < 0 ? "despesa" : "receita"
  const amount = Math.abs(signed)

  const paymentMethod = detectPaymentMethodFromRow(row, description)
  const category = suggestTransactionCategory(description, amount, type)

  return {
    date: isoDate,
    description,
    amount,
    type,
    currency: "BRL",
    paymentMethod: paymentMethod.method,
    category: { name: category.name, confidence: category.confidence, reason: category.reason },
    isRecurring: false,
    isSubscription: false,
    isSalary: false,
    isInvestment: category.isInvestment === true,
    raw: source === "ofx" ? { ...row } : { ...row },
  }
}

export function normalizeImportedTransactions(parsed: ImportParseResult): ImportedTransactionCandidate[] {
  const rawCandidates = parsed.rows
    .map((r) => normalizeRowToCandidate(r, parsed.source))
    .filter(Boolean) as ImportedTransactionCandidate[]

  // dedup básico por (data, descrição normalizada, valor, tipo)
  const seen = new Set<string>()
  const out: ImportedTransactionCandidate[] = []
  for (const c of rawCandidates) {
    const key = `${c.date}|${normalizeDescKey(c.description)}|${c.type}|${Math.round(c.amount * 100)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }

  // ordena desc (mais recente primeiro)
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return out
}

export function detectPaymentMethod(description: string): { method: MetodoPagamento | null; confidence: number; reason: string } {
  const s = normalizeDescKey(description)
  const has = (re: RegExp) => re.test(s)

  if (has(/\bpix\b/) && has(/\bqr\b|\bqrcode\b|\bqr_code\b|copia\s+e\s+cola/)) {
    return { method: "pix_qr_code", confidence: 0.92, reason: "pix+qr" }
  }
  if (has(/\bpix\b/)) return { method: "pix", confidence: 0.85, reason: "pix" }
  if (has(/\bboleto\b|\bbarcode\b|\bc[oó]digo\s+de\s+barras\b/)) return { method: "boleto", confidence: 0.9, reason: "boleto" }
  if (has(/\bd[eé]bito\s+autom[aá]tico\b|\bdebito\s+automatico\b|\bauto\s+debit\b|\bd[aé]bito\s+em\s+conta\b/)) {
    return { method: "debito_automatico", confidence: 0.9, reason: "debito_automatico" }
  }
  if (has(/\btransfer[êe]ncia\b|\bted\b|\bdoc\b|\btef\b/)) return { method: "transferencia", confidence: 0.82, reason: "transferencia" }
  if (has(/\bd[eé]bito\b|\bcompra\s+debit\b|\bdebit\b/)) return { method: "debito", confidence: 0.72, reason: "debito" }
  if (has(/\bcr[eé]dito\b|\bcredit\b|\bcart[aã]o\b/)) return { method: "credito", confidence: 0.7, reason: "credito/cartao" }
  if (has(/\bdinheiro\b|\besp[eé]cie\b/)) return { method: "dinheiro", confidence: 0.7, reason: "dinheiro" }

  return { method: null, confidence: 0.1, reason: "unknown" }
}

export function suggestTransactionCategory(
  description: string,
  amount: number,
  type: ImportedTransactionType,
): { name: string; confidence: number; reason: string; isInvestment?: boolean } {
  // Remove ruído bancário antes de classificar
  const s = normalizeDescKey(description)
    .replace(/\b(compra\s+no\s+)?(cr[eé]dito|d[eé]bito)\b/g, "")
    .replace(/\b(ag|ag\.?)\s*\d+/g, "")
    .replace(/\bconta\s*\d+/g, "")
    .replace(/\bop\s*\d+/g, "")
    .replace(/\bfitid\b.*$/g, "")
    .replace(/\b\d{5,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()

  // ── Investimentos (receita e despesa) ─────────────────────────────────────
  const isInvestmentKeyword =
    /\bcdb\b|\blci\b|\blca\b|\bcri\b|\bcra\b|\btesouro\b|\btesouro\s+direto\b/.test(s) ||
    /\brenda\s+fixa\b|\brenda\s+vari[aá]vel\b|\bfundo\s+de\s+investimento\b|\bfundo\s+imobili[aá]rio\b|\bfii\b/.test(s) ||
    /\baporte\b|\baplicac[aã]o\b|\baplicação\b|\binvestimento\b|\bpoupan[cç]a\b|\bcaixinha\b/.test(s) ||
    /\bresgate\b|\bvencimento\s+cdb\b|\bvencimento\s+lci\b/.test(s) ||
    /\bxp\s+investimento\b|\bnuinvest\b|\bnu\s+invest\b|\binter\s+invest\b|\bclear\b|\bmodal\b|\bbtg\b/.test(s)

  if (isInvestmentKeyword) {
    if (type === "receita") return { name: "Investimentos", confidence: 0.92, reason: "investimento_rendimento", isInvestment: true }
    return { name: "Investimentos", confidence: 0.92, reason: "investimento_aporte", isInvestment: true }
  }

  // ── Receitas ──────────────────────────────────────────────────────────────
  if (type === "receita") {
    if (/\bsal[aá]rio\b|\bfolha\b|\bpayroll\b|\bproventos\b|\bholerite\b/.test(s)) {
      return { name: "Salário", confidence: 0.95, reason: "salario" }
    }
    if (/\b13\s*[oº]\b|\bdécimo\s+terceiro\b|\bdecimo\s+terceiro\b|\bférias\b|\bferias\b|\brescis[aã]o\b/.test(s)) {
      return { name: "Salário", confidence: 0.9, reason: "beneficio_trabalhista" }
    }
    if (/\baluguel\b|\blocação\b|\blocacao\b|\brenda\s+aluguel\b/.test(s)) {
      return { name: "Receita", confidence: 0.88, reason: "aluguel_recebido" }
    }
    if (/\bfreela\b|\bfreelance\b|\bprestação\s+de\s+servi[cç]o\b|\bhonorários\b|\bhonorarios\b/.test(s)) {
      return { name: "Receita", confidence: 0.85, reason: "servico_prestado" }
    }
    if (/\bpix\b|\breceb\b|\btransfer[êe]ncia\b/.test(s)) {
      return { name: "Receita", confidence: 0.7, reason: "pix_transferencia_recebida" }
    }
    return { name: "Receita", confidence: 0.6, reason: "tipo=receita" }
  }

  // ── Transferências (despesas que não são gastos reais) ────────────────────
  if (/\btransfer[êe]ncia\b|\bted\b|\bdoc\b|\btef\b/.test(s) && !/\bpagamento\b/.test(s)) {
    return { name: "Transferência", confidence: 0.82, reason: "transferencia" }
  }

  // ── Despesas ──────────────────────────────────────────────────────────────
  if (/\bmercado\b|\bsuper\b|\bsupermerc\b|\bpadaria\b|\bifood\b|\brappi\b|\brestaurante\b|\blanche\b|\bdelivery\b|\bmc\s*donalds\b|\bbob\b|\bkfc\b|\bburger\b|\bpizzaria\b|\blanchonete\b|\bchurrascaria\b|\bbar\b|\bsushi\b|\bcaf[eé]\b|\bacougue\b/.test(s)) {
    return { name: "Alimentação", confidence: 0.9, reason: "alimentacao" }
  }
  if (/\buber\b|\b99\b|\bgasolina\b|\bcombust[íi]vel\b|\bônibus\b|\bonibus\b|\bmetr[oô]\b|\bpassagem\b|\bestacionamento\b|\bshell\b|\bposto\b|\bipiranga\b|\bpetrobras\b|\bbrasilprev\b|\betanol\b|\bpedágio\b|\bpedagio\b/.test(s)) {
    return { name: "Transporte", confidence: 0.9, reason: "transporte" }
  }
  if (/\bnetflix\b|\bspotify\b|\bprime\b|\bamazon\b|\bhbo\b|\bdisney\b|\bgoogle\b|\bapple\b|\bopenai\b|\bclaude\b|\badobe\b|\bcanva\b|\bmicrosoft\b|\boffice\b|\byoutube\b|\btwitch\b|\bdeezer\b|\btidal\b|\bpararock\b/.test(s)) {
    return { name: "Assinaturas", confidence: 0.92, reason: "assinatura_brand" }
  }
  if (/\bfarm[aá]cia\b|\bdrogaria\b|\brem[eé]dio\b|\bhospital\b|\bcl[ií]nica\b|\bexame\b|\bconsult[oó]rio\b|\bdentista\b|\bodontol\b|\bpsicologo\b|\bpsiquiatra\b|\bmedico\b|\bm[eé]dico\b|\bsaude\b|\bsaúde\b|\bplano\s+de\s+saude\b|\bunimed\b|\bsulam[eé]rica\b|\bamil\b/.test(s)) {
    return { name: "Saúde", confidence: 0.88, reason: "saude" }
  }
  if (/\bescola\b|\bcurso\b|\blivro\b|\bfaculdade\b|\buniversidade\b|\bmaterial\b|\bensino\b|\beducac[aã]o\b|\bcolégio\b|\bcolegio\b|\bmatrícul\b|\bmatrícul\b|\budemy\b|\bcoursera\b/.test(s)) {
    return { name: "Educação", confidence: 0.86, reason: "educacao" }
  }
  if (/\baluguel\b|\bcondom[ií]nio\b|\bluz\b|\benergia\b|\bágua\b|\bagua\b|\bg[aá]s\b|\binternet\b|\biptu\b|\bsaneamento\b|\bcopasa\b|\bsabesp\b|\bcemig\b|\blight\b|\benel\b|\bclaro\b|\bvivo\b|\btim\b|\boi\b|\bnext\b/.test(s)) {
    return { name: "Moradia", confidence: 0.78, reason: "moradia" }
  }
  if (/\bshopping\b|\broupa\b|\bcalçado\b|\bcalcado\b|\bvestuário\b|\bvestuario\b|\bzara\b|\briachuelo\b|\brenner\b|\bhm\b|\bc&a\b|\bmoda\b/.test(s)) {
    return { name: "Vestuário", confidence: 0.82, reason: "vestuario" }
  }
  if (/\blazer\b|\bcinema\b|\bteatro\b|\bshow\b|\beventbrite\b|\bingressos\b|\bingresso\b|\bgame\b|\bjogo\b|\bsteam\b|\bplaystation\b|\bxbox\b|\bnintendo\b/.test(s)) {
    return { name: "Lazer", confidence: 0.8, reason: "lazer" }
  }
  if (/\bimposto\b|\birpf\b|\birrf\b|\bip[tv][au]\b|\bdarf\b|\bicms\b|\biss\b|\bpis\b|\bcofins\b|\binss\b|\bfgts\b|\b(pagamento|boleto)\s+(taxa|tributo)\b/.test(s)) {
    return { name: "Impostos", confidence: 0.85, reason: "imposto" }
  }
  if (/\bseguro\b|\bcorretora\b|\bbradesco\s+seguro\b|\bsulam[eé]rica\s+seguro\b|\bport[oO]\s+seguro\b|\bliberty\b|\bsuhai\b/.test(s)) {
    return { name: "Seguros", confidence: 0.82, reason: "seguro" }
  }
  if (/\bpet\b|\bveterinário\b|\bveterinario\b|\brac[ao]\s+pet\b|\bbanho\s+e\s+tosa\b/.test(s)) {
    return { name: "Pets", confidence: 0.85, reason: "pets" }
  }

  // fallback por valor — evitar "Outros" genérico
  if (amount >= 2000) return { name: "Contas", confidence: 0.52, reason: "fallback_alto_valor" }
  if (amount >= 500) return { name: "Compras", confidence: 0.5, reason: "fallback_medio_valor" }
  return { name: "Outros", confidence: 0.4, reason: "fallback" }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  if (v.length % 2 === 1) return v[mid]!
  return (v[mid - 1]! + v[mid]!) / 2
}

function cadenceFromIntervals(days: number[]): RecurringDetection["cadence"] {
  const near = (target: number, tol: number) => days.some((d) => Math.abs(d - target) <= tol)
  if (near(7, 2)) return "semanal"
  if (near(14, 3)) return "quinzenal"
  if (near(30, 4) || near(31, 4) || near(28, 4)) return "mensal"
  return "irregular"
}

export function detectRecurringTransactions(txs: ImportedTransactionCandidate[]): RecurringDetection[] {
  const byKey = new Map<string, ImportedTransactionCandidate[]>()
  for (const t of txs) {
    // chave: descrição "limpa" + valor arredondado em centavos
    const key = `${normalizeDescKey(t.description)}|${Math.round(t.amount * 100)}|${t.type}`
    const arr = byKey.get(key) ?? []
    arr.push(t)
    byKey.set(key, arr)
  }

  const detections: RecurringDetection[] = []
  for (const [key, arr] of byKey.entries()) {
    if (arr.length < 2) continue
    const sorted = [...arr].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const days: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1]!.date + "T00:00:00")
      const b = new Date(sorted[i]!.date + "T00:00:00")
      days.push(Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)))
    }
    const cadence = cadenceFromIntervals(days)
    detections.push({
      key,
      description: sorted[0]!.description,
      count: arr.length,
      cadence,
      amountMedian: median(sorted.map((x) => x.amount)),
    })
  }

  return detections.sort((a, b) => b.count - a.count).slice(0, 30)
}

export function detectSubscriptions(
  txs: ImportedTransactionCandidate[],
  recurring: RecurringDetection[],
): { key: string; name: string; monthlyEstimate: number; confidence: number }[] {
  const subsByKey = new Map<string, { key: string; name: string; monthlyEstimate: number; confidence: number }>()
  const isBrandSub = (desc: string) =>
    /\bnetflix\b|\bspotify\b|\bprime\b|\bamazon\b|\bhbo\b|\bdisney\b|\bopenai\b|\bclaude\b|\badobe\b|\bcanva\b/.test(
      normalizeDescKey(desc),
    )
  const hasSubKeyword = (desc: string) =>
    /\bassinat(?:ura|)\b|\bmensalidade\b|\bplano\b|\bsubscription\b/.test(normalizeDescKey(desc))

  for (const r of recurring) {
    if (r.cadence !== "mensal") continue
    if (!isBrandSub(r.description) && !hasSubKeyword(r.description)) continue
    subsByKey.set(r.key, { key: r.key, name: r.description, monthlyEstimate: r.amountMedian, confidence: isBrandSub(r.description) ? 0.9 : 0.72 })
  }

  // Sem recorrência, só sugere para marcas muito fortes (evita falso positivo)
  for (const t of txs) {
    if (t.type !== "despesa") continue
    if (!isBrandSub(t.description)) continue
    const key = `${normalizeDescKey(t.description)}|${Math.round(t.amount * 100)}`
    if (!subsByKey.has(key)) subsByKey.set(key, { key, name: t.description, monthlyEstimate: t.amount, confidence: 0.75 })
  }

  return [...subsByKey.values()].slice(0, 20)
}

export function detectSalary(txs: ImportedTransactionCandidate[]): { description: string; amount: number; confidence: number } | null {
  const incomes = txs.filter((t) => t.type === "receita")
  if (incomes.length === 0) return null

  const salaryLike = incomes.filter((t) => /\bsal[aá]rio\b|\bfolha\b|\bpayroll\b|\bproventos\b/.test(normalizeDescKey(t.description)))
  const base = salaryLike.length > 0 ? salaryLike : incomes
  const top = [...base].sort((a, b) => b.amount - a.amount)[0]
  if (!top) return null

  const conf = salaryLike.length > 0 ? 0.95 : top.amount >= 2000 ? 0.7 : 0.55
  return { description: top.description, amount: top.amount, confidence: conf }
}

type CategorizationRuleInput = {
  key: string
  tipo: "receita" | "despesa" | null
  categoria_nome: string
  confidence: number
}

export function applyUserCategorizationRules(
  txs: ImportedTransactionCandidate[],
  rules: CategorizationRuleInput[],
): ImportedTransactionCandidate[] {
  if (!rules.length) return txs

  // Índice: `key|tipo` → regra com maior confidence
  const ruleMap = new Map<string, CategorizationRuleInput>()
  for (const rule of rules) {
    const mapKey = `${rule.key}|${rule.tipo ?? "any"}`
    const existing = ruleMap.get(mapKey)
    if (!existing || rule.confidence > existing.confidence) ruleMap.set(mapKey, rule)
  }

  return txs.map((tx) => {
    const recurringKey = importedTxRecurringKey(tx)
    const specificKey = `${recurringKey}|${tx.type}`
    const anyKey = `${recurringKey}|any`

    const rule = ruleMap.get(specificKey) ?? ruleMap.get(anyKey)
    if (!rule) return tx

    // Apenas sobrescreve se a regra do usuário for mais confiável que a sugestão automática
    if (rule.confidence >= tx.category.confidence) {
      return {
        ...tx,
        category: {
          name: rule.categoria_nome,
          confidence: Math.min(1, rule.confidence + 0.05),
          reason: "user_rule",
        },
      }
    }
    return tx
  })
}

export async function parseAnySupportedFile(file: File): Promise<ImportParseResult> {
  const name = (file.name || "").toLowerCase()
  if (name.endsWith(".csv")) return parseCSV(file)
  if (name.endsWith(".ofx")) return parseOFX(file)
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXLSX(file)

  // sniff por conteúdo (quando extensão vem errada)
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer())
  const asText = (() => {
    const dec = safeTextDecoder("utf-8", false)
    return dec ? dec.decode(head) : ""
  })()

  if (/<ofx/i.test(asText)) return parseOFX(file)
  // xlsx é zip (PK..)
  if (head[0] === 0x50 && head[1] === 0x4b) return parseXLSX(file)

  // fallback: tenta como CSV
  return parseCSV(file)
}
