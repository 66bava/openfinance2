import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  AlertCircle,
  Calendar,
  Car,
  Home,
  Building2,
  Bike,
  Plus,
  Trash2,
  X,
  CreditCard,
  Repeat,
} from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { useLanguage } from "../../lib/language-context"
import { getCategoriasAtivas } from "../../lib/queries/categorias"
import { getAssinaturas, calcularTotalMensal } from "../../lib/queries/assinaturas"
import { getParcelasFuturas, getCompromissos, criarCompromisso, removerCompromisso } from "../../lib/queries/futuro"
import type { Assinatura, Categoria, Compromisso, MetodoPagamento, Transacao } from "../../lib/types"
import { formatCurrency, formatDate } from "../../lib/format"

type FinanciamentoTipo = "carro" | "casa" | "apartamento" | "moto" | "outro"

const FIN_TIPO_META: Record<FinanciamentoTipo, { label: string; icon: React.ElementType; color: string }> = {
  carro: { label: "Carro", icon: Car, color: "#2563EB" },
  casa: { label: "Casa", icon: Home, color: "#16A34A" },
  apartamento: { label: "Apartamento", icon: Building2, color: "#7C3AED" },
  moto: { label: "Moto", icon: Bike, color: "#F59E0B" },
  outro: { label: "Outro", icon: CreditCard, color: "#0A0A0A" },
}

const METODOS_PAGAMENTO: { value: MetodoPagamento; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "debito", label: "Cartão de débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "debito_automatico", label: "Débito automático" },
  { value: "outro", label: "Outro" },
]

function clampDay(day: number) {
  return Math.max(1, Math.min(31, day))
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function addMonths(date: Date, n: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function monthsDiff(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

function parseBRL(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")
  return Number.parseFloat(cleaned) || 0
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type NovoFinanciamento = {
  financiamento_tipo: FinanciamentoTipo
  descricao: string
  valor_total_financiado: string
  valor_entrada: string
  valor_parcela: string
  parcelas_total: string
  parcelas_pagas: string
  dia_vencimento: number
  data_inicio: string
  metodo_pagamento: MetodoPagamento | ""
  categoria_id: string
  observacoes: string
}

const EMPTY_FIN: NovoFinanciamento = {
  financiamento_tipo: "carro",
  descricao: "",
  valor_total_financiado: "",
  valor_entrada: "",
  valor_parcela: "",
  parcelas_total: "36",
  parcelas_pagas: "0",
  dia_vencimento: 10,
  data_inicio: new Date().toISOString().split("T")[0],
  metodo_pagamento: "",
  categoria_id: "",
  observacoes: "",
}

function financiamentoIcon(tipo: FinanciamentoTipo) {
  return FIN_TIPO_META[tipo]?.icon ?? CreditCard
}

function financiamentoColor(tipo: FinanciamentoTipo) {
  return FIN_TIPO_META[tipo]?.color ?? "#0A0A0A"
}

function safeFinTipo(raw: string | null | undefined): FinanciamentoTipo {
  const s = (raw || "").toString().trim().toLowerCase()
  if (s === "carro" || s === "casa" || s === "apartamento" || s === "moto") return s
  return "outro"
}

function mensalFin(c: Compromisso) {
  const v = c.valor_parcela ?? c.valor
  return Number(v) || 0
}

function parcelaLabel(pagas: number, total: number) {
  if (!Number.isFinite(pagas) || !Number.isFinite(total)) return ""
  return `${pagas}/${total}`
}

function percent(pagas: number, total: number) {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, (pagas / total) * 100))
}

export default function Futuro() {
  const { user } = useAuth()
  const { t, lang } = useLanguage()

  const [parcelas, setParcelas] = useState<Transacao[]>([])
  const [financiamentos, setFinanciamentos] = useState<Compromisso[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationError, setMigrationError] = useState(false)

  const [finModalOpen, setFinModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finForm, setFinForm] = useState<NovoFinanciamento>(EMPTY_FIN)

  async function carregar() {
    if (!user) return
    setLoading(true)
    try {
      const [p, fins, subs, categorias] = await Promise.all([
        getParcelasFuturas(user.id),
        getCompromissos(user.id),
        getAssinaturas(user.id),
        getCategoriasAtivas(user.id),
      ])
      setParcelas(p)
      setFinanciamentos(fins)
      setAssinaturas(subs)
      setCats(categorias)
      setMigrationError(false)
    } catch {
      setMigrationError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [user])

  const totalSubsMensal = useMemo(() => calcularTotalMensal(assinaturas), [assinaturas])
  const totalFinMensal = useMemo(() => financiamentos.reduce((s, c) => s + mensalFin(c), 0), [financiamentos])

  // Próximos 6 meses (inclui próximo mês)
  const meses = useMemo(() => {
    const hoje = new Date()
    const out: { key: string; label: string; mes: number; ano: number; date: Date }[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 1)
      out.push({
        key: monthKey(d),
        label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        date: d,
      })
    }
    return out
  }, [])

  const parcelasPorMes = useMemo(() => {
    const map: Record<string, Transacao[]> = {}
    for (const p of parcelas) {
      const key = p.data.slice(0, 7)
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [parcelas])

  function finNoMes(c: Compromisso, mesDate: Date) {
    const start = new Date((c.data_inicio || "").slice(0, 10) + "T00:00:00")
    if (Number.isNaN(start.getTime())) return false
    const m0 = new Date(start.getFullYear(), start.getMonth(), 1)
    const m = new Date(mesDate.getFullYear(), mesDate.getMonth(), 1)
    const diff = monthsDiff(m0, m)
    if (diff < 0) return false

    const total = Number(c.parcelas_total ?? null)
    const pagas = Number(c.parcelas_pagas ?? 0)
    const installment = diff + 1

    if (Number.isFinite(total) && total > 0 && installment > total) return false
    if (Number.isFinite(pagas) && pagas >= 0 && installment <= pagas) return false

    return true
  }

  function totalMes(m: { key: string; date: Date }) {
    const pTotal = (parcelasPorMes[m.key] || []).reduce((s, p) => s + p.valor, 0)
    const fTotal = financiamentos.filter((c) => finNoMes(c, m.date)).reduce((s, c) => s + mensalFin(c), 0)
    const sTotal = totalSubsMensal // aproximação mensal (considera recorrência)
    return pTotal + fTotal + sTotal
  }

  const totalGeral = useMemo(() => meses.reduce((s, m) => s + totalMes(m), 0), [meses, parcelasPorMes, financiamentos, totalSubsMensal])

  async function handleSalvarFinanciamento() {
    if (!user) return
    if (!finForm.descricao.trim()) {
      toast.error("Informe o nome do financiamento.")
      return
    }

    const valorTotal = parseBRL(finForm.valor_total_financiado)
    const entrada = parseBRL(finForm.valor_entrada)
    const valorParcela = parseBRL(finForm.valor_parcela)
    const parcelasTotal = Number.parseInt(finForm.parcelas_total || "0", 10) || 0
    const parcelasPagas = Number.parseInt(finForm.parcelas_pagas || "0", 10) || 0

    if (valorTotal <= 0) { toast.error("Informe o valor total financiado."); return }
    if (entrada < 0) { toast.error("Entrada inválida."); return }
    if (valorParcela <= 0) { toast.error("Informe o valor da parcela mensal."); return }
    if (parcelasTotal <= 0) { toast.error("Informe a quantidade total de parcelas."); return }
    if (parcelasPagas < 0 || parcelasPagas > parcelasTotal) { toast.error("Parcelas pagas inválidas."); return }
    if (!finForm.data_inicio) { toast.error("Informe a data de início."); return }

    setSaving(true)
    try {
      const saved = await criarCompromisso(user.id, {
        tipo: "financiamento",
        descricao: finForm.descricao.trim(),
        valor: valorParcela, // compatibilidade: valor mensal
        valor_parcela: valorParcela,
        valor_total_financiado: valorTotal,
        valor_entrada: entrada || null,
        parcelas_total: parcelasTotal,
        parcelas_pagas: parcelasPagas,
        financiamento_tipo: finForm.financiamento_tipo,
        dia_vencimento: clampDay(finForm.dia_vencimento),
        data_inicio: finForm.data_inicio,
        data_fim: null,
        categoria_id: finForm.categoria_id || null,
        metodo_pagamento: finForm.metodo_pagamento || null,
        observacoes: finForm.observacoes || null,
        ativo: true,
      } as any)

      toast.success("Financiamento adicionado!")
      setFinanciamentos((prev) => [...prev, saved].sort((a, b) => (a.dia_vencimento ?? 0) - (b.dia_vencimento ?? 0)))
      setFinModalOpen(false)
      setFinForm(EMPTY_FIN)
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoverFin(id: string) {
    if (!user) return
    try {
      await removerCompromisso(id, user.id)
      setFinanciamentos((prev) => prev.filter((c) => c.id !== id))
      toast.success("Removido.")
    } catch {
      toast.error("Erro ao remover.")
    }
  }

  const subsProximas = useMemo(() => {
    const list = [...assinaturas]
      .filter((a) => a.ativo)
      .sort((a, b) => {
        const da = a.proximo_pagamento ? new Date(a.proximo_pagamento + "T00:00:00").getTime() : 0
        const db = b.proximo_pagamento ? new Date(b.proximo_pagamento + "T00:00:00").getTime() : 0
        return da - db
      })
    return list.slice(0, 5)
  }, [assinaturas])

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (migrationError) {
    return (
      <div className="p-4 lg:p-6 max-w-[900px] mx-auto">
        <div style={{
          background: "var(--of-surface)",
          borderRadius: 16,
          border: "1px solid var(--of-border)",
          padding: "18px 18px",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={18} color="#EF4444" style={{ marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--of-text)" }}>Migração necessária</p>
              <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                {t("futuroMigrationMsg")}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--of-text)", letterSpacing: "-0.02em" }}>{t("futuroH1")}</h1>
          <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            Planeje as próximas cobranças (assinaturas, financiamentos e parcelas) antes do mês virar.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          <Link
            to="/app/assinaturas"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid var(--of-border)", background: "var(--of-surface)",
              color: "var(--of-text)", textDecoration: "none",
              fontSize: 13, fontWeight: 700,
            }}
          >
            <Repeat size={14} /> Gerenciar assinaturas
          </Link>
          <button
            onClick={() => setFinModalOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 12px", borderRadius: 10,
              border: "none", background: "var(--of-btn-bg)",
              color: "var(--of-btn-text)",
              fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}
          >
            <Plus size={14} /> Novo financiamento
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: "grid", gap: 12, marginBottom: 18 }} className="grid grid-cols-1 md:grid-cols-3">
        <div style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 14, padding: "16px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Assinaturas (mês)
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "var(--of-text)", marginTop: 4 }}>
            {formatCurrency(totalSubsMensal, lang)}
          </p>
          <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 4 }}>
            {assinaturas.length} ativas
          </p>
        </div>
        <div style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 14, padding: "16px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Financiamentos (mês)
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "var(--of-text)", marginTop: 4 }}>
            {formatCurrency(totalFinMensal, lang)}
          </p>
          <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 4 }}>
            {financiamentos.length} ativos
          </p>
        </div>
        <div style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 14, padding: "16px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Próximos 6 meses (estimado)
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "var(--of-text)", marginTop: 4 }}>
            {formatCurrency(totalGeral, lang)}
          </p>
          <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 4 }}>
            Inclui parcelas + assinaturas + financiamentos
          </p>
        </div>
      </div>

      {/* Cards: Assinaturas + Financiamentos */}
      <div style={{ display: "grid", gap: 16, marginBottom: 18 }} className="grid grid-cols-1 lg:grid-cols-2">
        {/* Assinaturas */}
        <div style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--of-border)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--of-text)" }}>Assinaturas (próximas cobranças)</p>
            <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
              Recorrências como Netflix, Spotify, academia, ferramentas e apps.
            </p>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {subsProximas.length === 0 ? (
              <div style={{ padding: "18px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>Nenhuma assinatura cadastrada.</p>
                <Link to="/app/assinaturas" style={{ display: "inline-block", marginTop: 10, fontSize: 13, fontWeight: 700, color: "#16A34A", textDecoration: "none" }}>
                  Adicionar assinatura →
                </Link>
              </div>
            ) : (
              subsProximas.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: (a.cor || "#16A34A") + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 14 }}>{a.icone || "💳"}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.nome}
                      </p>
                      {a.proximo_pagamento ? (
                        <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{formatDate(a.proximo_pagamento, lang)}</p>
                      ) : (
                        <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>Próximo pagamento não informado</p>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--of-text)" }}>{formatCurrency(a.valor, lang)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financiamentos */}
        <div style={{ background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--of-border)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--of-text)" }}>Financiamentos</p>
            <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
              Acompanhe parcelas pagas, parcelas restantes e o peso no seu mês.
            </p>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {financiamentos.length === 0 ? (
              <div style={{ padding: "18px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>Nenhum financiamento cadastrado.</p>
                <button
                  onClick={() => setFinModalOpen(true)}
                  style={{
                    marginTop: 10,
                    border: "1px dashed var(--of-border)",
                    background: "var(--of-surface)",
                    color: "var(--of-text)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Adicionar financiamento
                </button>
              </div>
            ) : (
              financiamentos.map((c) => {
                const tipo = safeFinTipo(c.financiamento_tipo as any)
                const Icon = financiamentoIcon(tipo)
                const color = financiamentoColor(tipo)
                const total = Number(c.parcelas_total ?? 0) || 0
                const pagas = Number(c.parcelas_pagas ?? 0) || 0
                const pct = percent(pagas, total)
                const mensal = mensalFin(c)

                return (
                  <div key={c.id} style={{ border: "1px solid var(--of-border)", borderRadius: 14, padding: "12px 12px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 12,
                          background: color + "1A",
                          border: "1px solid " + color + "33",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={16} style={{ color }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.descricao}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 2 }}>
                            Vence dia {c.dia_vencimento} · Início {formatDate(c.data_inicio, lang)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 900, color: "var(--of-text)" }}>{formatCurrency(mensal, lang)}/mês</p>
                        <button
                          onClick={() => handleRemoverFin(c.id)}
                          title={t("futuroRemover")}
                          style={{
                            width: 34, height: 34, borderRadius: 10,
                            border: "1px solid var(--of-border)",
                            background: "var(--of-surface)",
                            color: "#DC2626",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {total > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Progresso
                          </p>
                          <p style={{ fontSize: 11, fontWeight: 800, color: "var(--of-text-secondary)" }}>
                            {parcelaLabel(pagas, total)} ({pct.toFixed(0)}%)
                          </p>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: "var(--of-border)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.2s" }} />
                        </div>
                      </div>
                    )}

                    {(c.metodo_pagamento || c.valor_total_financiado) && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                        {c.valor_total_financiado != null && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--of-border)", background: "var(--of-page-bg)", color: "var(--of-text-secondary)" }}>
                            Total: {formatCurrency(Number(c.valor_total_financiado) || 0, lang)}
                          </span>
                        )}
                        {c.metodo_pagamento && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--of-border)", background: "var(--of-page-bg)", color: "var(--of-text-secondary)" }}>
                            Pagamento: {METODOS_PAGAMENTO.find((m) => m.value === c.metodo_pagamento)?.label ?? c.metodo_pagamento}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Próximos meses */}
      <div style={{ background: "var(--of-surface)", borderRadius: 16, border: "1px solid var(--of-border)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--of-border)" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--of-text)" }}>Projeção dos próximos meses</p>
          <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
            Uma visão rápida do que entra no seu planejamento antes do mês começar.
          </p>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {meses.map((m) => {
            const pTotal = (parcelasPorMes[m.key] || []).reduce((s, p) => s + p.valor, 0)
            const fTotal = financiamentos.filter((c) => finNoMes(c, m.date)).reduce((s, c) => s + mensalFin(c), 0)
            const sTotal = totalSubsMensal
            const total = pTotal + fTotal + sTotal

            return (
              <div key={m.key} style={{
                border: "1px solid var(--of-border)", borderRadius: 14,
                padding: "12px 12px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--of-text)", textTransform: "capitalize" }}>{m.label}</p>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                      Parcelas: <strong style={{ color: "var(--of-text)" }}>{formatCurrency(pTotal, lang)}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                      Financiamentos: <strong style={{ color: "var(--of-text)" }}>{formatCurrency(fTotal, lang)}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                      Assinaturas: <strong style={{ color: "var(--of-text)" }}>{formatCurrency(sTotal, lang)}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Total</p>
                  <p style={{ fontSize: 15, fontWeight: 900, color: "var(--of-text)" }}>{formatCurrency(total, lang)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal: Novo financiamento */}
      <DialogPrimitive.Root open={finModalOpen} onOpenChange={(v) => { if (!v) setFinForm(EMPTY_FIN); setFinModalOpen(v) }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
          />
          <DialogPrimitive.Content
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 101,
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "var(--of-surface)",
              borderRadius: 16,
              border: "1px solid var(--of-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              padding: "22px 22px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
                  Novo financiamento
                </h2>
                <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 4, lineHeight: 1.45 }}>
                  Cadastre um financiamento real (parcelas, progresso e impacto mensal).
                </p>
              </div>
              <DialogPrimitive.Close
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--of-text-secondary)",
                }}
              >
                <X size={18} />
              </DialogPrimitive.Close>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Tipo
                </label>
                <select
                  value={finForm.financiamento_tipo}
                  onChange={(e) => setFinForm((p) => ({ ...p, financiamento_tipo: e.target.value as FinanciamentoTipo }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "var(--of-surface)", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                >
                  {Object.entries(FIN_TIPO_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Nome
                </label>
                <input
                  value={finForm.descricao}
                  onChange={(e) => setFinForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Corolla 2022, Casa, Apartamento..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Valor total financiado
                </label>
                <input
                  inputMode="decimal"
                  value={finForm.valor_total_financiado}
                  onChange={(e) => setFinForm((p) => ({ ...p, valor_total_financiado: e.target.value }))}
                  placeholder="0,00"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Entrada (opcional)
                </label>
                <input
                  inputMode="decimal"
                  value={finForm.valor_entrada}
                  onChange={(e) => setFinForm((p) => ({ ...p, valor_entrada: e.target.value }))}
                  placeholder="0,00"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Parcela mensal
                </label>
                <input
                  inputMode="decimal"
                  value={finForm.valor_parcela}
                  onChange={(e) => setFinForm((p) => ({ ...p, valor_parcela: e.target.value }))}
                  placeholder="0,00"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Total de parcelas
                </label>
                <input
                  type="number"
                  min={1}
                  value={finForm.parcelas_total}
                  onChange={(e) => setFinForm((p) => ({ ...p, parcelas_total: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Parcelas pagas
                </label>
                <input
                  type="number"
                  min={0}
                  value={finForm.parcelas_pagas}
                  onChange={(e) => setFinForm((p) => ({ ...p, parcelas_pagas: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Dia de vencimento
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={finForm.dia_vencimento}
                  onChange={(e) => setFinForm((p) => ({ ...p, dia_vencimento: clampDay(Number.parseInt(e.target.value || "1", 10) || 1) }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Data de início
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--of-border)", borderRadius: 10, padding: "10px 12px" }}>
                  <Calendar size={16} style={{ color: "var(--of-text-muted)" }} />
                  <input
                    type="date"
                    value={finForm.data_inicio}
                    onChange={(e) => setFinForm((p) => ({ ...p, data_inicio: e.target.value }))}
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--of-text)", fontSize: 14 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Forma de pagamento
                </label>
                <select
                  value={finForm.metodo_pagamento}
                  onChange={(e) => setFinForm((p) => ({ ...p, metodo_pagamento: e.target.value as any }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "var(--of-surface)", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                >
                  <option value="">Selecione…</option>
                  {METODOS_PAGAMENTO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Categoria (opcional)
                </label>
                <select
                  value={finForm.categoria_id}
                  onChange={(e) => setFinForm((p) => ({ ...p, categoria_id: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "var(--of-surface)", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                >
                  <option value="">Selecione…</option>
                  {cats.filter((c) => c.tipo === "despesa").map((c) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Observações (opcional)
                </label>
                <input
                  value={finForm.observacoes}
                  onChange={(e) => setFinForm((p) => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Ex: taxa, banco, observações..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--of-border)", borderRadius: 10, background: "transparent", color: "var(--of-text)", fontSize: 14, outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setFinModalOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "1px solid var(--of-border)",
                  background: "var(--of-surface)",
                  color: "var(--of-text)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarFinanciamento}
                disabled={saving}
                style={{
                  flex: 2,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: saving ? "var(--of-border)" : "var(--of-btn-bg)",
                  color: saving ? "var(--of-text-muted)" : "var(--of-btn-text)",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Salvando..." : "Salvar financiamento"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}

