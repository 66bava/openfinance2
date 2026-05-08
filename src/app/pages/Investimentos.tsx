import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../lib/auth-context"
import { useLanguage } from "../../lib/language-context"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import {
  TrendingUp, Plus, Trash2, BarChart2, Target, Repeat,
  Building2, AlertCircle, ChevronDown, ChevronUp, X,
} from "lucide-react"
import { toast } from "sonner"
import {
  getInvestimentos, criarInvestimento, removerInvestimento,
  calcularPatrimonioEstimado, calcularRentabilidadeEstimada,
} from "../../lib/queries/investimentos"
import type { Investimento, CategoriaInvestimento, RiscoInvestimento, LiquidezInvestimento } from "../../lib/types"
import { formatCurrency, formatDate } from "../../lib/format"
import type { TranslationKey } from "../../lib/i18n"

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`

// ─── Constants ───────────────────────────────────────────────────────────────

type InvestimentoTipoCode =
  | "poupanca"
  | "cdb"
  | "lci"
  | "lca"
  | "tesouro_direto"
  | "debentures"
  | "cdi"
  | "acoes"
  | "etfs"
  | "fiis"
  | "bdrs"
  | "criptomoedas"
  | "fundo_multimercado"
  | "fundo_acoes"
  | "fundo_cambial"
  | "previdencia_privada"
  | "conta_remunerada"
  | "outros"

const INVESTIMENTO_TIPO_LABEL: Record<InvestimentoTipoCode, TranslationKey> = {
  poupanca: "invTipoPoupanca",
  cdb: "invTipoCDB",
  lci: "invTipoLCI",
  lca: "invTipoLCA",
  tesouro_direto: "invTipoTesouroDireto",
  debentures: "invTipoDebentures",
  cdi: "invTipoCDI",
  acoes: "invTipoAcoes",
  etfs: "invTipoETFs",
  fiis: "invTipoFIIs",
  bdrs: "invTipoBDRs",
  criptomoedas: "invTipoCriptomoedas",
  fundo_multimercado: "invTipoFundoMultimercado",
  fundo_acoes: "invTipoFundoAcoes",
  fundo_cambial: "invTipoFundoCambial",
  previdencia_privada: "invTipoPrevidenciaPrivada",
  conta_remunerada: "invTipoContaRemunerada",
  outros: "invTipoOutros",
}

const TIPOS_INVESTIMENTO: Record<
  CategoriaInvestimento,
  { labelKey: TranslationKey; tipos: InvestimentoTipoCode[]; defaultTipo: InvestimentoTipoCode }
> = {
  renda_fixa: {
    labelKey: "invCatRendaFixa",
    defaultTipo: "cdb",
    tipos: ["poupanca", "cdb", "lci", "lca", "tesouro_direto", "debentures", "cdi"],
  },
  renda_variavel: {
    labelKey: "invCatRendaVariavel",
    defaultTipo: "acoes",
    tipos: ["acoes", "etfs", "fiis", "bdrs", "criptomoedas"],
  },
  fundos: {
    labelKey: "invCatFundos",
    defaultTipo: "fundo_multimercado",
    tipos: ["fundo_multimercado", "fundo_acoes", "fundo_cambial"],
  },
  outros: {
    labelKey: "invCatOutros",
    defaultTipo: "outros",
    tipos: ["previdencia_privada", "conta_remunerada", "outros"],
  },
}

function normalizeTipoCode(raw: string): InvestimentoTipoCode | null {
  const s = (raw || "").toString().trim().toLowerCase()
  const map: Record<string, InvestimentoTipoCode> = {
    "poupança": "poupanca",
    poupanca: "poupanca",
    cdb: "cdb",
    lci: "lci",
    lca: "lca",
    "tesouro direto": "tesouro_direto",
    tesouro_direto: "tesouro_direto",
    "debêntures": "debentures",
    debentures: "debentures",
    cdi: "cdi",
    "ações": "acoes",
    acoes: "acoes",
    etfs: "etfs",
    "fundos imobiliários (fiis)": "fiis",
    fiis: "fiis",
    bdrs: "bdrs",
    criptomoedas: "criptomoedas",
    "fundo multimercado": "fundo_multimercado",
    fundo_multimercado: "fundo_multimercado",
    "fundo de ações": "fundo_acoes",
    fundo_acoes: "fundo_acoes",
    "fundo cambial": "fundo_cambial",
    fundo_cambial: "fundo_cambial",
    "previdência privada": "previdencia_privada",
    previdencia_privada: "previdencia_privada",
    "conta remunerada": "conta_remunerada",
    conta_remunerada: "conta_remunerada",
    outros: "outros",
  }
  return map[s] ?? null
}

function tipoLabel(tipoRaw: string, t: (k: TranslationKey) => string): string {
  const code = normalizeTipoCode(tipoRaw)
  return code ? t(INVESTIMENTO_TIPO_LABEL[code]) : tipoRaw
}

const CORRETORAS = [
  "XP", "Rico", "Clear", "Inter", "Nubank", "BTG", "C6",
  "Toro", "Avenue", "Binance", "Mercado Bitcoin",
  "Itaú", "Bradesco", "Santander", "Caixa", "Banco do Brasil", "Outros",
]

const CAT_COLORS: Record<CategoriaInvestimento, string> = {
  renda_fixa: "#16A34A",
  renda_variavel: "#3B82F6",
  fundos: "#8B5CF6",
  outros: "#F59E0B",
}

const RISCO_BADGE: Record<RiscoInvestimento, { labelKey: TranslationKey; bg: string; color: string }> = {
  baixo: { labelKey: "invRiscoBaixo", bg: "#DCFCE7", color: "#15803D" },
  moderado: { labelKey: "invRiscoModerado", bg: "#FEF3C7", color: "#92400E" },
  alto: { labelKey: "invRiscoAlto", bg: "#FEE2E2", color: "#991B1B" },
}

const LIQUIDEZ_LABEL: Record<LiquidezInvestimento, TranslationKey> = {
  diaria: "invLiquidezDiaria",
  curto: "invLiquidezCurto",
  media: "invLiquidezMedia",
  longo: "invLiquidezLongo",
}

// ─── Modal de Novo Investimento ───────────────────────────────────────────────

interface ModalInvestimentoProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
}

const EMPTY_FORM = {
  nome: "",
  categoria_investimento: "renda_fixa" as CategoriaInvestimento,
  tipo: "cdb" as InvestimentoTipoCode,
  corretora: "Nubank",
  corretora_personalizada: "",
  valor_aporte: "",
  aporte_recorrente: false,
  recorrencia: "mensal" as "semanal" | "quinzenal" | "mensal" | "anual",
  rentabilidade: "",
  rentabilidade_tipo: "percent" as "percent" | "reais",
  data_investimento: new Date().toISOString().split("T")[0],
  vencimento: "",
  observacoes: "",
  risco: "moderado" as RiscoInvestimento,
  liquidez: "media" as LiquidezInvestimento,
}

function ModalInvestimento({ open, onClose, onSuccess, userId }: ModalInvestimentoProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm(EMPTY_FORM)
  }, [open])

  function setField<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleCatChange(cat: CategoriaInvestimento) {
    const firstTipo = TIPOS_INVESTIMENTO[cat].tipos[0]
    setForm((f) => ({ ...f, categoria_investimento: cat, tipo: firstTipo }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(form.valor_aporte.replace(",", "."))
    if (!form.nome.trim() || isNaN(valor) || valor <= 0) {
      toast.error(t("invErroNomeValor"))
      return
    }
    setLoading(true)
    try {
      await criarInvestimento(userId, {
        nome: form.nome.trim(),
        tipo: form.tipo,
        categoria_investimento: form.categoria_investimento,
        corretora: form.corretora === "Outros" ? null : form.corretora,
        corretora_personalizada: form.corretora === "Outros" ? form.corretora_personalizada : null,
        valor_aporte: valor,
        aporte_recorrente: form.aporte_recorrente,
        recorrencia: form.aporte_recorrente ? form.recorrencia : null,
        rentabilidade: form.rentabilidade ? parseFloat(form.rentabilidade.replace(",", ".")) : null,
        rentabilidade_tipo: form.rentabilidade_tipo,
        data_investimento: form.data_investimento,
        vencimento: form.vencimento || null,
        observacoes: form.observacoes || null,
        risco: form.risco,
        liquidez: form.liquidez,
        ativo: true,
      })
      toast.success(t("invToastCriado"))
      onSuccess()
      onClose()
    } catch {
      toast.error(t("invToastErroSalvar"))
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
  const rowStyle: React.CSSProperties = { display: "flex", gap: 10 }

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
          border: "1px solid var(--of-border)", width: "100%", maxWidth: 520,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: "1px solid var(--of-border-light)",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--of-text)" }}>{t("invModalTituloNovo")}</h2>
            <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
              {t("invModalSubtitulo")}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--of-text-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>{t("invCampoNomeLabel")}</label>
            <input
              style={inputStyle}
              placeholder={t("invCampoNomePlaceholder")}
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
            />
          </div>

          {/* Categoria */}
          <div>
            <label style={labelStyle}>{t("invCampoCategoriaLabel")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {(Object.keys(TIPOS_INVESTIMENTO) as CategoriaInvestimento[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCatChange(cat)}
                  style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: "1.5px solid",
                    borderColor: form.categoria_investimento === cat ? CAT_COLORS[cat] : "var(--of-border)",
                    background: form.categoria_investimento === cat ? CAT_COLORS[cat] + "18" : "transparent",
                    color: form.categoria_investimento === cat ? CAT_COLORS[cat] : "var(--of-text-muted)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {t(TIPOS_INVESTIMENTO[cat].labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de ativo */}
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoTipoLabel")}</label>
              <select
                style={inputStyle}
                value={form.tipo}
                onChange={(e) => setField("tipo", e.target.value as InvestimentoTipoCode)}
              >
                {TIPOS_INVESTIMENTO[form.categoria_investimento].tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>{t(INVESTIMENTO_TIPO_LABEL[tipo])}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoCorretoraLabel")}</label>
              <select style={inputStyle} value={form.corretora} onChange={(e) => setField("corretora", e.target.value)}>
                {CORRETORAS.map((c) => <option key={c} value={c}>{c === "Outros" ? t("commonOutros") : c}</option>)}
              </select>
            </div>
          </div>

          {form.corretora === "Outros" && (
            <div>
              <label style={labelStyle}>{t("invCampoCorretoraNomeLabel")}</label>
              <input
                style={inputStyle}
                placeholder={t("invCampoCorretoraNomePlaceholder")}
                value={form.corretora_personalizada}
                onChange={(e) => setField("corretora_personalizada", e.target.value)}
              />
            </div>
          )}

          {/* Valor e Data */}
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoValorLabel")}</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0.01"
                placeholder={t("invCampoValorPlaceholder")}
                value={form.valor_aporte}
                onChange={(e) => setField("valor_aporte", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoDataLabel")}</label>
              <input
                style={inputStyle}
                type="date"
                value={form.data_investimento}
                onChange={(e) => setField("data_investimento", e.target.value)}
              />
            </div>
          </div>

          {/* Rentabilidade */}
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoRentabilidadeLabel")}</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                placeholder={t("invCampoRentabilidadePlaceholder")}
                value={form.rentabilidade}
                onChange={(e) => setField("rentabilidade", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoRentabilidadeTipoLabel")}</label>
              <select style={inputStyle} value={form.rentabilidade_tipo} onChange={(e) => setField("rentabilidade_tipo", e.target.value as "percent" | "reais")}>
                <option value="percent">{t("invRentTipoPercent")}</option>
                <option value="reais">{t("invRentTipoReais")}</option>
              </select>
            </div>
          </div>

          {/* Risco e Liquidez */}
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoRiscoLabel")}</label>
              <select style={inputStyle} value={form.risco} onChange={(e) => setField("risco", e.target.value as RiscoInvestimento)}>
                <option value="baixo">{t(RISCO_BADGE.baixo.labelKey)}</option>
                <option value="moderado">{t(RISCO_BADGE.moderado.labelKey)}</option>
                <option value="alto">{t(RISCO_BADGE.alto.labelKey)}</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("invCampoLiquidezLabel")}</label>
              <select style={inputStyle} value={form.liquidez} onChange={(e) => setField("liquidez", e.target.value as LiquidezInvestimento)}>
                <option value="diaria">{t(LIQUIDEZ_LABEL.diaria)}</option>
                <option value="curto">{t(LIQUIDEZ_LABEL.curto)}</option>
                <option value="media">{t(LIQUIDEZ_LABEL.media)}</option>
                <option value="longo">{t(LIQUIDEZ_LABEL.longo)}</option>
              </select>
            </div>
          </div>

          {/* Vencimento */}
          <div>
            <label style={labelStyle}>{t("invCampoVencimentoLabel")}</label>
            <input
              style={inputStyle}
              type="date"
              value={form.vencimento}
              onChange={(e) => setField("vencimento", e.target.value)}
            />
          </div>

          {/* Aporte Recorrente */}
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.aporte_recorrente}
                onChange={(e) => setField("aporte_recorrente", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#16A34A" }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{t("invCampoRecorrenteTitulo")}</p>
                <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{t("invCampoRecorrenteDesc")}</p>
              </div>
            </label>
            {form.aporte_recorrente && (
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>{t("invCampoRecorrenciaLabel")}</label>
                <select style={inputStyle} value={form.recorrencia} onChange={(e) => setField("recorrencia", e.target.value as typeof form.recorrencia)}>
                  <option value="semanal">{t("invRecorrenciaSemanal")}</option>
                  <option value="quinzenal">{t("invRecorrenciaQuinzenal")}</option>
                  <option value="mensal">{t("invRecorrenciaMensal")}</option>
                  <option value="anual">{t("invRecorrenciaAnual")}</option>
                </select>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label style={labelStyle}>{t("invCampoObsLabel")}</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" } as React.CSSProperties}
              placeholder={t("invCampoObsPlaceholder")}
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
                opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
              }}
            >
              {loading ? t("commonSalvando") : t("invModalSalvar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tooltip Chart ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  const { lang } = useLanguage()
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--of-surface)", border: "1px solid var(--of-border)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    }}>
      <p style={{ fontWeight: 600, color: "var(--of-text)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value, lang)}
        </p>
      ))}
    </div>
  )
}

// ─── Card de Investimento ─────────────────────────────────────────────────────

function InvestimentoCard({
  inv, onDelete,
}: {
  inv: Investimento
  onDelete: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const rentEst = calcularRentabilidadeEstimada(inv)
  const risco = RISCO_BADGE[inv.risco]
  const catColor = CAT_COLORS[inv.categoria_investimento]
  const corretora = inv.corretora === null ? inv.corretora_personalizada : inv.corretora

  return (
    <div style={{
      background: "var(--of-surface)", border: "1px solid var(--of-border)",
      borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.2s",
    }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 14 }}>
        {/* Categoria dot */}
        <div style={{
          width: 42, height: 42, borderRadius: 11,
          background: catColor + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <TrendingUp size={18} color={catColor} strokeWidth={2.2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>{inv.nome}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: risco.bg, color: risco.color,
            }}>{t(risco.labelKey)}</span>
            {inv.aporte_recorrente && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: "#EDE9FE", color: "#5B21B6",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <Repeat size={9} /> {t("invBadgeRecorrente")}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
            {tipoLabel(inv.tipo, t)} · {corretora || t("commonVazio")} · {t(LIQUIDEZ_LABEL[inv.liquidez])}
          </p>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--of-text)" }}>{formatCurrency(inv.valor_aporte, lang)}</p>
          {rentEst > 0 && (
            <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
              {inv.rentabilidade_tipo === "percent"
                ? fmtPct(inv.rentabilidade ?? 0) + ` ${t("invRentAoAno")}`
                : `${formatCurrency(rentEst, lang)} ${t("invRentEstimado")}`}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--of-text-muted)" }}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button
                onClick={() => onDelete(inv.id)}
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

      {expanded && (
        <div style={{
          padding: "12px 16px 14px",
          borderTop: "1px solid var(--of-border-light)",
          background: "var(--of-page-bg)",
          display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        }}>
          {[
            { label: t("invDetalheDataAporte"), value: formatDate(inv.data_investimento, lang) },
            { label: t("invDetalheVencimento"), value: inv.vencimento ? formatDate(inv.vencimento, lang) : t("invDetalheSemVencimento") },
            { label: t("invDetalheRentabilidade"), value: inv.rentabilidade ? (inv.rentabilidade_tipo === "percent" ? `${inv.rentabilidade}% ${t("invRentAoAno")}` : formatCurrency(inv.rentabilidade, lang)) : t("commonVazio") },
            { label: t("invDetalheGanhoEstimado"), value: rentEst > 0 ? formatCurrency(rentEst, lang) : t("commonVazio") },
            { label: t("invDetalheRecorrencia"), value: inv.aporte_recorrente ? (inv.recorrencia ? t(`invRecorrencia${inv.recorrencia.charAt(0).toUpperCase()}${inv.recorrencia.slice(1)}` as TranslationKey) : t("commonVazio")) : t("invRecorrenciaUnico") },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, color: "var(--of-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ fontSize: 13, color: "var(--of-text)", fontWeight: 500, marginTop: 2 }}>{value}</p>
            </div>
          ))}
          {inv.observacoes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: 10, color: "var(--of-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("invDetalheObs")}</p>
              <p style={{ fontSize: 13, color: "var(--of-text)", fontWeight: 400, marginTop: 2 }}>{inv.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Investimentos() {
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const userId = user!.id

  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterCat, setFilterCat] = useState<CategoriaInvestimento | "todos">("todos")

  const fmt = (v: number) => formatCurrency(v, lang)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getInvestimentos(userId)
    setInvestimentos(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    try {
      await removerInvestimento(id, userId)
      setInvestimentos((prev) => prev.filter((i) => i.id !== id))
      toast.success(t("invToastRemovido"))
    } catch {
      toast.error(t("commonErroAoRemover"))
    }
  }

  const totalInvestido = investimentos.reduce((a, i) => a + i.valor_aporte, 0)
  const patrimonioEstimado = calcularPatrimonioEstimado(investimentos)
  const rentabilidadeTotal = patrimonioEstimado - totalInvestido
  const ativos = investimentos.length
  const recorrentes = investimentos.filter((i) => i.aporte_recorrente).length

  // Distribution data for pie chart
  const distribuicao = (Object.keys(TIPOS_INVESTIMENTO) as CategoriaInvestimento[])
    .map((cat) => {
      const catInvs = investimentos.filter((i) => i.categoria_investimento === cat)
      const total = catInvs.reduce((a, i) => a + i.valor_aporte, 0)
      return { name: t(TIPOS_INVESTIMENTO[cat].labelKey), value: total, color: CAT_COLORS[cat], cat }
    })
    .filter((d) => d.value > 0)

  // Bar chart: top 5 investments by value
  const topInvs = [...investimentos]
    .sort((a, b) => b.valor_aporte - a.valor_aporte)
    .slice(0, 5)
    .map((i) => ({ name: i.nome.length > 14 ? i.nome.slice(0, 14) + "…" : i.nome, valor: i.valor_aporte, color: CAT_COLORS[i.categoria_investimento] }))

  const filtered = filterCat === "todos"
    ? investimentos
    : investimentos.filter((i) => i.categoria_investimento === filterCat)

  const melhorAtivo = investimentos.length > 0
    ? investimentos.reduce((best, i) => {
        const rent = calcularRentabilidadeEstimada(i)
        const bestRent = calcularRentabilidadeEstimada(best)
        return rent > bestRent ? i : best
      })
    : null

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
            {t("invTitulo")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>
            {t("invSubtitulo")}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
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
          {t("invNovo")}
        </button>
      </div>

      {investimentos.length === 0 ? (
        /* Empty state */
        <div style={{
          background: "var(--of-surface)", border: "2px dashed var(--of-border)",
          borderRadius: 20, padding: "60px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp size={28} color="#16A34A" strokeWidth={2} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text)", marginBottom: 8 }}>
              {t("invVazioTitulo")}
            </h3>
            <p style={{ fontSize: 14, color: "var(--of-text-muted)", maxWidth: 380, lineHeight: 1.6 }}>
              {t("invVazioDesc1")}{" "}
              <strong>{t("invVazioDescStrong")}</strong>{" "}
              {t("invVazioDesc2")}
            </p>
          </div>
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap" as const, justifyContent: "center", marginTop: 4,
          }}>
            {(["cdb", "tesouro_direto", "acoes", "fiis", "criptomoedas"] as InvestimentoTipoCode[]).map((tipo) => (
              <span key={tipo} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
                color: "var(--of-text-secondary)",
              }}>{t(INVESTIMENTO_TIPO_LABEL[tipo])}</span>
            ))}
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              marginTop: 8, padding: "12px 28px", borderRadius: 10,
              background: "#16A34A", color: "#fff",
              border: "none", fontSize: 14, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("invVazioCTA")}
          </button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }} className="grid grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: t("invCardTotalInvestido"),
                value: fmt(totalInvestido),
                sub: `${ativos} ${ativos === 1 ? t("invAtivoSingular") : t("invAtivoPlural")}`,
                icon: BarChart2, iconBg: "#DCFCE7", iconColor: "#16A34A",
              },
              {
                label: t("invCardPatrimonioEstimado"),
                value: fmt(patrimonioEstimado),
                sub: rentabilidadeTotal > 0 ? `+${fmt(rentabilidadeTotal)} ${t("invCardGanhos")}` : t("invCardSemRentabilidade"),
                icon: TrendingUp, iconBg: "#DBEAFE", iconColor: "#2563EB",
              },
              {
                label: t("invCardMelhorAtivo"),
                value: melhorAtivo ? melhorAtivo.nome.length > 14 ? melhorAtivo.nome.slice(0, 14) + "…" : melhorAtivo.nome : t("commonVazio"),
                sub: melhorAtivo && melhorAtivo.rentabilidade ? (melhorAtivo.rentabilidade_tipo === "percent" ? `${melhorAtivo.rentabilidade}% ${t("invRentAoAno")}` : fmt(calcularRentabilidadeEstimada(melhorAtivo))) : t("commonVazio"),
                icon: Target, iconBg: "#F3E8FF", iconColor: "#7C3AED",
              },
              {
                label: t("invCardAportesRecorrentes"),
                value: `${recorrentes}`,
                sub: recorrentes > 0 ? t("invCardRecorrentesAutomatizados") : t("invCardRecorrentesNenhum"),
                icon: Repeat, iconBg: "#FEF3C7", iconColor: "#D97706",
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

          {/* Charts */}
          <div style={{ display: "grid", gap: 20, marginBottom: 24 }} className="grid grid-cols-1 lg:grid-cols-2">
            {/* Distribuição por categoria */}
            <div style={{
              background: "var(--of-surface)", borderRadius: 16,
              border: "1px solid var(--of-border)", padding: "20px 24px",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)", marginBottom: 16 }}>
                {t("invChartDistribuicaoTitulo")}
              </h3>
              {distribuicao.length === 0 ? (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{t("commonSemDados")}</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={distribuicao} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {distribuicao.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {distribuicao.map((d) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                          <span style={{ fontSize: 12, color: "var(--of-text-secondary)" }}>{d.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "var(--of-text-muted)" }}>
                            {totalInvestido > 0 ? ((d.value / totalInvestido) * 100).toFixed(1) : 0}%
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)" }}>{fmt(d.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top ativos */}
            <div style={{
              background: "var(--of-surface)", borderRadius: 16,
              border: "1px solid var(--of-border)", padding: "20px 24px",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)", marginBottom: 16 }}>
                {t("invChartTopPosicoesTitulo")}
              </h3>
              {topInvs.length === 0 ? (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{t("commonSemDados")}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topInvs} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--of-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--of-text-muted)" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${t("commonMoedaAbrev")}${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--of-text-secondary)" }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="valor" name={t("invChartValor")} radius={[0, 6, 6, 0]}>
                      {topInvs.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Insight banner */}
          {investimentos.length >= 3 && distribuicao.length === 1 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#FFFBEB", border: "1px solid #FDE68A",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            }}>
              <AlertCircle size={18} color="#D97706" />
              <p style={{ fontSize: 13, color: "#92400E" }}>
                <strong>{t("commonDica")}:</strong> {t("invInsightConcentracao")}
              </p>
            </div>
          )}

          {/* Filtros + Lista */}
          <div style={{
            background: "var(--of-surface)", borderRadius: 16,
            border: "1px solid var(--of-border)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)", flexWrap: "wrap" as const, gap: 10,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)" }}>
                {t("invCarteiraTitulo")} ({filtered.length})
              </h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {([["todos", t("commonTodos")], ...Object.entries(TIPOS_INVESTIMENTO).map(([k, v]) => [k, t(v.labelKey)])] as [string, string][]).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat as CategoriaInvestimento | "todos")}
                    style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: "1.5px solid",
                      borderColor: filterCat === cat ? (cat === "todos" ? "#16A34A" : CAT_COLORS[cat as CategoriaInvestimento]) : "var(--of-border)",
                      background: filterCat === cat ? (cat === "todos" ? "#DCFCE7" : CAT_COLORS[cat as CategoriaInvestimento] + "18") : "transparent",
                      color: filterCat === cat ? (cat === "todos" ? "#15803D" : CAT_COLORS[cat as CategoriaInvestimento]) : "var(--of-text-muted)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "var(--of-text-muted)" }}>{t("invNenhumNaCategoria")}</p>
                </div>
              ) : (
                filtered.map((inv) => (
                  <InvestimentoCard key={inv.id} inv={inv} onDelete={handleDelete} />
                ))
              )}
            </div>
          </div>

          {/* Corretoras banner */}
          <div style={{
            marginTop: 20, padding: "16px 20px",
            background: "var(--of-surface)", border: "1px solid var(--of-border)",
            borderRadius: 12, display: "flex", alignItems: "center", gap: 14,
          }}>
            <Building2 size={20} color="var(--of-text-muted)" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{t("invCorretorasTitulo")}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 6 }}>
                {[...new Set(investimentos.map((i) => i.corretora || i.corretora_personalizada).filter(Boolean))].map((c) => (
                  <span key={c!} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                    background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
                    color: "var(--of-text-secondary)",
                  }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <ModalInvestimento
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        userId={userId}
      />
    </div>
  )
}
