import { useEffect, useMemo, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useOutletContext } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency } from "../../../lib/format"
import { getProfile, getTotaisMes } from "../../../lib/queries"
import { getCategoriasAtivas } from "../../../lib/queries/categorias"
import { criarAssinatura, getAssinaturas, calcularTotalMensal } from "../../../lib/queries/assinaturas"
import { criarCompromisso, getCompromissos } from "../../../lib/queries/futuro"
import type { Assinatura, Categoria, Compromisso, MetodoPagamento, Profile } from "../../../lib/types"
import { PanelLoader } from "../../components/PanelLoader"
import type { AppOutletContext } from "../../../app/components/Layout"
import { ManageSubscriptionsModal } from "../../../app/components/planning/ManageSubscriptionsModal"

type AddKind = "assinatura" | "conta_fixa" | "financiamento"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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

function daysUntil(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "")
}

function formatBRLInput(value: string) {
  const digits = onlyDigits(value)
  if (!digits) return ""
  const n = Number.parseInt(digits, 10) / 100
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseBRLInput(formatted: string): number {
  if (!formatted) return 0
  const normalized = formatted.replace(/\./g, "").replace(",", ".")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

function methodOptions(): Array<{ value: MetodoPagamento | ""; label: string }> {
  return [
    { value: "", label: "— Selecionar —" },
    { value: "credito", label: "💳 Cartão de Crédito" },
    { value: "debito", label: "🏧 Cartão de Débito" },
    { value: "pix", label: "🟢 Pix" },
    { value: "pix_qr_code", label: "📷 Pix QR Code" },
    { value: "dinheiro", label: "💵 Dinheiro" },
    { value: "transferencia", label: "🔀 TED / DOC" },
    { value: "boleto", label: "🧾 Boleto" },
    { value: "debito_automatico", label: "🔁 Débito automático" },
    { value: "outro", label: "💠 Outro" },
  ]
}

function methodLabel(m: MetodoPagamento | null | undefined) {
  if (!m) return "Não informado"
  if (m === "credito") return "Cartão de crédito"
  if (m === "debito") return "Cartão de débito"
  if (m === "pix") return "Pix"
  if (m === "pix_qr_code") return "Pix QR Code"
  if (m === "dinheiro") return "Dinheiro"
  if (m === "transferencia") return "Transferência"
  if (m === "boleto") return "Boleto"
  if (m === "debito_automatico") return "Débito automático"
  if (m === "outro") return "Outro"
  return String(m)
}

function monthShortPt(iso: string) {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()
}

type UpcomingItem = { id: string; label: string; dateISO: string; value: number; kind: AddKind | "assinatura"; meta: string }

export default function PlanejamentoPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()
  const { syncNonce, requestSync } = useOutletContext<AppOutletContext>()
  const fmt = (v: number) => formatCurrency(v, lang, currency)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [totais, setTotais] = useState({ totalGastos: 0, totalRenda: 0, saldoDisponivel: 0, percentualEconomia: 0 })
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [cats, setCats] = useState<Categoria[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [addKind, setAddKind] = useState<AddKind>("assinatura")
  const [saving, setSaving] = useState(false)
  const [manageSubsOpen, setManageSubsOpen] = useState(false)

  const [nome, setNome] = useState("")
  const [valorRaw, setValorRaw] = useState("")
  const [dia, setDia] = useState(10)
  const [recorrencia, setRecorrencia] = useState<Assinatura["recorrencia"]>("mensal")
  const [metodo, setMetodo] = useState<MetodoPagamento | "">("")
  const [categoriaId, setCategoriaId] = useState("")
  const [obs, setObs] = useState("")

  useEffect(() => {
    if (!user) return
    const userId = user.id
    setLoading(true)
    Promise.all([
      getProfile(userId),
      getTotaisMes(userId),
      getAssinaturas(userId),
      getCompromissos(userId),
      getCategoriasAtivas(userId),
    ])
      .then(([p, t, subs, comps, c]) => {
        setProfile(p)
        setTotais(t)
        setAssinaturas(subs || [])
        setCompromissos(comps || [])
        setCats(c || [])
      })
      .finally(() => setLoading(false))
  }, [user?.id, syncNonce])

  async function reloadAll() {
    if (!user) return
    const userId = user.id
    const [subs, comps] = await Promise.all([getAssinaturas(userId), getCompromissos(userId)])
    setAssinaturas(subs || [])
    setCompromissos(comps || [])
  }

  const subsMensal = useMemo(() => calcularTotalMensal(assinaturas), [assinaturas])

  const contasFixas = useMemo(() => compromissos.filter((c) => c.tipo === "despesa_fixa"), [compromissos])
  const financiamentos = useMemo(() => compromissos.filter((c) => c.tipo === "financiamento"), [compromissos])

  const contasFixasMensal = useMemo(() => contasFixas.reduce((s, c) => s + (Number(c.valor) || 0), 0), [contasFixas])
  const financiamentosMensal = useMemo(
    () => financiamentos.reduce((s, c) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0),
    [financiamentos],
  )

  const rendaRef = Math.max(0, Number(profile?.renda_mensal) || totais.totalRenda || 0)
  const totalComprometido = subsMensal + contasFixasMensal + financiamentosMensal
  const livreApos = rendaRef > 0 ? rendaRef - totalComprometido : 0

  const upcoming = useMemo(() => {
    const out: UpcomingItem[] = []
    for (const s of assinaturas) {
      if (!s.ativo) continue
      const due = s.proximo_pagamento || (s.dia_cobranca ? nextDueDateISO(s.dia_cobranca) : null)
      if (!due) continue
      out.push({
        id: `sub:${s.id}`,
        label: s.nome,
        dateISO: due,
        value: Number(s.valor) || 0,
        kind: "assinatura",
        meta: `${daysUntil(due)} dias · ${methodLabel(s.metodo_pagamento)}`,
      })
    }
    for (const c of compromissos) {
      if (!c.ativo) continue
      const due = nextDueDateISO(c.dia_vencimento)
      out.push({
        id: `comp:${c.id}`,
        label: c.descricao,
        dateISO: due,
        value: Number((c as any).valor_parcela ?? c.valor) || 0,
        kind: c.tipo === "financiamento" ? "financiamento" : "conta_fixa",
        meta: `${daysUntil(due)} dias · ${methodLabel(c.metodo_pagamento)}`,
      })
    }
    const t = todayISO()
    return out
      .filter((i) => i.dateISO >= t)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .slice(0, 6)
  }, [assinaturas, compromissos])

  const nextItem = upcoming[0] ?? null
  const nextDays = nextItem ? Math.max(0, daysUntil(nextItem.dateISO)) : null
  const monthLabel = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  }, [])

  async function refresh() {
    if (!user) return
    const userId = user.id
    const [subs, comps] = await Promise.all([getAssinaturas(userId), getCompromissos(userId)])
    setAssinaturas(subs || [])
    setCompromissos(comps || [])
  }

  async function submitAdd() {
    if (!user) return
    const userId = user.id
    const valor = parseBRLInput(valorRaw)
    if (!nome.trim()) {
      toast.error("Informe um nome")
      return
    }
    if (!(valor > 0)) {
      toast.error("Informe um valor válido")
      return
    }
    if (!(dia >= 1 && dia <= 31)) {
      toast.error("Informe o dia de vencimento/cobrança (1–31)")
      return
    }

    setSaving(true)
    try {
      if (addKind === "assinatura") {
        await criarAssinatura(userId, {
          nome: nome.trim(),
          valor,
          recorrencia,
          categoria: null,
          proximo_pagamento: nextDueDateISO(dia),
          renovacao_automatica: true,
          ativo: true,
          icone: null,
          cor: null,
          observacoes: obs.trim() || null,
          categoria_financeira_id: categoriaId || null,
          metodo_pagamento: (metodo || null) as any,
          dia_cobranca: dia,
        })
      } else {
        await criarCompromisso(userId, {
          descricao: nome.trim(),
          valor,
          categoria_id: categoriaId || null,
          tipo: addKind === "financiamento" ? "financiamento" : "despesa_fixa",
          dia_vencimento: dia,
          data_inicio: todayISO(),
          data_fim: null,
          ativo: true,
          financiamento_tipo: addKind === "financiamento" ? "outro" : null,
          valor_total_financiado: addKind === "financiamento" ? null : null,
          valor_entrada: null,
          valor_parcela: addKind === "financiamento" ? valor : null,
          parcelas_total: addKind === "financiamento" ? null : null,
          parcelas_pagas: addKind === "financiamento" ? 0 : null,
          metodo_pagamento: (metodo || null) as any,
          observacoes: obs.trim() || null,
        } as any)
      }

      toast.success("Item adicionado ao planejamento")
      setAddOpen(false)
      setNome("")
      setValorRaw("")
      setObs("")
      setCategoriaId("")
      setMetodo("")
      await refresh()
    } catch (e) {
      toast.error("Não foi possível salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null
  if (loading) return <PanelLoader />

  return (
    <div className="ofx-planning">
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Planejamento financeiro</div>
            <div className="page-sub">
              {monthLabel} · {assinaturas.length + compromissos.length} compromissos
              {nextDays == null ? "" : ` · próximo em ${nextDays} dia${nextDays === 1 ? "" : "s"}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adicionar
            </button>
          </div>
        </div>

        <div className="summary-row">
          <div className="sum-card">
            <div className="sum-label">Total comprometido</div>
            <div className="sum-val red">{fmt(totalComprometido)}</div>
            <div className="sum-delta">De {fmt(rendaRef)} de referência</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Assinaturas</div>
            <div className="sum-val amber">{fmt(subsMensal)}</div>
            <div className="sum-delta">{assinaturas.length} serviços ativos</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Contas fixas</div>
            <div className="sum-val">{fmt(contasFixasMensal)}</div>
            <div className="sum-delta">{contasFixas.length} contas</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Livre após compromissos</div>
            <div className="sum-val green">{fmt(livreApos)}</div>
            <div className="sum-delta">{rendaRef > 0 ? <span className="pos">▲</span> : null} foco em consistência</div>
          </div>
        </div>

        <div className="plan-grid">
          <div>
            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  <div className="dot purple" />
                  Assinaturas <span className="section-count">{assinaturas.length} ativas · {fmt(subsMensal)}/mês</span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={() => setManageSubsOpen(true)}
                >
                  Gerenciar
                </button>
              </div>

              {assinaturas.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.65 }}>
                  Nenhuma assinatura cadastrada. Use “Adicionar” para registrar serviços recorrentes.
                </div>
              ) : (
                <div className="sub-list">
                  {assinaturas.slice(0, 8).map((s) => {
                    const due = s.proximo_pagamento || (s.dia_cobranca ? nextDueDateISO(s.dia_cobranca) : null)
                    const dd = due ? daysUntil(due) : null
                    const soon = dd != null && dd >= 0 && dd <= 7
                    return (
                      <div key={s.id} className="sub-item">
                        <div className="sub-icon" style={{ background: "var(--bg-c2)" }} aria-hidden="true">{s.icone || "🔁"}</div>
                        <div className="sub-info">
                          <div className="sub-name">{s.nome}</div>
                          <div className="sub-meta">
                            {due ? `Renovação em ${dd} dia${dd === 1 ? "" : "s"} · ${methodLabel(s.metodo_pagamento)}` : `Recorrência: ${s.recorrencia}`}
                          </div>
                        </div>
                        <div className="sub-right">
                          <div className="sub-val">{fmt(s.valor)}</div>
                          <div className="sub-cycle">
                            <span className={["sub-badge", soon ? "badge-soon" : "badge-ok"].join(" ")}>
                              {soon ? "Vence em breve" : "Ativo"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="total-strip">
                <label>Total mensal em assinaturas</label>
                <span>{fmt(subsMensal)}</span>
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  <div className="dot amber" />
                  Contas fixas <span className="section-count">{contasFixas.length} contas · {fmt(contasFixasMensal)}/mês</span>
                </div>
              </div>

              {contasFixas.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.65 }}>
                  Nenhuma conta fixa cadastrada. Use “Adicionar” para registrar aluguel, internet, energia, etc.
                </div>
              ) : (
                <div className="bill-list">
                  {contasFixas.slice(0, 8).map((b) => (
                    <div key={b.id} className="bill-item">
                      <div className="bill-ico" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                      <div className="bill-info">
                        <div className="bill-name">{b.descricao}</div>
                        <div className="bill-due">Vence dia {b.dia_vencimento} · {methodLabel(b.metodo_pagamento)}</div>
                      </div>
                      <div>
                        <div className="bill-amount">{fmt(b.valor)}</div>
                        <div className="bill-status">· Aguardando</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="total-strip">
                <label>Total em contas fixas</label>
                <span>{fmt(contasFixasMensal)}</span>
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  <div className="dot blue" />
                  Financiamentos <span className="section-count">{financiamentos.length} ativos</span>
                </div>
              </div>

              {financiamentos.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.65 }}>
                  Nenhum financiamento cadastrado. Use “Adicionar” para registrar parcelas e impacto mensal.
                </div>
              ) : (
                <div className="fin-list">
                  {financiamentos.slice(0, 6).map((f) => {
                    const total = Number((f as any).parcelas_total) || 0
                    const pagas = Number((f as any).parcelas_pagas) || 0
                    const pct = total > 0 ? Math.round((pagas / total) * 100) : 0
                    return (
                      <div key={f.id} className="fin-item">
                        <div className="fin-top">
                          <div className="fin-name">{f.descricao}</div>
                          <div className="fin-tag">{(f as any).financiamento_tipo || "Financiamento"}</div>
                        </div>
                        <div className="fin-progress">
                          <div className="fin-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="fin-meta">
                          <span>{fmt(Number((f as any).valor_parcela ?? f.valor) || 0)}/mês</span>
                          <span>{total > 0 ? `${pagas}/${total} parcelas` : "parcelas não informadas"}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-right">
            <div className="card">
              <div className="card-title">Previsão próximos meses</div>
              <div className="forecast-months">
                {[0, 1, 2].map((i) => {
                  const d = new Date()
                  d.setMonth(d.getMonth() + i)
                  const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
                  const expenses = totalComprometido
                  const income = rendaRef
                  const max = Math.max(1, income, expenses)
                  const wIncome = Math.round((income / max) * 140)
                  const wExp = Math.round((expenses / max) * 140)
                  return (
                    <div key={label} className="fc-row">
                      <div className="fc-label">{label}</div>
                      <div className="fc-bars">
                        <div className="fc-bar-wrap">
                          <div className="fc-bar income" style={{ width: `${wIncome}px` }} />
                          <div className="fc-val">{fmt(income)}</div>
                        </div>
                        <div className="fc-bar-wrap">
                          <div className={["fc-bar", i === 0 ? "expense" : "projected"].join(" ")} style={{ width: `${wExp}px` }} />
                          <div className="fc-val">{fmt(expenses)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Próximos vencimentos</div>
              {upcoming.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--t2)" }}>Sem itens próximos.</div>
              ) : (
                <div className="upcoming-list">
                  {upcoming.map((u) => {
                    const d = new Date(u.dateISO + "T00:00:00")
                    const day = d.getDate()
                    const mon = monthShortPt(u.dateISO)
                    return (
                      <div key={u.id} className="upcoming-item">
                        <div className="upcoming-day" aria-hidden="true">
                          <div className="day">{String(day).padStart(2, "0")}</div>
                          <div className="mon">{mon}</div>
                        </div>
                        <div className="upcoming-info">
                          <div className="upcoming-name">{u.label}</div>
                          <div className="upcoming-cat">{u.kind === "assinatura" ? "Assinatura" : u.kind === "financiamento" ? "Financiamento" : "Conta fixa"} · {u.meta}</div>
                        </div>
                        <div className="upcoming-amount">{fmt(u.value)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card" style={{ background: "linear-gradient(135deg,rgba(22,163,74,.08),rgba(22,163,74,.03))", borderColor: "rgba(34,197,94,.15)" }}>
              <div className="card-title">Insight IA</div>
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65 }}>
                {rendaRef > 0 ? (
                  <>Recorrências representam <strong style={{ color: "var(--t1)" }}>{Math.round((totalComprometido / Math.max(1, rendaRef)) * 100)}%</strong> da sua renda de referência. Tente manter abaixo de <strong style={{ color: "var(--green-b)" }}>15%</strong>.</>
                ) : (
                  "Dados insuficientes: informe sua renda mensal no perfil para previsões melhores."
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogPrimitive.Root open={addOpen} onOpenChange={setAddOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000 }} />
            <DialogPrimitive.Content
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: "min(640px, calc(100vw - 24px))",
                background: "var(--bg-c)",
                border: "1px solid var(--bd)",
                borderRadius: 16,
                padding: 18,
                zIndex: 2100,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.01em" }}>Adicionar ao planejamento</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4, lineHeight: 1.5 }}>Nada é cobrado automaticamente. Você só organiza e prevê.</div>
                </div>
                <DialogPrimitive.Close asChild>
                  <button type="button" className="btn btn-ghost" style={{ padding: "5px 9px", fontSize: 12 }}>✕ Fechar</button>
                </DialogPrimitive.Close>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {([
                  { id: "assinatura", label: "Assinatura", icon: "🔁", desc: "Recorrente" },
                  { id: "conta_fixa", label: "Conta fixa", icon: "📄", desc: "Mensal fixo" },
                  { id: "financiamento", label: "Financiamento", icon: "🏦", desc: "Parcelas" },
                ] as Array<{ id: AddKind; label: string; icon: string; desc: string }>).map((k) => {
                  const active = addKind === k.id
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setAddKind(k.id)}
                      className="btn btn-ghost"
                      style={{
                        justifyContent: "center",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: "12px 8px",
                        background: active ? "rgba(22,163,74,.12)" : "var(--bg-s)",
                        color: active ? "var(--t1)" : "var(--t2)",
                        borderColor: active ? "rgba(34,197,94,.3)" : "var(--bd)",
                        fontSize: 12,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <span style={{ fontSize: 20, lineHeight: 1 }}>{k.icon}</span>
                      <span>{k.label}</span>
                      {active && <span style={{ fontSize: 10, color: "rgba(34,197,94,.7)", fontWeight: 400 }}>{k.desc}</span>}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Nome</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="form-input"
                    style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Valor</label>
                  <input
                    value={valorRaw}
                    onChange={(e) => setValorRaw(formatBRLInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Dia</label>
                  <input
                    value={dia}
                    onChange={(e) => setDia(Number(e.target.value || "10"))}
                    inputMode="numeric"
                    type="number"
                    min={1}
                    max={31}
                    style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)" }}
                  />
                </div>

                {addKind === "assinatura" ? (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Recorrência</label>
                    <select
                      value={recorrencia}
                      onChange={(e) => setRecorrencia(e.target.value as any)}
                      style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)" }}
                    >
                      {(["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"] as const).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Método</label>
                  <select
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value as any)}
                    style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)" }}
                  >
                    {methodOptions().map((o) => (
                      <option key={String(o.value)} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Categoria</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)" }}
                  >
                    <option value="">— Opcional —</option>
                    {cats
                      .filter((c) => c.tipo === "despesa")
                      .slice(0, 60)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji || "📦"} {c.nome}</option>
                      ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Observação</label>
                  <textarea
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    rows={3}
                    style={{ marginTop: 6, width: "100%", background: "var(--bg-s)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 12px", color: "var(--t1)", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--bd)" }}>
                <DialogPrimitive.Close asChild>
                  <button type="button" className="btn btn-ghost">Cancelar</button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitAdd}
                  disabled={saving}
                  style={{ minWidth: 100, fontWeight: 600 }}
                >
                  {saving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Salvando...
                    </span>
                  ) : "✓ Salvar"}
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        {manageSubsOpen && user ? (
          <ManageSubscriptionsModal
            userId={user.id}
            lang={lang}
            currency={currency}
            assinaturas={assinaturas}
            onClose={() => setManageSubsOpen(false)}
            onChanged={async () => {
              await reloadAll()
              requestSync()
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
