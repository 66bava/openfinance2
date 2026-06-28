import { useEffect, useMemo, useState } from "react"
import { useOutletContext } from "react-router"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency, formatShortDate } from "../../../lib/format"
import { getGastosPorMetodoPagamento, getTransacoesPeriodo, type MetodoPagamentoStats } from "../../../lib/queries"
import { getCurrentCycleRange, getLastCycles } from "../../../lib/financial-cycle"
import { getUserFinancialSettings } from "../../../lib/queries/financial-settings"
import type { MetodoPagamento, Transacao } from "../../../lib/types"
import { PanelLoader } from "../../components/PanelLoader"
import type { AppOutletContext } from "../../../app/components/Layout"

type Period = "7d" | "mes" | "3m" | "ano"

type MethodCard = {
  key: string
  metodo: MetodoPagamento | null
  label: string
  icon: string
  color: string
  tint: string
}

const METHOD_CARDS: MethodCard[] = [
  { key: "credito", metodo: "credito", label: "Crédito", icon: "💳", color: "#3B82F6", tint: "rgba(59,130,246,.12)" },
  { key: "pix", metodo: "pix", label: "Pix", icon: "🟢", color: "var(--green)", tint: "rgba(22,163,74,.12)" },
  { key: "pix_qr_code", metodo: "pix_qr_code", label: "Pix QR", icon: "📷", color: "var(--green)", tint: "rgba(22,163,74,.08)" },
  { key: "dinheiro", metodo: "dinheiro", label: "Dinheiro", icon: "💵", color: "var(--amber)", tint: "rgba(245,158,11,.12)" },
  { key: "transferencia", metodo: "transferencia", label: "TED", icon: "🔀", color: "var(--purple)", tint: "rgba(139,92,246,.12)" },
  { key: "debito", metodo: "debito", label: "Débito", icon: "🏧", color: "var(--t2)", tint: "rgba(255,255,255,.04)" },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function methodDisplayName(m: MetodoPagamento | null) {
  if (!m) return "Não informado"
  if (m === "credito") return "Cartão de Crédito"
  if (m === "debito") return "Cartão de Débito"
  if (m === "pix") return "Pix Chave"
  if (m === "pix_qr_code") return "Pix QR Code"
  if (m === "dinheiro") return "Dinheiro"
  if (m === "transferencia") return "TED / DOC"
  if (m === "boleto") return "Boleto"
  if (m === "debito_automatico") return "Débito automático"
  if (m === "outro") return "Outro"
  return String(m)
}

function pickRecentLabel(tx: Transacao, lang: string) {
  return formatShortDate(tx.data, lang)
}

function amountLabel(tx: Transacao, lang: string) {
  const neg = tx.tipo === "despesa"
  return `${neg ? "−" : "+"}${formatCurrency(tx.valor, lang)}`
}

function safePct(part: number, total: number) {
  if (!(total > 0)) return 0
  return Math.round((part / total) * 100)
}

function monthShortLabel(i: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - (4 - i))
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
}

function groupOther(stats: MetodoPagamentoStats[], known: Set<string>) {
  let total = 0
  let count = 0
  for (const s of stats) {
    const key = String((s.metodo_pagamento as any) ?? "null")
    if (known.has(key)) continue
    total += Number(s.total) || 0
    count += Number(s.count) || 0
  }
  return { total, count }
}

export default function PagamentosPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()
  const { syncNonce } = useOutletContext<AppOutletContext>()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("mes")
  const [selected, setSelected] = useState<string>("credito")

  const [stats, setStats] = useState<MetodoPagamentoStats[]>([])
  const [recent, setRecent] = useState<Transacao[]>([])
  const [trend, setTrend] = useState<Array<{ label: string; credito: number; pix: number; outros: number }>>([])

  const range = useMemo(() => {
    if (!user) return null
    if (period === "7d") return { inicio: daysAgoISO(6), fim: todayISO() }
    return null
  }, [period, user?.id])

  useEffect(() => {
    if (!user) return
    const userId = user.id
    setLoading(true)
    ;(async () => {
      try {
        let r: { inicio: string; fim: string } | undefined = undefined
        if (period === "7d") r = { inicio: daysAgoISO(6), fim: todayISO() }
        if (period === "mes") r = undefined
        if (period === "3m" || period === "ano") {
          const settings = await getUserFinancialSettings(userId)
          const cycles = getLastCycles({ cycle_start_day: settings.cycle_start_day }, period === "3m" ? 3 : 12)
          r = { inicio: cycles[0]!.inicio, fim: cycles[cycles.length - 1]!.fim }
        }

        const [s, txs] = await Promise.all([
          getGastosPorMetodoPagamento(userId, r),
          r
            ? getTransacoesPeriodo(userId, r.inicio, r.fim)
            : (async () => {
                const settings = await getUserFinancialSettings(userId)
                const c = getCurrentCycleRange({ cycle_start_day: settings.cycle_start_day })
                return getTransacoesPeriodo(userId, c.inicio, c.fim)
              })(),
        ])

        setStats(s)
        setRecent((txs || []).filter((t) => t.tipo === "despesa").slice(0, 60))

        const settings = await getUserFinancialSettings(userId)
        const cycles = getLastCycles({ cycle_start_day: settings.cycle_start_day }, 5)
        const rows = await Promise.all(
          cycles.map(async (c) => {
            const ss = await getGastosPorMetodoPagamento(userId, { inicio: c.inicio, fim: c.fim })
            const known = new Set(["credito", "pix"])
            const credito = ss.find((x) => x.metodo_pagamento === "credito")?.total ?? 0
            const pix = ss.find((x) => x.metodo_pagamento === "pix")?.total ?? 0
            const outros = groupOther(ss, known).total
            return { label: c.label, credito, pix, outros }
          }),
        )
        setTrend(rows)
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.id, period, syncNonce])

  const fmt = (v: number) => formatCurrency(v, lang, currency)

  const totalGasto = useMemo(() => stats.reduce((s, x) => s + (Number(x.total) || 0), 0), [stats])
  const totalTx = useMemo(() => stats.reduce((s, x) => s + (Number(x.count) || 0), 0), [stats])
  const ticketMedio = totalTx > 0 ? totalGasto / totalTx : 0

  const knownKeys = useMemo(() => new Set(METHOD_CARDS.map((c) => c.key)), [])
  const outrosAgg = useMemo(() => groupOther(stats, knownKeys), [stats, knownKeys])

  const cardsData = useMemo(() => {
    const by = new Map<string, { total: number; count: number }>()
    for (const s of stats) {
      const key = String((s.metodo_pagamento as any) ?? "null")
      by.set(key, { total: Number(s.total) || 0, count: Number(s.count) || 0 })
    }

    return METHOD_CARDS.map((c) => {
      const v = by.get(c.key) ?? { total: 0, count: 0 }
      const pct = safePct(v.total, totalGasto)
      return { ...c, total: v.total, count: v.count, pct }
    })
  }, [stats, totalGasto])

  const selectedCard = cardsData.find((c) => c.key === selected) ?? cardsData[0]!
  const mostUsed = useMemo(() => {
    const top = cardsData.slice().sort((a, b) => b.count - a.count)[0]
    return top ?? null
  }, [cardsData])

  const recentsForSelected = useMemo(() => {
    const key = selectedCard.key
    const filtered = recent.filter((t) => String((t.metodo_pagamento as any) ?? "null") === key)
    return filtered.slice(0, 6)
  }, [recent, selectedCard.key])

  const stacked = useMemo(() => {
    const out: Array<{ key: string; label: string; flex: number; color: string }> = []
    for (const c of cardsData) {
      if (!(c.total > 0)) continue
      out.push({ key: c.key, label: c.label, flex: c.pct, color: c.color })
    }
    if (outrosAgg.total > 0) out.push({ key: "outros", label: "Outros", flex: safePct(outrosAgg.total, totalGasto), color: "#444" })
    return out
  }, [cardsData, outrosAgg.total, totalGasto])

  if (!user) return null
  if (loading) return <PanelLoader />

  const empty = totalGasto === 0

  return (
    <div className="ofx-payments">
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Métodos de Pagamento</div>
            <div className="page-sub">Como seu dinheiro está saindo — por canal e volume.</div>
          </div>
          <div className="period-tabs" role="tablist" aria-label="Período">
            {([
              { id: "7d", label: "7d" },
              { id: "mes", label: "Mês" },
              { id: "3m", label: "3m" },
              { id: "ano", label: "Ano" },
            ] as Array<{ id: Period; label: string }>).map((p) => (
              <button
                key={p.id}
                type="button"
                className={["period-tab", period === p.id ? "active" : ""].filter(Boolean).join(" ")}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {empty ? (
          <div className="card">
            <div className="card-body">
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65 }}>
                Nenhuma despesa registrada no período. Adicione transações para ver o detalhamento por método.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="methods-row" aria-label="Métodos">
              {cardsData.map((c) => (
                <div
                  key={c.key}
                  className={["method-card", selected === c.key ? "selected" : ""].filter(Boolean).join(" ")}
                  style={{
                    borderColor: selected === c.key ? c.color : undefined,
                  }}
                  onClick={() => setSelected(c.key)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="method-icon" aria-hidden="true">{c.icon}</span>
                  <div className="method-name">{c.label}</div>
                  <div className="method-total">{fmt(c.total)}</div>
                  <div className="method-pct" style={{ color: c.color }}>{c.pct}%</div>
                  <div className="method-mini-bar">
                    <div className="method-mini-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <div className="stacked-label">
                  <span>Distribuição do período</span>
                  <span style={{ fontWeight: 600, color: "var(--t1)" }}>{fmt(totalGasto)} total</span>
                </div>
                <div className="stacked-bar" aria-label="Distribuição por método">
                  {stacked.map((s) => (
                    <div key={s.key} className="stacked-seg" style={{ flex: Math.max(1, s.flex), background: s.color }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                  {stacked.map((s) => (
                    <div key={`legend-${s.key}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                      <span style={{ fontSize: 11, color: "var(--t2)" }}>{s.label} {s.flex}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="main-grid">
              <div>
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="1" y="4" width="22" height="16" rx="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      Detalhamento por Método
                    </div>
                    <button type="button" className="card-action" disabled>
                      Exportar
                    </button>
                  </div>
                  <div className="card-body">
                    {cardsData.map((c) => (
                      <div key={`detail-${c.key}`} className="detail-row">
                        <div className="detail-icon-wrap" style={{ background: c.tint }}>{c.icon}</div>
                        <div className="detail-info">
                          <div className="detail-name">{methodDisplayName(c.metodo)}</div>
                          <div className="detail-count">{c.count} transações</div>
                        </div>
                        <div className="detail-bar-wrap">
                          <div className="detail-bar-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                        </div>
                        <div className="detail-pct" style={{ color: c.color }}>{c.pct}%</div>
                        <div className="detail-total">{fmt(c.total)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      </svg>
                      Evolução por método
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t2)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "#3B82F6" }} />Crédito
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t2)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--green)" }} />Pix
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t2)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--amber)" }} />Outros
                      </div>
                    </div>

                    <div className="monthly-grid" aria-label="Evolução mensal por método">
                      {trend.map((m, i) => {
                        const max = Math.max(...trend.map((x) => x.credito + x.pix + x.outros), 1)
                        const t = m.credito + m.pix + m.outros
                        const creditoPct = Math.round((m.credito / max) * 100)
                        const pixPct = Math.round((m.pix / max) * 100)
                        const outrosPct = Math.round((m.outros / max) * 100)
                        const label = m.label || monthShortLabel(i)
                        return (
                          <div key={label} className="month-col">
                            <div className="month-bars">
                              <div className="month-bar" style={{ height: `${creditoPct}%`, background: "#3B82F6", opacity: 0.85 }} />
                              <div className="month-bar" style={{ height: `${pixPct}%`, background: "var(--green)", opacity: 0.85 }} />
                              <div className="month-bar" style={{ height: `${outrosPct}%`, background: "var(--amber)", opacity: 0.85 }} />
                            </div>
                            <div className="month-label" style={i === trend.length - 1 ? { color: "var(--green-b)" } : undefined}>
                              {label}
                              {t <= 0 ? "" : ""}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="stat-row">
                  <div className="stat-mini">
                    <div className="stat-mini-label">Total gasto</div>
                    <div className="stat-mini-val">{fmt(totalGasto)}</div>
                    <div className="stat-mini-sub" style={{ color: "var(--red)" }}>{totalTx} transações</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Ticket médio</div>
                    <div className="stat-mini-val">{fmt(ticketMedio)}</div>
                    <div className="stat-mini-sub">por transação</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Mais usado</div>
                    <div className="stat-mini-val" style={{ fontSize: 14 }}>{mostUsed ? `${mostUsed.icon} ${mostUsed.label}` : "—"}</div>
                    <div className="stat-mini-sub">{mostUsed ? `${mostUsed.count} transações` : "—"}</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Cashback est.</div>
                    <div className="stat-mini-val" style={{ color: "var(--green-b)" }}>
                      {fmt((cardsData.find((c) => c.key === "credito")?.total ?? 0) * 0.015)}
                    </div>
                    <div className="stat-mini-sub">1,5% crédito</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Recentes por {selectedCard.label}
                    </div>
                  </div>
                  <div className="card-body">
                    {recentsForSelected.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--t2)" }}>Sem transações recentes para este método.</div>
                    ) : (
                      recentsForSelected.map((t) => (
                        <div key={t.id} className="tx-item">
                          <div className="tx-icon" style={{ background: selectedCard.tint }}>{t.categorias?.emoji ?? "🧾"}</div>
                          <div className="tx-info">
                            <div className="tx-name">{t.descricao}</div>
                            <div className="tx-meta">{pickRecentLabel(t, lang)}</div>
                          </div>
                          <div className="tx-amount" style={{ color: selectedCard.color }}>{amountLabel(t, lang)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 16, background: "linear-gradient(135deg,rgba(22,163,74,.08),rgba(22,163,74,.03))", border: "1px solid rgba(34,197,94,.15)", borderRadius: "var(--r)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "var(--green-b)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Insight
                  </div>
                  <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65 }}>
                    {cardsData.find((c) => c.key === "credito")?.total
                      ? (
                        <>
                          Migrar parte dos gastos do <strong style={{ color: "var(--t1)" }}>crédito</strong> para{" "}
                          <strong style={{ color: "var(--green-b)" }}>Pix</strong> pode reduzir risco de juros caso a fatura não seja paga integralmente.
                        </>
                      )
                      : "Adicione transações com método de pagamento para a Finance App sugerir melhorias."}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
