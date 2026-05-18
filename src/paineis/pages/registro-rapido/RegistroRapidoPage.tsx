import { useEffect, useMemo, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { formatCurrency } from "../../../lib/format"
import { addTransacao, getOrCreateCategoria, getTransacoesMes } from "../../../lib/queries"
import { getCategoriasAtivas } from "../../../lib/queries/categorias"
import { getAssinaturas, calcularTotalMensal } from "../../../lib/queries/assinaturas"
import { getCompromissos } from "../../../lib/queries/futuro"
import { getUserCategorizationRules, upsertUserCategorizationRule } from "../../../lib/queries/categorization-rules"
import type { Assinatura, Categoria, Compromisso, MetodoPagamento, Transacao } from "../../../lib/types"
import { parseQuickTransactionText, type QuickTxDraft, type QuickTxType, type UserCategorizationRuleLite } from "../../../lib/quick-transaction"

type TabId = "texto" | "foto" | "manual"

function clampDayISO(date: string) {
  return date && date.length >= 10 ? date.slice(0, 10) : new Date().toISOString().split("T")[0]
}

function relativeDayPtBR(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  if (d.getTime() === today.getTime()) return "Hoje"
  if (d.getTime() === y.getTime()) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function nextDueDateISO(day: number) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = now.getDate()
  const dueThisMonth = new Date(y, m, Math.min(28, Math.max(1, day)))
  const due = today <= dueThisMonth.getDate() ? dueThisMonth : new Date(y, m + 1, Math.min(28, Math.max(1, day)))
  return due.toISOString().slice(0, 10)
}

function methodOptions(): Array<{ value: MetodoPagamento | ""; label: string }> {
  return [
    { value: "", label: "— Selecionar —" },
    { value: "credito", label: "💳 Cartão de Crédito" },
    { value: "debito", label: "🏧 Débito" },
    { value: "pix", label: "🟢 Pix" },
    { value: "pix_qr_code", label: "📲 Pix QR Code" },
    { value: "dinheiro", label: "💵 Dinheiro" },
    { value: "transferencia", label: "🔀 TED / DOC" },
    { value: "boleto", label: "🧾 Boleto" },
    { value: "debito_automatico", label: "🔁 Débito automático" },
    { value: "outro", label: "💠 Outro" },
  ]
}

function confidenceForDraft(d: QuickTxDraft): number {
  let c = 0.55
  if (d.amount != null) c += 0.2
  if (d.type) c += 0.15
  if (d.paymentMethod) c += 0.05
  if (d.categorySuggestion?.confidence) c = Math.max(c, d.categorySuggestion.confidence)
  return Math.max(0, Math.min(0.99, c))
}

type ConfirmDraft = {
  type: QuickTxType
  amount: string
  description: string
  dateISO: string
  metodo: MetodoPagamento | ""
  categoriaId: string
  suggestedCategoriaName?: string | null
}

function formatAmountInputToNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "")
  if (!cleaned) return null
  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")
  let normalized = cleaned
  if (hasComma && hasDot) normalized = cleaned.replace(/\./g, "").replace(",", ".")
  else if (hasComma) normalized = cleaned.replace(",", ".")
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : null
}

function formatNumberToBRLInput(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ruleKeyFromDescription(description: string) {
  const base = (description || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0-9]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const parts = base.split(" ").filter(Boolean)
  if (!parts.length) return ""
  return parts.slice(0, 2).join(" ").slice(0, 32)
}

async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"))
    reader.readAsDataURL(file)
  })
}

function buildUpcoming(assinaturas: Assinatura[], compromissos: Compromisso[]) {
  const out: Array<{ label: string; dateISO: string; value: number; kind: "assinatura" | "compromisso" }> = []

  for (const a of assinaturas || []) {
    if (!a.ativo) continue
    const dateISO = a.proximo_pagamento || (a.dia_cobranca ? nextDueDateISO(a.dia_cobranca) : null)
    if (!dateISO) continue
    out.push({ label: a.nome, dateISO, value: Number(a.valor) || 0, kind: "assinatura" })
  }
  for (const c of compromissos || []) {
    if (!c.ativo) continue
    out.push({
      label: c.descricao,
      dateISO: nextDueDateISO(c.dia_vencimento),
      value: Number((c as any).valor_parcela ?? c.valor) || 0,
      kind: "compromisso",
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  return out.filter((x) => x.dateISO >= today).sort((a, b) => a.dateISO.localeCompare(b.dateISO)).slice(0, 3)
}

export default function RegistroRapidoPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()

  const [tab, setTab] = useState<TabId>("texto")
  const [cats, setCats] = useState<Categoria[]>([])
  const [categoryRules, setCategoryRules] = useState<UserCategorizationRuleLite[]>([])
  const [recent, setRecent] = useState<Transacao[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])

  const [text, setText] = useState("")
  const parsedText = useMemo(() => (text.trim() ? parseQuickTransactionText(text, categoryRules) : null), [text, categoryRules])

  const [manualType, setManualType] = useState<QuickTxType>("despesa")
  const [manualAmount, setManualAmount] = useState("")
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualDesc, setManualDesc] = useState("")
  const [manualMetodo, setManualMetodo] = useState<MetodoPagamento | "">("")
  const [manualCatId, setManualCatId] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [photoFileName, setPhotoFileName] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<{ status: "idle" | "loading" | "done"; message?: string }>({ status: "idle" })
  const [photoExtracted, setPhotoExtracted] = useState<QuickTxDraft | null>(null)
  const [photoConfidence, setPhotoConfidence] = useState<number | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDraft, setConfirmDraft] = useState<ConfirmDraft | null>(null)
  const [confirmErrors, setConfirmErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const fmt = (v: number) => formatCurrency(v, lang)

  useEffect(() => {
    if (!user) return
    getCategoriasAtivas(user.id).then(setCats).catch(() => {})
    Promise.all([getTransacoesMes(user.id), getAssinaturas(user.id), getCompromissos(user.id)])
      .then(([tx, subs, comps]) => {
        setRecent((tx || []).filter((t) => t.tipo === "despesa").slice(0, 4))
        setAssinaturas(subs || [])
        setCompromissos(comps || [])
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    getUserCategorizationRules(user.id)
      .then((rows) =>
        setCategoryRules(
          (rows || []).map((r) => ({
            key: r.key,
            tipo: (r.tipo as any) ?? null,
            categoria_nome: r.categoria_nome,
            confidence: Number(r.confidence) || 0.92,
          })),
        ),
      )
      .catch(() => setCategoryRules([]))
  }, [user?.id])

  const upcoming = useMemo(() => buildUpcoming(assinaturas, compromissos), [assinaturas, compromissos])
  const upcomingTotal = useMemo(() => calcularTotalMensal(assinaturas), [assinaturas])

  const categoryChips = useMemo(() => {
    const byType = cats.filter((c) => c.tipo === manualType)
    const top = byType.slice(0, 9)
    return { all: byType, top }
  }, [cats, manualType])

  function openConfirmFromQuick(d: QuickTxDraft) {
    const type = d.type ?? "despesa"
    const amountText = d.amount != null ? formatNumberToBRLInput(d.amount) : ""
    const suggestedName = (d.categorySuggestion?.categoria ?? "").trim()
    const preselectedCategoriaId =
      suggestedName && type ? cats.find((c) => c.tipo === type && (c.nome || "").trim() === suggestedName)?.id ?? "" : ""
    setConfirmDraft({
      type,
      amount: amountText,
      description: d.description || "",
      dateISO: d.dateISO || new Date().toISOString().slice(0, 10),
      metodo: (d.paymentMethod || "") as any,
      categoriaId: preselectedCategoriaId,
      suggestedCategoriaName: d.categorySuggestion?.categoria ?? null,
    })
    setConfirmErrors({})
    setConfirmOpen(true)
  }

  function openConfirmFromManual() {
    setConfirmDraft({
      type: manualType,
      amount: manualAmount,
      description: manualDesc,
      dateISO: manualDate,
      metodo: manualMetodo,
      categoriaId: manualCatId,
    })
    setConfirmErrors({})
    setConfirmOpen(true)
  }

  async function submitConfirmed() {
    if (!user || !confirmDraft) return
    const errs: Record<string, string> = {}
    const amountNum = formatAmountInputToNumber(confirmDraft.amount)
    if (!amountNum) errs.amount = "Informe um valor válido"
    if (!confirmDraft.dateISO) errs.date = "Informe uma data"
    if (!confirmDraft.description.trim()) errs.description = "Informe uma descrição"
    setConfirmErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      let categoriaId = confirmDraft.categoriaId
      if (!categoriaId) {
        const suggested = (confirmDraft.suggestedCategoriaName || "").trim()
        if (suggested) {
          categoriaId = await getOrCreateCategoria(user.id, suggested, confirmDraft.type)
        }
      }
      if (!categoriaId) {
        setConfirmErrors((p) => ({ ...p, categoria: "Selecione uma categoria" }))
        setSubmitting(false)
        return
      }

      await addTransacao(user.id, {
        categoria_id: categoriaId,
        descricao: confirmDraft.description.trim(),
        valor: amountNum,
        tipo: confirmDraft.type,
        data: clampDayISO(confirmDraft.dateISO),
        metodo_pagamento: confirmDraft.metodo || null,
        confirmado: true,
      })

      // Aprendizado local: se o usuário corrigiu a categoria sugerida, salva uma regra simples para próximas sugestões.
      const chosenName = (cats.find((c) => c.id === categoriaId)?.nome || "").trim()
      const suggestedName = (confirmDraft.suggestedCategoriaName || "").trim()
      const key = ruleKeyFromDescription(confirmDraft.description)
      if (key && chosenName && (!suggestedName || suggestedName !== chosenName)) {
        upsertUserCategorizationRule({ userId: user.id, key, tipo: confirmDraft.type, categoriaNome: chosenName })
          .then((row) => {
            setCategoryRules((prev) => {
              const next = prev.filter((r) => !(r.key === row.key && (r.tipo ?? null) === ((row.tipo as any) ?? null)))
              next.unshift({ key: row.key, tipo: ((row.tipo as any) ?? null) as any, categoria_nome: row.categoria_nome, confidence: Number(row.confidence) || 0.92 })
              return next.slice(0, 200)
            })
          })
          .catch(() => {})
      }

      toast.success("Transação registrada!", { description: `${confirmDraft.type === "receita" ? "Receita" : "Despesa"} · R$ ${confirmDraft.amount}` })

      // Reset basic states
      setText("")
      setManualAmount("")
      setManualDesc("")
      setManualMetodo("")
      setManualCatId("")
      setPhotoFileName(null)
      setPhotoStatus({ status: "idle" })
      setPhotoExtracted(null)
      setPhotoConfidence(null)
      setConfirmOpen(false)

      // Refresh sidebar lists
      const tx = await getTransacoesMes(user.id)
      setRecent((tx || []).filter((t) => t.tipo === "despesa").slice(0, 4))
    } catch (e) {
      toast.error("Não foi possível registrar. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  async function onPickFile(file: File) {
    setPhotoFileName(file.name)
    setPhotoStatus({ status: "loading", message: "Processando…" })
    setPhotoConfidence(null)
    try {
      const dataUrl = await toDataUrl(file)
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json) {
        setPhotoStatus({ status: "done", message: "Não foi possível processar a imagem." })
        setPhotoExtracted(null)
        setPhotoConfidence(null)
        return
      }
      setPhotoStatus({ status: "done", message: json.message || "Processado." })
      if (json.extracted) setPhotoExtracted(json.extracted as QuickTxDraft)
      else setPhotoExtracted(null)
      setPhotoConfidence(typeof json.confidence === "number" ? json.confidence : null)
    } catch {
      setPhotoStatus({ status: "done", message: "Falha ao enviar arquivo." })
      setPhotoExtracted(null)
      setPhotoConfidence(null)
    }
  }

  const examples = [
    "Gastei R$ 45 no Uber hoje",
    "Recebi R$ 7200 de salário",
    "Paguei Netflix R$ 39,90 crédito",
    "Mercado R$ 220 no Pix ontem",
  ]

  const textDraft = parsedText
  const textConfidence = textDraft ? confidenceForDraft(textDraft) : null

  return (
    <div className="ofx-quickadd">
      <div className="page">
        <div className="page-header">
          <div className="page-title">
            Registro Rápido{" "}
            <span className="ia-badge">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              IA Ativa
            </span>
          </div>
          <div className="page-sub">Registre em segundos — a IA detecta valor, data, categoria e forma de pagamento.</div>
        </div>

        <div className="layout">
          <div>
            <div className="method-grid" role="tablist" aria-label="Registro rápido">
              <button
                type="button"
                className={["method-card", tab === "texto" ? "selected" : ""].filter(Boolean).join(" ")}
                onClick={() => setTab("texto")}
                role="tab"
                aria-selected={tab === "texto"}
                id="tab-texto"
                aria-controls="panel-texto"
              >
                <span className="check-indicator" aria-hidden="true">
                  <svg viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="method-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </span>
                <span className="method-name">Texto livre</span>
                <span className="method-copy">Descreva com suas palavras</span>
              </button>

              <button
                type="button"
                className={["method-card", tab === "foto" ? "selected" : ""].filter(Boolean).join(" ")}
                onClick={() => setTab("foto")}
                role="tab"
                aria-selected={tab === "foto"}
                id="tab-foto"
                aria-controls="panel-foto"
              >
                <span className="check-indicator" aria-hidden="true">
                  <svg viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="method-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <span className="method-name">Foto / comprovante</span>
                <span className="method-copy">Envie uma imagem do recibo</span>
              </button>

              <button
                type="button"
                className={["method-card", tab === "manual" ? "selected" : ""].filter(Boolean).join(" ")}
                onClick={() => setTab("manual")}
                role="tab"
                aria-selected={tab === "manual"}
                id="tab-manual"
                aria-controls="panel-manual"
              >
                <span className="check-indicator" aria-hidden="true">
                  <svg viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="method-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span className="method-name">Manual</span>
                <span className="method-copy">Preencha os campos abaixo</span>
              </button>
            </div>

            {tab === "texto" ? (
              <div className="tab-panel active" id="panel-texto" role="tabpanel" aria-labelledby="tab-texto">
                <div className="text-input-wrap">
                  <textarea
                    className="text-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ex: Paguei R$ 89,90 no iFood hoje com cartão de crédito…"
                  />
                  <button type="button" className="text-send-btn" aria-label="Detectar" onClick={() => (textDraft ? openConfirmFromQuick(textDraft) : null)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>

                {textDraft ? (
                  <div className="ai-detect-box">
                    <div className="ai-detect-header">
                      <div className="ai-detect-title">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        IA Detectou
                      </div>
                      <span className="ai-detect-confidence">{Math.round((textConfidence || 0) * 100)}% confiança</span>
                    </div>

                    <div className="detect-grid">
                      <div className="detect-field">
                        <div className="detect-label">Valor</div>
                        <div className="detect-value">{textDraft.amount != null ? `R$ ${formatNumberToBRLInput(textDraft.amount)}` : "—"}</div>
                      </div>
                      <div className="detect-field">
                        <div className="detect-label">Tipo</div>
                        <div className="detect-value" style={{ color: textDraft.type === "receita" ? "var(--green-b)" : "var(--red)" }}>
                          {textDraft.type ? (textDraft.type === "receita" ? "Receita" : "Despesa") : "—"}
                        </div>
                      </div>
                      <div className="detect-field">
                        <div className="detect-label">Data</div>
                        <div className="detect-value">{textDraft.dateISO ? relativeDayPtBR(textDraft.dateISO) : "—"}</div>
                      </div>
                      <div className="detect-field">
                        <div className="detect-label">Categoria</div>
                        <div className="detect-value">{textDraft.categorySuggestion ? textDraft.categorySuggestion.categoria : "—"}</div>
                      </div>
                      <div className="detect-field">
                        <div className="detect-label">Pagamento</div>
                        <div className="detect-value">{textDraft.paymentMethod ? textDraft.paymentMethod : "—"}</div>
                      </div>
                      <div className="detect-field">
                        <div className="detect-label">Descrição</div>
                        <div className="detect-value">{textDraft.description || "—"}</div>
                      </div>
                    </div>

                    <div className="ai-actions">
                      <button type="button" className="btn btn-primary" onClick={() => openConfirmFromQuick(textDraft)} style={{ flex: 1 }}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Confirmar Registro
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => openConfirmFromQuick(textDraft)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div style={{ padding: "14px 0", borderTop: "1px solid var(--bd)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--t3)", marginBottom: 10 }}>
                    Exemplos de frases
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {examples.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        style={{
                          padding: "5px 12px",
                          background: "var(--bg-c)",
                          border: "1px solid var(--bd)",
                          borderRadius: 20,
                          fontSize: 12,
                          color: "var(--t2)",
                          cursor: "pointer",
                          transition: "all var(--tr)",
                        }}
                        onClick={() => setText(ex)}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "foto" ? (
              <div className="tab-panel active" id="panel-foto" role="tabpanel" aria-labelledby="tab-foto">
                <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onPickFile(f)
                    }}
                  />
                  <div className="drop-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div className="drop-title">Solte a foto aqui ou clique para selecionar</div>
                  <div className="drop-sub">Nota fiscal, comprovante de Pix, recibo — a estrutura já está pronta para plugar OCR/IA visual.</div>
                  <div className="drop-badge">✨ OCR com IA</div>
                  <div className="file-types">
                    <div className="file-type">JPG</div>
                    <div className="file-type">PNG</div>
                    <div className="file-type">HEIC</div>
                  </div>
                </div>

                {photoFileName ? (
                  <div className="ai-detect-box">
                    <div className="ai-detect-header">
                      <div className="ai-detect-title">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Processamento
                      </div>
                      <span className="ai-detect-confidence">
                        {photoStatus.status === "loading"
                          ? "…"
                          : photoConfidence == null
                            ? "—"
                            : `${Math.round(Math.max(0, Math.min(1, photoConfidence)) * 100)}% confiança`}
                      </span>
                    </div>
                    <div style={{ color: "var(--t2)", fontSize: 13, lineHeight: 1.6 }}>
                      <strong className="file-name" style={{ color: "var(--t1)" }}>
                        {photoFileName}
                      </strong>
                      <div style={{ marginTop: 6 }}>{photoStatus.message}</div>
                    </div>
                    <div className="ai-actions">
                      <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={!photoExtracted} onClick={() => (photoExtracted ? openConfirmFromQuick(photoExtracted) : null)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Revisar e Registrar
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => { setPhotoFileName(null); setPhotoExtracted(null); setPhotoConfidence(null); setPhotoStatus({ status: "idle" }) }}>
                        Limpar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="pick-grid" aria-label="Opções de envio">
                  {[
                    { icon: "📷", title: "Câmera", sub: "Fotografar recibo" },
                    { icon: "📁", title: "Galeria", sub: "Selecionar imagem" },
                    { icon: "📤", title: "PDF", sub: "Importar extrato" },
                  ].map((c) => (
                    <button
                      key={c.title}
                      type="button"
                      className="pick-card"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)" }}>{c.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "manual" ? (
              <div className="tab-panel active" id="panel-manual" role="tabpanel" aria-labelledby="tab-manual">
                <div className="type-toggle">
                  <button type="button" className={["type-btn", manualType === "despesa" ? "active desp" : ""].join(" ")} onClick={() => setManualType("despesa")}>
                    💸 Despesa
                  </button>
                  <button type="button" className={["type-btn", manualType === "receita" ? "active rec" : ""].join(" ")} onClick={() => setManualType("receita")}>
                    💰 Receita
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Valor</label>
                    <input className="form-input" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="R$ 0,00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data</label>
                    <input className="form-input" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descrição</label>
                    <input className="form-input" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder="Ex: iFood, Mercado…" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Forma de Pagamento</label>
                    <select className="form-input" value={manualMetodo} onChange={(e) => setManualMetodo(e.target.value as any)}>
                      {methodOptions().map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Estabelecimento</label>
                    <input className="form-input" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder="Ex: Supermercado Extra, iFood…" />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div className="form-label" style={{ marginBottom: 10 }}>
                    Categoria
                  </div>
                  <div className="cat-grid">
                    {categoryChips.top.map((c) => (
                      <div key={c.id} className={["cat-chip", manualCatId === c.id ? "active" : ""].join(" ")} onClick={() => setManualCatId(c.id)} role="button" tabIndex={0}>
                        {(c.emoji || c.icone || "📦") + " " + c.nome}
                      </div>
                    ))}
                    {categoryChips.all.length > categoryChips.top.length ? (
                      <div className={["cat-chip", manualCatId && !categoryChips.top.some((c) => c.id === manualCatId) ? "active" : ""].join(" ")}>
                        <select
                          className="form-input"
                          value={manualCatId}
                          onChange={(e) => setManualCatId(e.target.value)}
                          style={{ border: "none", padding: 0, background: "transparent" }}
                        >
                          <option value="">+ Outra</option>
                          {categoryChips.all.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="submit-row">
                  <button type="button" className="btn btn-primary" onClick={openConfirmFromManual}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Registrar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setManualAmount("")
                      setManualDesc("")
                      setManualMetodo("")
                      setManualCatId("")
                      setManualDate(new Date().toISOString().slice(0, 10))
                      setManualType("despesa")
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="sidebar-right">
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Recentes
                </div>
              </div>
              <div className="card-body">
                {recent.length === 0 ? (
                  <div style={{ color: "var(--t2)", fontSize: 12 }}>Sem transações recentes.</div>
                ) : (
                  recent.map((t) => (
                    <div key={t.id} className="recent-item">
                      <div className="recent-icon">{(((t as any).categorias?.emoji || (t as any).categorias?.icone || "🧾") as string) || "🧾"}</div>
                      <div className="recent-info">
                        <div className="recent-name">{t.descricao}</div>
                        <div className="recent-meta">
                          {relativeDayPtBR(t.data)} · {t.metodo_pagamento ? String(t.metodo_pagamento) : "—"}
                        </div>
                      </div>
                      <div className="recent-val">−{fmt(Math.abs(Number(t.valor) || 0))}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 001 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  </svg>
                  Recorrentes Pendentes
                </div>
              </div>
              <div className="card-body">
                {upcoming.length === 0 ? (
                  <div style={{ color: "var(--t2)", fontSize: 12 }}>Sem recorrências próximas.</div>
                ) : (
                  upcoming.map((u) => (
                    <div key={u.label + u.dateISO} className="recorrente-item">
                      <div>
                        <div className="rec-name">{u.label}</div>
                        <div className="rec-date">Vence {u.dateISO.slice(8, 10)}/{u.dateISO.slice(5, 7)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="rec-val">R$ {formatNumberToBRLInput(u.value)}</span>
                        <button
                          type="button"
                          className="rec-check"
                          aria-label="Registrar recorrência"
                          onClick={() =>
                            openConfirmFromQuick({
                              amount: u.value,
                              description: u.label,
                              type: "despesa",
                              dateISO: u.dateISO,
                              paymentMethod: null,
                              categorySuggestion: { categoria: u.kind === "assinatura" ? "Assinaturas" : "Contas", confidence: 0.7 },
                            })
                          }
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="tip-box">
              <div className="tip-icon">💡</div>
              <div className="tip-text">
                <strong>Dica IA:</strong>{" "}
                {recent.length < 3
                  ? "Dados insuficientes para identificar padrões. Registre mais transações para recomendações automáticas."
                  : "Revise seus recorrentes antes do vencimento para evitar surpresas no ciclo."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogPrimitive.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000 }} />
          <DialogPrimitive.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(520px, calc(100vw - 24px))",
              maxHeight: "min(680px, calc(100vh - 24px))",
              background: "var(--bg-c)",
              border: "1px solid var(--bd-l)",
              borderRadius: 16,
              padding: 18,
              overflow: "auto",
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              zIndex: 2001,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>Confirmar transação</div>
              <DialogPrimitive.Close asChild>
                <button type="button" style={{ background: "transparent", border: "none", color: "var(--t2)", cursor: "pointer", fontSize: 14 }}>
                  ✕
                </button>
              </DialogPrimitive.Close>
            </div>

            {confirmDraft ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="confirm-grid">
                  <div>
                    <div className="form-label">Tipo</div>
                    <select className="form-input" value={confirmDraft.type} onChange={(e) => setConfirmDraft((p) => (p ? { ...p, type: e.target.value as any } : p))}>
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                  </div>
                  <div>
                    <div className="form-label">Valor</div>
                    <input className="form-input" value={confirmDraft.amount} onChange={(e) => setConfirmDraft((p) => (p ? { ...p, amount: e.target.value } : p))} placeholder="0,00" />
                    {confirmErrors.amount ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>{confirmErrors.amount}</div> : null}
                  </div>
                </div>

                <div>
                  <div className="form-label">Descrição</div>
                  <input className="form-input" value={confirmDraft.description} onChange={(e) => setConfirmDraft((p) => (p ? { ...p, description: e.target.value } : p))} placeholder="Ex: iFood, Mercado…" />
                  {confirmErrors.description ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>{confirmErrors.description}</div> : null}
                </div>

                <div className="confirm-grid">
                  <div>
                    <div className="form-label">Data</div>
                    <input className="form-input" type="date" value={confirmDraft.dateISO} onChange={(e) => setConfirmDraft((p) => (p ? { ...p, dateISO: e.target.value } : p))} />
                    {confirmErrors.date ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>{confirmErrors.date}</div> : null}
                  </div>
                  <div>
                    <div className="form-label">Pagamento (opcional)</div>
                    <select className="form-input" value={confirmDraft.metodo} onChange={(e) => setConfirmDraft((p) => (p ? { ...p, metodo: e.target.value as any } : p))}>
                      {methodOptions().map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="form-label">Categoria</div>
                  <select className="form-input" value={confirmDraft.categoriaId} onChange={(e) => setConfirmDraft((p) => (p ? { ...p, categoriaId: e.target.value } : p))}>
                    <option value="">{confirmDraft.suggestedCategoriaName ? `Sugestão: ${confirmDraft.suggestedCategoriaName}` : "Selecione..."}</option>
                    {cats
                      .filter((c) => c.tipo === confirmDraft.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </select>
                  {confirmErrors.categoria ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>{confirmErrors.categoria}</div> : null}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <DialogPrimitive.Close asChild>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }}>
                      Cancelar
                    </button>
                  </DialogPrimitive.Close>
                  <button type="button" className="btn btn-primary" disabled={submitting} onClick={submitConfirmed} style={{ flex: 1, opacity: submitting ? 0.7 : 1 }}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {submitting ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
