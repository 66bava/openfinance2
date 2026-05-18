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
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--of-border)", borderRadius: 8,
    background: "var(--of-page-bg)", color: "var(--of-text)",
    fontSize: 13, outline: "none", boxSizing: "border-box",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "var(--of-text-secondary)", marginBottom: 4, display: "block",
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--of-surface)", borderRadius: 16,
          border: "1px solid var(--of-border)", width: "100%", maxWidth: 480,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: "1px solid var(--of-border-light)",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--of-text)" }}>{t("subModalTituloNova")}</h2>
            <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
              {t("subModalSubtitulo")}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--of-text-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>{t("subCampoNomeLabel")}</label>
            <input
              style={inputStyle}
              placeholder={t("subCampoNomePlaceholder")}
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("subCampoValorLabel")}</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0.01"
                placeholder={t("subCampoValorPlaceholder")}
                value={form.valor}
                onChange={(e) => setField("valor", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("subCampoRecorrenciaLabel")}</label>
              <select style={inputStyle} value={form.recorrencia} onChange={(e) => setField("recorrencia", e.target.value as RecorrenciaAssinatura)}>
                {Object.entries(RECORRENCIA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{t(v)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("subCampoCategoriaLabel")}</label>
              <select style={inputStyle} value={form.categoria} onChange={(e) => setField("categoria", e.target.value as CategoriaAssinaturaCode)}>
                {CATEGORIAS_ASSINATURA.map((c) => <option key={c} value={c}>{t(CATEGORIA_ASSINATURA_LABEL[c])}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
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

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
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
            <div style={{ flex: 1 }}>
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
                ].map((m) => (
                  <option key={m.v} value={m.v}>{m.l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Dia de cobrança</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={31}
              value={form.dia_cobranca}
              onChange={(e) => setField("dia_cobranca", Math.max(1, Math.min(31, Number.parseInt(e.target.value || "1", 10) || 1)) as any)}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("subCampoEmojiLabel")}</label>
              <input
                style={inputStyle}
                placeholder={t("subCampoEmojiPlaceholder")}
                maxLength={4}
                value={form.icone}
                onChange={(e) => setField("icone", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("subCampoCorLabel")}</label>
              <input
                style={{ ...inputStyle, padding: "6px 12px" }}
                type="color"
                value={form.cor}
                onChange={(e) => setField("cor", e.target.value)}
              />
            </div>
          </div>

          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.renovacao_automatica}
                onChange={(e) => setField("renovacao_automatica", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#16A34A" }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{t("subCampoRenovacaoTitulo")}</p>
                <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{t("subCampoRenovacaoDesc")}</p>
              </div>
            </label>
          </div>

          <div>
            <label style={labelStyle}>{t("subCampoObsLabel")}</label>
            <textarea
              style={{ ...inputStyle, minHeight: 56, resize: "vertical" } as React.CSSProperties}
              placeholder={t("subCampoObsPlaceholder")}
              value={form.observacoes}
              onChange={(e) => setField("observacoes", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "11px", borderRadius: 10,
                border: "1px solid var(--of-border)", background: "transparent",
                color: "var(--of-text)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {t("commonCancelar")}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: "11px", borderRadius: 10,
                border: "none", background: "#16A34A",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t("commonSalvando") : t("subModalSalvar")}
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
  totalMensal,
  onDelete,
}: {
  assinatura: Assinatura
  totalMensal: number
  onDelete: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  const fmt = (v: number) => formatCurrency(v, lang)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pct = totalMensal > 0 ? (assinatura.valor / totalMensal) * 100 : 0
  const cor = assinatura.cor || "#16A34A"

  const proxPag = assinatura.proximo_pagamento
    ? new Date(assinatura.proximo_pagamento + "T00:00")
    : null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diasAteVenc = proxPag ? Math.ceil((proxPag.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div style={{
      background: "var(--of-surface)", border: "1px solid var(--of-border)",
      borderRadius: 12, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 14,
      transition: "box-shadow 0.2s",
    }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: cor + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        {assinatura.icone || "💳"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>{assinatura.nome}</p>
          {assinatura.categoria && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
              background: "var(--of-page-bg)", color: "var(--of-text-muted)",
              border: "1px solid var(--of-border)",
            }}>{categoriaLabel(assinatura.categoria, t)}</span>
          )}
          {!assinatura.renovacao_automatica && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
              background: "#FEF3C7", color: "#92400E",
            }}>{t("subBadgeManual")}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
          {t(RECORRENCIA_LABEL[assinatura.recorrencia])}
          {diasAteVenc !== null && (
            <span style={{
              marginLeft: 8, fontWeight: 600,
              color: diasAteVenc <= 3 ? "#DC2626" : diasAteVenc <= 7 ? "#D97706" : "var(--of-text-muted)",
            }}>
              · {diasAteVenc === 0 ? t("subVenceHoje") : diasAteVenc < 0 ? t("subVencida") : `${diasAteVenc}${t("commonDiaAbrev")}`}
            </span>
          )}
        </p>
        <div style={{ marginTop: 6, height: 3, background: "var(--of-border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: cor, borderRadius: 2, transition: "width 0.6s ease" }} />
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--of-text)" }}>{fmt(assinatura.valor)}</p>
        <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{t(RECORRENCIA_LABEL[assinatura.recorrencia]).toLowerCase()}</p>
      </div>

      <div style={{ flexShrink: 0 }}>
        {confirmDelete ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              onClick={() => onDelete(assinatura.id)}
              style={{ padding: "4px 8px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              {t("commonSim")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ padding: "4px 8px", background: "var(--of-page-bg)", border: "1px solid var(--of-border)", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "var(--of-text)" }}
            >
              {t("commonNao")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--of-text-muted)", opacity: 0.5, transition: "opacity 0.15s" }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#DC2626" }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = "var(--of-text-muted)" }}
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
              background: "#FEF3C7", border: "1px solid #FDE68A",
              borderRadius: 12, padding: "14px 16px", marginBottom: 20,
            }}>
              <Bell size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>
                  {vencendo.length} {vencendo.length > 1 ? t("subCobrancaPlural") : t("subCobrancaSingular")} {t("subNosProximos7d")}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {vencendo.map((a) => {
                    const d = new Date(a.proximo_pagamento! + "T00:00")
                    const hoje = new Date()
                    hoje.setHours(0, 0, 0, 0)
                    const dias = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <span key={a.id} style={{ fontSize: 12, color: "#78350F" }}>
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
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            }}>
              <AlertCircle size={18} color="#EF4444" />
              <p style={{ fontSize: 13, color: "#991B1B" }}>
                {t("subInsightCustoAlto1")} <strong>{fmt(totalMensal)}{t("commonPorMes")}</strong>{" "}
                {t("subInsightCustoAlto2")} ({fmt(totalAnual)}{t("commonPorAno")}).{" "}
                {t("subInsightCustoAlto3")}
              </p>
            </div>
          )}

          {/* Lista de assinaturas */}
          <div style={{
            background: "var(--of-surface)", borderRadius: 16,
            border: "1px solid var(--of-border)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)" }}>
                {t("subAtivasTitulo")} ({assinaturas.length})
              </h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#EF4444" }}>{fmt(totalMensal)}{t("commonPorMes")}</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {assinaturas.map((a) => (
                <AssinaturaCard
                  key={a.id}
                  assinatura={a}
                  totalMensal={totalMensal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
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
