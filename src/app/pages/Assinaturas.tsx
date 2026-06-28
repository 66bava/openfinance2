import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../lib/auth-context"
import { useLanguage } from "../../lib/language-context"
import {
  CreditCard, Plus, Trash2, AlertCircle, X, Bell, TrendingDown, Repeat,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAssinaturas, criarAssinatura, removerAssinatura,
  calcularTotalMensal, calcularTotalAnual,
} from "../../lib/queries/assinaturas"
import { getCategoriasAtivas } from "../../lib/queries/categorias"
import type { Assinatura, RecorrenciaAssinatura, MetodoPagamento, Categoria } from "../../lib/types"
import { formatCurrency, formatDate } from "../../lib/format"
import type { TranslationKey } from "../../lib/i18n"

// ─── Serviços populares ───────────────────────────────────────────────────────

type CategoriaAssinaturaCode =
  | "streaming"
  | "musica"
  | "jogos"
  | "produtividade"
  | "ia"
  | "armazenamento"
  | "fitness"
  | "educacao"
  | "noticias"
  | "outros"

const CATEGORIA_ASSINATURA_LABEL: Record<CategoriaAssinaturaCode, TranslationKey> = {
  streaming: "subCatStreaming",
  musica: "subCatMusica",
  jogos: "subCatJogos",
  produtividade: "subCatProdutividade",
  ia: "subCatIA",
  armazenamento: "subCatArmazenamento",
  fitness: "subCatFitness",
  educacao: "subCatEducacao",
  noticias: "subCatNoticias",
  outros: "subCatOutros",
}

function normalizeCategoriaAssinatura(raw: string | null | undefined): CategoriaAssinaturaCode | null {
  const s = (raw || "").toString().trim().toLowerCase()
  const map: Record<string, CategoriaAssinaturaCode> = {
    streaming: "streaming",
    "música": "musica",
    musica: "musica",
    "vídeo": "streaming",
    video: "streaming",
    jogos: "jogos",
    produtividade: "produtividade",
    ia: "ia",
    armazenamento: "armazenamento",
    fitness: "fitness",
    "educação": "educacao",
    educacao: "educacao",
    "notícias": "noticias",
    noticias: "noticias",
    outros: "outros",
  }
  return map[s] ?? null
}

function categoriaLabel(raw: string | null | undefined, t: (k: TranslationKey) => string) {
  const code = normalizeCategoriaAssinatura(raw)
  return code ? t(CATEGORIA_ASSINATURA_LABEL[code]) : (raw || t("commonVazio"))
}

const SERVICOS_POPULARES = [
  { nome: "Netflix", valor: 55.9, icone: "🎬", cor: "#E50914", categoria: "streaming" as const },
  { nome: "Spotify", valor: 21.9, icone: "🎵", cor: "#1DB954", categoria: "musica" as const },
  { nome: "Amazon Prime", valor: 19.9, icone: "📦", cor: "#FF9900", categoria: "streaming" as const },
  { nome: "Disney+", valor: 43.9, icone: "✨", cor: "#113CCF", categoria: "streaming" as const },
  { nome: "YouTube Premium", valor: 27.9, icone: "▶️", cor: "#FF0000", categoria: "streaming" as const },
  { nome: "ChatGPT Plus", valor: 100, icone: "🤖", cor: "#10A37F", categoria: "ia" as const },
  { nome: "Claude Pro", valor: 100, icone: "🧠", cor: "#D97706", categoria: "ia" as const },
  { nome: "Apple Music", valor: 21.9, icone: "🍎", cor: "#FC3C44", categoria: "musica" as const },
  { nome: "Xbox Game Pass", valor: 44.99, icone: "🎮", cor: "#107C10", categoria: "jogos" as const },
  { nome: "iCloud+", valor: 9.9, icone: "☁️", cor: "#3478F6", categoria: "armazenamento" as const },
  { nome: "Google One", valor: 6.99, icone: "🌐", cor: "#4285F4", categoria: "armazenamento" as const },
  { nome: "HBO Max", valor: 34.9, icone: "🎭", cor: "#6A0DAD", categoria: "streaming" as const },
]

const CATEGORIAS_ASSINATURA: CategoriaAssinaturaCode[] = [
  "streaming",
  "musica",
  "jogos",
  "produtividade",
  "ia",
  "armazenamento",
  "fitness",
  "educacao",
  "noticias",
  "outros",
]

const RECORRENCIA_LABEL: Record<RecorrenciaAssinatura, TranslationKey> = {
  semanal: "subRecorrenciaSemanal",
  quinzenal: "subRecorrenciaQuinzenal",
  mensal: "subRecorrenciaMensal",
  bimestral: "subRecorrenciaBimestral",
  trimestral: "subRecorrenciaTrimestral",
  semestral: "subRecorrenciaSemestral",
  anual: "subRecorrenciaAnual",
}

// ─── Modal de Nova Assinatura ─────────────────────────────────────────────────

interface ModalAssinaturaProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
  prefill?: Partial<typeof EMPTY_FORM>
  categoriasDespesa: Categoria[]
}

const EMPTY_FORM = {
  nome: "",
  valor: "",
  recorrencia: "mensal" as RecorrenciaAssinatura,
  categoria: "outros" as CategoriaAssinaturaCode,
  categoria_financeira_id: "",
  metodo_pagamento: "" as "" | MetodoPagamento,
  dia_cobranca: 10,
  proximo_pagamento: "",
  renovacao_automatica: true,
  icone: "",
  cor: "#16A34A",
  observacoes: "",
}

function ModalAssinatura({ open, onClose, onSuccess, userId, prefill, categoriasDespesa }: ModalAssinaturaProps) {
  const { t, lang } = useLanguage()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...prefill })
    }
  }, [open, prefill])

  function setField<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(form.valor.replace(",", "."))
    if (!form.nome.trim() || isNaN(valor) || valor <= 0) {
      toast.error(t("subErroNomeValor"))
      return
    }
    setLoading(true)
    try {
      await criarAssinatura(userId, {
        nome: form.nome.trim(),
        valor,
        recorrencia: form.recorrencia,
        categoria: form.categoria || null,
        proximo_pagamento: form.proximo_pagamento || null,
        categoria_financeira_id: form.categoria_financeira_id || null,
        metodo_pagamento: form.metodo_pagamento || null,
        dia_cobranca: form.dia_cobranca ? Math.max(1, Math.min(31, Number(form.dia_cobranca))) : null,
        renovacao_automatica: form.renovacao_automatica,
        ativo: true,
        icone: form.icone || null,
        cor: form.cor || "#16A34A",
        observacoes: form.observacoes || null,
      })
      toast.success(t("subToastCriada"))
      onSuccess()
      onClose()
    } catch {
      toast.error(t("subToastErroSalvar"))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    transition: "border-color 0.15s",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#AAAA9E",
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    color: "#555",
    marginBottom: 8,
    letterSpacing: "0.04em",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: "#0C0C0C",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 -4px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-1" style={{ color: "#444" }}>Nova assinatura</p>
            <h2 className="text-[17px] font-semibold" style={{ color: "#EEEDE6" }}>{t("subModalTituloNova")}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#555" }}
            onMouseOver={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
            onMouseOut={(e) => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "transparent" }}
          >
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 flex flex-col gap-4 max-h-[72vh] overflow-y-auto"
        >
          {/* Name */}
          <div>
            <label style={labelStyle}>{t("subCampoNomeLabel")}</label>
            <input
              style={{ ...inputStyle, fontWeight: 600, color: "#EEEDE6", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
              placeholder={t("subCampoNomePlaceholder")}
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
            />
          </div>

          {/* Value + Recurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{t("subCampoValorLabel")}</label>
              <input
                style={{ ...inputStyle, fontWeight: 700, fontSize: 15, color: "#EEEDE6", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                type="number"
                step="0.01"
                min="0.01"
                placeholder={t("subCampoValorPlaceholder")}
                value={form.valor}
                onChange={(e) => setField("valor", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("subCampoRecorrenciaLabel")}</label>
              <select
                style={inputStyle}
                value={form.recorrencia}
                onChange={(e) => setField("recorrencia", e.target.value as RecorrenciaAssinatura)}
              >
                {Object.entries(RECORRENCIA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{t(v)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category + Next payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{t("subCampoCategoriaLabel")}</label>
              <select
                style={inputStyle}
                value={form.categoria}
                onChange={(e) => setField("categoria", e.target.value as CategoriaAssinaturaCode)}
              >
                {CATEGORIAS_ASSINATURA.map((c) => (
                  <option key={c} value={c}>{t(CATEGORIA_ASSINATURA_LABEL[c])}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("subCampoProximoPagamentoLabel")}</label>
              <input
                style={inputStyle}
                type="date"
                value={form.proximo_pagamento}
                onChange={(e) => {
                  const v = e.target.value
                  setField("proximo_pagamento", v)
                  const day = v && v.length >= 10 ? Number.parseInt(v.slice(8, 10), 10) : NaN
                  if (Number.isFinite(day)) setField("dia_cobranca", Math.max(1, Math.min(31, day)))
                }}
              />
            </div>
          </div>

          {/* Expense category + Payment method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Categoria da despesa</label>
              <select
                style={inputStyle}
                value={form.categoria_financeira_id}
                onChange={(e) => setField("categoria_financeira_id", e.target.value)}
              >
                <option value="">Selecione...</option>
                {categoriasDespesa.map((c) => (
                  <option key={c.id} value={c.id}>{c.icone ? `${c.icone} ` : ""}{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Forma de pagamento</label>
              <select
                style={inputStyle}
                value={form.metodo_pagamento}
                onChange={(e) => setField("metodo_pagamento", e.target.value as any)}
              >
                <option value="">Selecione...</option>
                {[
                  { v: "pix", l: "Pix" },
                  { v: "credito", l: "Cartão de crédito" },
                  { v: "debito", l: "Cartão de débito" },
                  { v: "dinheiro", l: "Dinheiro" },
                  { v: "boleto", l: "Boleto" },
                  { v: "transferencia", l: "Transferência" },
                  { v: "debito_automatico", l: "Débito automático" },
                  { v: "outro", l: "Outro" },
                ].map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
          </div>

          {/* Billing day + Emoji + Color */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>Dia de cobrança</label>
              <input
                style={inputStyle}
                type="number"
                min={1}
                max={31}
                value={form.dia_cobranca}
                onChange={(e) =>
                  setField("dia_cobranca", Math.max(1, Math.min(31, Number.parseInt(e.target.value || "1", 10) || 1)) as any)
                }
              />
            </div>
            <div>
              <label style={labelStyle}>{t("subCampoEmojiLabel")}</label>
              <input
                style={{ ...inputStyle, textAlign: "center", fontSize: 18 }}
                placeholder="🎵"
                maxLength={4}
                value={form.icone}
                onChange={(e) => setField("icone", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("subCampoCorLabel")}</label>
              <input
                style={{ ...inputStyle, padding: "6px 8px", height: 42, cursor: "pointer" }}
                type="color"
                value={form.cor}
                onChange={(e) => setField("cor", e.target.value)}
              />
            </div>
          </div>

          {/* Auto-renewal */}
          <label
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <input
              type="checkbox"
              checked={form.renovacao_automatica}
              onChange={(e) => setField("renovacao_automatica", e.target.checked)}
              className="w-4 h-4 accent-[#16A34A] rounded shrink-0"
            />
            <div>
              <p className="text-sm font-medium" style={{ color: "#AAAA9E" }}>{t("subCampoRenovacaoTitulo")}</p>
              <p className="text-xs mt-0.5" style={{ color: "#555" }}>{t("subCampoRenovacaoDesc")}</p>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label style={labelStyle}>
              {t("subCampoObsLabel")} <span style={{ color: "#383838" }}>(opcional)</span>
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "none" as const }}
              placeholder={t("subCampoObsPlaceholder")}
              value={form.observacoes}
              onChange={(e) => setField("observacoes", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 pb-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-25 flex items-center justify-center gap-2"
              style={{ background: "#16A34A" }}
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              {loading ? t("commonSalvando") : t("subModalSalvar")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-sm transition-colors"
              style={{ color: "#444" }}
            >
              {t("commonCancelar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Card de Assinatura ───────────────────────────────────────────────────────

function AssinaturaCard({
  assinatura,
  onDelete,
}: {
  assinatura: Assinatura
  totalMensal?: number
  onDelete: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  const fmt = (v: number) => formatCurrency(v, lang)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cor = assinatura.cor || "#16A34A"

  const proxPag = assinatura.proximo_pagamento
    ? new Date(assinatura.proximo_pagamento + "T00:00")
    : null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diasAteVenc = proxPag ? Math.ceil((proxPag.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : null

  const dueText =
    diasAteVenc === null
      ? null
      : diasAteVenc === 0
        ? t("subVenceHoje")
        : diasAteVenc < 0
          ? t("subVencida")
          : `Vence em ${diasAteVenc}${t("commonDiaAbrev")}`

  const dueStyle: React.CSSProperties =
    diasAteVenc === null
      ? { color: "var(--of-text-muted)" }
      : diasAteVenc <= 3
        ? { color: "#EF4444", fontWeight: 600 }
        : diasAteVenc <= 7
          ? { color: "#F59E0B", fontWeight: 600 }
          : { color: "var(--of-text-muted)" }

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 group hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors"
      style={{ borderTop: "1px solid var(--of-border)" }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: cor + "1A" }}
      >
        {assinatura.icone || "💳"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-semibold text-[var(--of-text)] truncate">{assinatura.nome}</p>
          {assinatura.categoria && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
              style={{
                background: cor + "15",
                color: cor,
              }}
            >
              {categoriaLabel(assinatura.categoria, t)}
            </span>
          )}
          {!assinatura.renovacao_automatica && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
              style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
            >
              {t("subBadgeManual")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: "var(--of-text-muted)" }}>{t(RECORRENCIA_LABEL[assinatura.recorrencia])}</span>
          {dueText && (
            <>
              <span style={{ color: "var(--of-border)" }}>·</span>
              <span style={dueStyle}>{dueText}</span>
            </>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0">
        <p className="text-base font-bold tabular-nums" style={{ color: "var(--of-text)" }}>{fmt(assinatura.valor)}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--of-text-muted)" }}>
          {t(RECORRENCIA_LABEL[assinatura.recorrencia]).toLowerCase()}
        </p>
      </div>

      {/* Delete */}
      <div className="shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onDelete(assinatura.id)}
              className="px-2.5 py-1 text-white text-xs font-bold rounded-lg transition-colors"
              style={{ background: "#EF4444" }}
            >
              {t("commonSim")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 text-xs rounded-lg transition-colors"
              style={{
                border: "1px solid var(--of-border)",
                color: "var(--of-text)",
                background: "transparent",
              }}
            >
              {t("commonNao")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            style={{ color: "var(--of-text-muted)" }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "#EF4444"
              e.currentTarget.style.background = "rgba(239,68,68,0.08)"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "var(--of-text-muted)"
              e.currentTarget.style.background = "transparent"
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Assinaturas() {
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const userId = user!.id

  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [prefill, setPrefill] = useState<Partial<typeof EMPTY_FORM>>({})

  const fmt = (v: number) => formatCurrency(v, lang)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, categorias] = await Promise.all([
        getAssinaturas(userId),
        getCategoriasAtivas(userId),
      ])
      setAssinaturas(data)
      setCats(categorias)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    try {
      await removerAssinatura(id, userId)
      setAssinaturas((prev) => prev.filter((a) => a.id !== id))
      toast.success(t("subToastRemovida"))
    } catch {
      toast.error(t("commonErroAoRemover"))
    }
  }

  function quickAdd(servico: (typeof SERVICOS_POPULARES)[0]) {
    setPrefill({
      nome: servico.nome,
      valor: String(servico.valor),
      categoria: servico.categoria,
      icone: servico.icone,
      cor: servico.cor,
      recorrencia: "mensal",
      renovacao_automatica: true,
    })
    setModalOpen(true)
  }

  const totalMensal = calcularTotalMensal(assinaturas)
  const totalAnual = calcularTotalAnual(assinaturas)
  const vencendo = assinaturas.filter((a) => {
    if (!a.proximo_pagamento) return false
    const d = new Date(a.proximo_pagamento + "T00:00")
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7
  })

  if (loading) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 28, height: 28,
          border: "2.5px solid #16A34A",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
      </div>
    )
  }

  return (
    <div style={{ padding: "20px 20px 32px", maxWidth: 1440, margin: "0 auto", fontFamily: "var(--font-body)" }}
      className="lg:p-8">

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {t("subTitulo")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>
            {t("subSubtitulo")}
          </p>
        </div>
        <button
          onClick={() => { setPrefill({}); setModalOpen(true) }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 10,
            background: "#16A34A", color: "#fff",
            border: "none", fontSize: 13, fontWeight: 700,
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#15803D")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#16A34A")}
        >
          <Plus size={15} />
          {t("subNova")}
        </button>
      </div>

      {assinaturas.length === 0 ? (
        /* Empty state */
        <div>
          <div style={{
            background: "var(--of-surface)", border: "2px dashed var(--of-border)",
            borderRadius: 20, padding: "48px 24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", marginBottom: 24,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Repeat size={28} color="#D97706" strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text)", marginBottom: 8 }}>
                {t("subVazioTitulo")}
              </h3>
              <p style={{ fontSize: 14, color: "var(--of-text-muted)", maxWidth: 380, lineHeight: 1.6 }}>
                {t("subVazioDesc")}
              </p>
            </div>
          </div>

          {/* Quick add popular */}
          <div style={{
            background: "var(--of-surface)", borderRadius: 16,
            border: "1px solid var(--of-border)", padding: "20px",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)", marginBottom: 4 }}>
              {t("subServicosPopularesTitulo")}
            </h3>
            <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginBottom: 16 }}>
              {t("subServicosPopularesDesc")}
            </p>
            <div style={{ display: "grid", gap: 10 }} className="grid grid-cols-2 lg:grid-cols-3">
              {SERVICOS_POPULARES.map((s) => (
                <button
                  key={s.nome}
                  onClick={() => quickAdd(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 10,
                    border: "1px solid var(--of-border)",
                    background: "var(--of-page-bg)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = s.cor; e.currentTarget.style.background = s.cor + "10" }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--of-border)"; e.currentTarget.style.background = "var(--of-page-bg)" }}
                >
                  <span style={{ fontSize: 22 }}>{s.icone}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{s.nome}</p>
                    <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{fmt(s.valor)}{t("commonPorMes")}</p>
                  </div>
                  <Plus size={14} style={{ marginLeft: "auto", color: "var(--of-text-muted)" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }} className="grid grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: t("subCardTotalMensal"),
                value: fmt(totalMensal),
                sub: `${assinaturas.length} ${assinaturas.length === 1 ? t("subAssinaturaSingular") : t("subAssinaturaPlural")}`,
                icon: CreditCard, iconBg: "#FEE2E2", iconColor: "#EF4444",
              },
              {
                label: t("subCardGastoAnual"),
                value: fmt(totalAnual),
                sub: t("subCardProjecao12m"),
                icon: TrendingDown, iconBg: "#FEF3C7", iconColor: "#D97706",
              },
              {
                label: t("subCardProximasCobrancas"),
                value: `${vencendo.length}`,
                sub: vencendo.length > 0 ? t("subCardNosProximos7d") : t("subCardNadaProximos7d"),
                icon: Bell, iconBg: vencendo.length > 0 ? "#FEE2E2" : "var(--of-page-bg)", iconColor: vencendo.length > 0 ? "#EF4444" : "var(--of-text-secondary)",
              },
              {
                label: t("subCardRenovacaoAuto"),
                value: `${assinaturas.filter((a) => a.renovacao_automatica).length}`,
                sub: `${t("commonDe")} ${assinaturas.length} ${assinaturas.length === 1 ? t("subAssinaturaSingular") : t("subAssinaturaPlural")}`,
                icon: Repeat, iconBg: "#DBEAFE", iconColor: "#2563EB",
              },
            ].map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
              <div
                key={label}
                style={{
                  background: "var(--of-surface)", borderRadius: 16,
                  border: "1px solid var(--of-border)", padding: "18px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={17} color={iconColor} strokeWidth={2} />
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</p>
                <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Alerta cobranças próximas */}
          {vencendo.length > 0 && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)",
              borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            }}>
              <Bell size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B", marginBottom: 4 }}>
                  {vencendo.length} {vencendo.length > 1 ? t("subCobrancaPlural") : t("subCobrancaSingular")} {t("subNosProximos7d")}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {vencendo.map((a) => {
                    const d = new Date(a.proximo_pagamento! + "T00:00")
                    const hoje = new Date()
                    hoje.setHours(0, 0, 0, 0)
                    const dias = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <span key={a.id} style={{ fontSize: 12, color: "var(--of-text-secondary)" }}>
                        {a.icone || "💳"} {a.nome} ({fmt(a.valor)}) — {dias === 0 ? t("commonHoje") : `${t("commonEm")} ${dias}${t("commonDiaAbrev")}`}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Insight: custo alto */}
          {totalMensal > 200 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 16,
            }}>
              <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "var(--of-text-secondary)" }}>
                {t("subInsightCustoAlto1")} <strong style={{ color: "#EF4444" }}>{fmt(totalMensal)}{t("commonPorMes")}</strong>{" "}
                {t("subInsightCustoAlto2")} ({fmt(totalAnual)}{t("commonPorAno")}).{" "}
                {t("subInsightCustoAlto3")}
              </p>
            </div>
          )}

          {/* Lista de assinaturas */}
          <div style={{
            background: "var(--of-surface)", borderRadius: 16,
            border: "1px solid var(--of-border)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--of-border)",
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>
                {t("subAtivasTitulo")} · {assinaturas.length}
              </h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#EF4444" }}>{fmt(totalMensal)}{t("commonPorMes")}</span>
            </div>
            {assinaturas.map((a) => (
              <AssinaturaCard
                key={a.id}
                assinatura={a}
                totalMensal={totalMensal}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Quick add section */}
          <div style={{
            marginTop: 20, background: "var(--of-surface)", borderRadius: 16,
            border: "1px solid var(--of-border)", padding: "20px",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)", marginBottom: 12 }}>
              {t("subAdicionarPopularTitulo")}
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {SERVICOS_POPULARES.filter((s) => !assinaturas.some((a) => a.nome === s.nome)).map((s) => (
                <button
                  key={s.nome}
                  onClick={() => quickAdd(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 20,
                    border: "1px solid var(--of-border)",
                    background: "var(--of-page-bg)",
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                    color: "var(--of-text-secondary)", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = s.cor; e.currentTarget.style.color = s.cor }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--of-border)"; e.currentTarget.style.color = "var(--of-text-secondary)" }}
                >
                  {s.icone} {s.nome} <Plus size={11} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <ModalAssinatura
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        userId={userId}
        prefill={prefill}
        categoriasDespesa={cats.filter((c) => c.tipo === "despesa")}
      />
    </div>
  )
}
