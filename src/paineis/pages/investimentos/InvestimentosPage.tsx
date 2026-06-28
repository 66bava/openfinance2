import { useEffect, useMemo, useState } from "react"
import { Link, useOutletContext } from "react-router"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency, formatShortDate } from "../../../lib/format"
import { getInvestimentos, calcularPatrimonioEstimado } from "../../../lib/queries/investimentos"
import type { Investimento } from "../../../lib/types"
import { PanelLoader } from "../../components/PanelLoader"
import type { AppOutletContext } from "../../../app/components/Layout"

const CARD: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--bd)",
  background: "var(--bg-c)",
  padding: "20px 24px",
}

const INNER: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--bd)",
  background: "var(--bg-i)",
  padding: 16,
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "var(--t2)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: 14,
}

const METRIC_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--t3)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: 6,
}

const METRIC_VALUE: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "var(--t1)",
  letterSpacing: "-0.3px",
}

const FEATURES = [
  {
    label: "Patrimônio estimado",
    desc: "Calculado a partir dos seus aportes e categoria de cada ativo.",
  },
  {
    label: "Distribuição visual",
    desc: "Veja o peso de cada categoria de forma clara e instantânea.",
  },
  {
    label: "Aportes registrados",
    desc: "Acompanhe consistência e volume total investido ao longo do tempo.",
  },
  {
    label: "Impacto no Score",
    desc: "Investir regularmente melhora seu Score Financeiro com a Finance App.",
  },
]

function categoryLabel(key: string) {
  const map: Record<string, string> = {
    renda_fixa: "Renda fixa",
    renda_variavel: "Renda variável",
    fundos: "Fundos",
    cripto: "Cripto",
    imoveis: "Imóveis",
    outros: "Outros",
  }
  return map[key] ?? key
}

export default function InvestimentosPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()
  const { syncNonce } = useOutletContext<AppOutletContext>()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Investimento[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getInvestimentos(user.id)
      .then((inv) => setItems(inv || []))
      .finally(() => setLoading(false))
  }, [user?.id, syncNonce])

  const fmt = (v: number) => formatCurrency(v, lang, currency)
  const patrimonio = useMemo(() => calcularPatrimonioEstimado(items), [items])
  const totalAportes = useMemo(() => items.reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0), [items])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) {
      const key = i.categoria_investimento || "outros"
      map.set(key, (map.get(key) ?? 0) + (Number(i.valor_aporte) || 0))
    }
    return [...map.entries()]
      .map(([k, v]) => ({ key: k, total: v }))
      .sort((a, b) => b.total - a.total)
  }, [items])

  const brokers = useMemo(() => {
    const set = new Set<string>()
    for (const i of items) {
      const b = (i.corretora_personalizada || i.corretora || "").trim()
      if (b) set.add(b)
    }
    return [...set.values()].slice(0, 8)
  }, [items])

  if (!user) return null
  if (loading) return <PanelLoader />

  return (
    <div className="ofx-investments">
      <div className="page">
        {/* ── Page header ── */}
        <div
          style={{
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--fd)",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.4px",
                color: "var(--t1)",
                marginBottom: 4,
              }}
            >
              Investimentos
            </h1>
            <p style={{ fontSize: 14, color: "var(--t2)" }}>
              {items.length === 0
                ? "Monitore patrimônio, aportes e distribuição em um só lugar."
                : `${items.length} ${items.length === 1 ? "ativo" : "ativos"} · ${fmt(patrimonio)} estimado`}
            </p>
          </div>

          <Link
            to="/app/investimentos/gerenciar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 10,
              background: "var(--green)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {items.length === 0 ? "Cadastrar ativo" : "Gerenciar"}
          </Link>
        </div>

        {/* ── Empty state ── */}
        {items.length === 0 ? (
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto",
              padding: "40px 0 60px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: "rgba(22,163,74,0.10)",
                border: "1px solid rgba(22,163,74,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 22px",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16A34A"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>

            <h2
              style={{
                fontFamily: "var(--fd)",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--t1)",
                letterSpacing: "-0.3px",
                marginBottom: 10,
              }}
            >
              Comece a monitorar seu patrimônio
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--t2)",
                lineHeight: 1.65,
                maxWidth: 420,
                margin: "0 auto 32px",
              }}
            >
              Registre ações, renda fixa, FIIs, fundos e cripto. A Finance App calcula patrimônio
              estimado, distribuição por categoria e impacto no seu Score automaticamente.
            </p>

            {/* Feature cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 32,
                textAlign: "left",
              }}
            >
              {FEATURES.map((f) => (
                <div key={f.label} style={{ ...INNER }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <Link
              to="/app/investimentos/gerenciar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 12,
                background: "var(--green)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Cadastrar primeiro ativo
            </Link>
          </div>
        ) : (
          /* ── Data state: 2-column layout ── */
          <div className="layout">
            {/* Left column */}
            <section style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
              {/* Resumo */}
              <div style={CARD}>
                <div style={SECTION_TITLE}>Resumo</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={INNER}>
                    <div style={METRIC_LABEL}>Patrimônio estimado</div>
                    <div style={METRIC_VALUE}>{fmt(patrimonio)}</div>
                  </div>
                  <div style={INNER}>
                    <div style={METRIC_LABEL}>Total aportado</div>
                    <div style={METRIC_VALUE}>{fmt(totalAportes)}</div>
                  </div>
                  <div style={INNER}>
                    <div style={METRIC_LABEL}>Categorias</div>
                    <div style={METRIC_VALUE}>{byCategory.length}</div>
                  </div>
                  <div style={INNER}>
                    <div style={METRIC_LABEL}>Corretoras</div>
                    <div style={METRIC_VALUE}>{brokers.length || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Ativos */}
              <div style={CARD}>
                <div style={SECTION_TITLE}>Ativos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.slice(0, 10).map((i) => (
                    <div
                      key={i.id}
                      style={{
                        ...INNER,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 16px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--t1)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {i.nome}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                          {categoryLabel(i.categoria_investimento || "outros")}
                          {i.data_investimento ? ` · ${formatShortDate(i.data_investimento, lang)}` : ""}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--t1)",
                          flexShrink: 0,
                        }}
                      >
                        {fmt(i.valor_aporte)}
                      </div>
                    </div>
                  ))}
                  {items.length > 10 && (
                    <Link
                      to="/app/investimentos/gerenciar"
                      style={{
                        display: "block",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--green-b, var(--green))",
                        padding: "10px 0 2px",
                        textDecoration: "none",
                      }}
                    >
                      Ver todos os {items.length} ativos →
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Right column */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
              {/* Distribuição */}
              <div style={CARD}>
                <div style={SECTION_TITLE}>Distribuição</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {byCategory.map((c) => {
                    const pct = totalAportes > 0 ? Math.round((c.total / totalAportes) * 100) : 0
                    return (
                      <div key={c.key}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--t2)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {categoryLabel(c.key)}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--t1)", flexShrink: 0 }}>
                            {pct}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: "var(--bd)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 999,
                              width: `${pct}%`,
                              background: "var(--green)",
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{fmt(c.total)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Corretoras */}
              {brokers.length > 0 && (
                <div style={CARD}>
                  <div style={SECTION_TITLE}>Corretoras</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {brokers.map((b) => (
                      <span
                        key={b}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          border: "1px solid var(--bd)",
                          background: "var(--bg-i)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--t2)",
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to full page */}
              <Link
                to="/app/investimentos/gerenciar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px",
                  borderRadius: 14,
                  border: "1px solid var(--bd)",
                  background: "var(--bg-i)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--t1)",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Gerenciar investimentos
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
