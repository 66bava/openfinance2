import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, X, Trash2, TrendingUp, Calendar, AlertCircle } from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { getCategoriasAtivas } from "../../lib/queries/categorias"
import {
  getParcelasFuturas,
  getCompromissos,
  criarCompromisso,
  removerCompromisso,
} from "../../lib/queries/futuro"
import { useLanguage } from "../../lib/language-context"
import type { Transacao, Compromisso, Categoria } from "../../lib/types"

const TIPO_COLORS: Record<string, string> = {
  financiamento: "#2563EB",
  despesa_fixa: "#D97706",
  assinatura: "#7C3AED",
}

const TIPO_BG: Record<string, string> = {
  financiamento: "#EFF6FF",
  despesa_fixa: "#FFFBEB",
  assinatura: "#F5F3FF",
}

function fmt(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00")
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split("T")[0]
}

interface NovoCompromisso {
  descricao: string
  valor: string
  categoria_id: string
  tipo: "financiamento" | "despesa_fixa" | "assinatura"
  dia_vencimento: number
  data_inicio: string
  data_fim: string
}

export default function Futuro() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const [parcelas, setParcelas] = useState<Transacao[]>([])
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [migrationError, setMigrationError] = useState(false)

  const [form, setForm] = useState<NovoCompromisso>({
    descricao: "",
    valor: "",
    categoria_id: "",
    tipo: "despesa_fixa",
    dia_vencimento: 10,
    data_inicio: new Date().toISOString().split("T")[0],
    data_fim: "",
  })

  async function carregar() {
    if (!user) return
    setLoading(true)
    try {
      const [p, c, categorias] = await Promise.all([
        getParcelasFuturas(user.id),
        getCompromissos(user.id),
        getCategoriasAtivas(user.id),
      ])
      setParcelas(p)
      setCompromissos(c)
      setCats(categorias)
    } catch {
      setMigrationError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [user])

  // Build month groups for next 6 months
  const hoje = new Date()
  const meses: { key: string; label: string; mes: number; ano: number }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    meses.push({ key, label, mes: d.getMonth() + 1, ano: d.getFullYear() })
  }

  // Group parcelas by month
  const parcelasPorMes: Record<string, Transacao[]> = {}
  for (const p of parcelas) {
    const key = p.data.slice(0, 7)
    if (!parcelasPorMes[key]) parcelasPorMes[key] = []
    parcelasPorMes[key].push(p)
  }

  // For each month, compute compromissos that apply
  function compromissosMes(mes: number, ano: number, dataFim?: string | null): Compromisso[] {
    const inicioMes = new Date(ano, mes - 1, 1)
    const fimMes = new Date(ano, mes, 0)
    return compromissos.filter((c) => {
      const inicio = new Date(c.data_inicio + "T00:00:00")
      if (inicio > fimMes) return false
      if (c.data_fim) {
        const fim = new Date(c.data_fim + "T00:00:00")
        if (fim < inicioMes) return false
      }
      return true
    })
  }

  function totalMes(key: string, mes: number, ano: number) {
    const pTotal = (parcelasPorMes[key] || []).reduce((s, p) => s + p.valor, 0)
    const cTotal = compromissosMes(mes, ano).reduce((s, c) => s + c.valor, 0)
    return pTotal + cTotal
  }

  const totalGeral = meses.reduce((s, m) => s + totalMes(m.key, m.mes, m.ano), 0)

  async function handleSalvarCompromisso() {
    if (!user || !form.descricao.trim() || !form.valor) return
    const valor = parseFloat(form.valor.replace(",", "."))
    if (isNaN(valor) || valor <= 0) { toast.error("Valor inválido."); return }

    setSaving(true)
    try {
      await criarCompromisso(user.id, {
        descricao: form.descricao.trim(),
        valor,
        categoria_id: form.categoria_id || null,
        tipo: form.tipo,
        dia_vencimento: form.dia_vencimento,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        ativo: true,
      })
      toast.success("Compromisso adicionado!")
      setShowModal(false)
      setForm({
        descricao: "", valor: "", categoria_id: "", tipo: "despesa_fixa",
        dia_vencimento: 10, data_inicio: new Date().toISOString().split("T")[0], data_fim: "",
      })
      carregar()
    } catch {
      toast.error("Erro ao salvar. Verifique se a migration foi aplicada.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemover(id: string) {
    if (!confirm("Remover este compromisso?")) return
    try {
      await removerCompromisso(id)
      toast.success("Compromisso removido.")
      carregar()
    } catch {
      toast.error("Erro ao remover.")
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ width: 28, height: 28, border: "3px solid var(--of-border)", borderTopColor: "var(--of-text)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  return (
    <div style={{ padding: "20px 16px 80px", maxWidth: 720, margin: "0 auto" }}>

      {/* Summary bar */}
      <div style={{
        background: "var(--of-surface)", border: "1px solid var(--of-border)",
        borderRadius: 14, padding: "18px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={20} style={{ color: "#D97706" }} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginBottom: 2 }}>{t("futuroH1")}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text)" }}>{fmt(totalGeral)}</p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--of-text-muted)", textAlign: "right" }}>
          próx. 6 meses
        </p>
      </div>

      {migrationError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", marginBottom: 20,
          background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10,
        }}>
          <AlertCircle size={16} style={{ color: "#D97706", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#92400E" }}>{t("futuroMigrationMsg")}</p>
        </div>
      )}

      {/* Month timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
        {meses.map(({ key, label, mes, ano }) => {
          const monthParcelas = parcelasPorMes[key] || []
          const monthComps = compromissosMes(mes, ano)
          const total = totalMes(key, mes, ano)
          if (monthParcelas.length === 0 && monthComps.length === 0) return null

          return (
            <div key={key} style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              {/* Month header */}
              <div style={{
                padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid var(--of-border-light)", background: "var(--of-page-bg)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={14} style={{ color: "var(--of-text-muted)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)", textTransform: "capitalize" }}>{label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>{fmt(total)}</span>
              </div>

              {/* Parcelas */}
              {monthParcelas.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 16px", borderBottom: "1px solid var(--of-border-light)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{p.categorias?.icone || "💳"}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text)" }}>{p.descricao}</p>
                      {p.total_parcelas && (
                        <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                          {t("futuroParcela")} {p.parcela_atual} {t("futuroDeLabel")} {p.total_parcelas}
                        </p>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>{fmt(p.valor)}</span>
                </div>
              ))}

              {/* Compromissos */}
              {monthComps.map((c) => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 16px", borderBottom: "1px solid var(--of-border-light)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{c.categorias?.icone || "📆"}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text)" }}>{c.descricao}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6,
                          background: TIPO_BG[c.tipo] || "#F5F5F5",
                          color: TIPO_COLORS[c.tipo] || "#555",
                        }}>
                          {c.tipo === "financiamento" ? t("futuroTipoFin") : c.tipo === "despesa_fixa" ? t("futuroTipoFixa") : t("futuroTipoAssin")}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                          {t("futuroDiaVenc")} {c.dia_vencimento}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>{fmt(c.valor)} <span style={{ fontSize: 10, color: "var(--of-text-muted)" }}>{t("futuroTotalMes")}</span></span>
                </div>
              ))}
            </div>
          )
        })}

        {parcelas.length === 0 && compromissos.length === 0 && !migrationError && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--of-text-muted)" }}>
            <TrendingUp size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{t("futuroSemDados")}</p>
          </div>
        )}
      </div>

      {/* Compromissos section */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--of-text)" }}>{t("futuroCompromissosH")}</h2>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#0A0A0A", color: "#FFFFFF", border: "none", borderRadius: 8,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} />
            {t("futuroNovoComp")}
          </button>
        </div>

        {compromissos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {compromissos.map((c) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "var(--of-surface)",
                border: "1px solid var(--of-border)", borderRadius: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{c.categorias?.icone || "📆"}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{c.descricao}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6,
                        background: TIPO_BG[c.tipo] || "#F5F5F5",
                        color: TIPO_COLORS[c.tipo] || "#555",
                      }}>
                        {c.tipo === "financiamento" ? t("futuroTipoFin") : c.tipo === "despesa_fixa" ? t("futuroTipoFixa") : t("futuroTipoAssin")}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                        {t("futuroDiaVenc")} {c.dia_vencimento}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--of-text)" }}>{fmt(c.valor)}</p>
                    <p style={{ fontSize: 10, color: "var(--of-text-muted)" }}>{t("futuroTotalMes")}</p>
                  </div>
                  <button
                    onClick={() => handleRemover(c.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--of-text-muted)", borderRadius: 6 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#DC2626" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--of-text-muted)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal novo compromisso */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "var(--of-surface)", borderRadius: 16, width: "100%", maxWidth: 460,
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--of-text)" }}>{t("futuroNovoComp")}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--of-text-muted)" }}><X size={18} /></button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Tipo */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Tipo</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["despesa_fixa", "financiamento", "assinatura"] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setForm((f) => ({ ...f, tipo }))}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                        background: form.tipo === tipo ? TIPO_BG[tipo] : "var(--of-page-bg)",
                        color: form.tipo === tipo ? TIPO_COLORS[tipo] : "var(--of-text-muted)",
                        outline: form.tipo === tipo ? `2px solid ${TIPO_COLORS[tipo]}` : "none",
                      }}
                    >
                      {tipo === "financiamento" ? t("futuroTipoFin") : tipo === "despesa_fixa" ? t("futuroTipoFixa") : t("futuroTipoAssin")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Financiamento do carro, Netflix..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 8, fontSize: 14, outline: "none", background: "var(--of-page-bg)", color: "var(--of-text)", boxSizing: "border-box" as const }}
                />
              </div>

              {/* Valor + Dia */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Valor mensal (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                    placeholder="0,00"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 8, fontSize: 14, outline: "none", background: "var(--of-page-bg)", color: "var(--of-text)", boxSizing: "border-box" as const }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>{t("futuroDiaVenc")}</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dia_vencimento}
                    onChange={(e) => setForm((f) => ({ ...f, dia_vencimento: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 8, fontSize: 14, outline: "none", background: "var(--of-page-bg)", color: "var(--of-text)", boxSizing: "border-box" as const }}
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Categoria (opcional)</label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 8, fontSize: 14, outline: "none", background: "var(--of-page-bg)", color: "var(--of-text)", boxSizing: "border-box" as const }}
                >
                  <option value="">Selecione...</option>
                  {cats.filter((c) => c.tipo === "despesa").map((c) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Datas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>{t("futuroDataInicio")}</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 8, fontSize: 14, outline: "none", background: "var(--of-page-bg)", color: "var(--of-text)", boxSizing: "border-box" as const }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>{t("futuroDataFim")}</label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 8, fontSize: 14, outline: "none", background: "var(--of-page-bg)", color: "var(--of-text)", boxSizing: "border-box" as const }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: "11px", border: "1px solid var(--of-border)", borderRadius: 8,
                  background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--of-text)",
                }}
              >
                {t("futuroCancelar")}
              </button>
              <button
                onClick={handleSalvarCompromisso}
                disabled={saving}
                style={{
                  flex: 2, padding: "11px", border: "none", borderRadius: 8,
                  background: "#0A0A0A", color: "#FFFFFF",
                  cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Salvando..." : t("futuroSalvar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
