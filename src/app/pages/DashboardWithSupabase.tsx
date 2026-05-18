import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useAuth } from "../../lib/auth-context"
import { useLanguage } from "../../lib/language-context"
import { Link } from "react-router"
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from "recharts"
import {
  ArrowDownRight, ArrowUpRight, Wallet, PiggyBank,
  Plus, TrendingUp, TrendingDown, Users, Check, X, Trash2,
  AlertCircle, CalendarDays,
} from "lucide-react"
import {
  getTotaisMes, getGastosPorCategoria,
  getTransacoesMes, getEvolucaoMensal,
  deleteTransacao,
} from "../../lib/queries"
import { getInvestimentos, calcularPatrimonioEstimado } from "../../lib/queries/investimentos"
import { getAssinaturas, calcularTotalMensal } from "../../lib/queries/assinaturas"
import { getCompromissos } from "../../lib/queries/futuro"
import type { Investimento, Assinatura, Compromisso } from "../../lib/types"
import { formatCurrency, formatDate, formatShortDate } from "../../lib/format"
import { getMinhaMembresia, getAdminPerfil, responderConvite } from "../../lib/queries/familia"
import { AddTransactionModal } from "../components/dashboard/AddTransactionModal"
import { ScoreAdvisor } from "../components/dashboard/ScoreAdvisor"
import { ScorePanel } from "../components/dashboard/ScorePanel"
import { FinancialCycleSettingsModal } from "../components/dashboard/FinancialCycleSettingsModal"
import { calculateFinancialScore } from "../../score-engine"

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string, t: (k: string) => string) {
  const d = new Date(dateStr + "T00:00:00")
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t("dashHoje")
  if (d.toDateString() === yesterday.toDateString()) return t("dashOntem")
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function scoreColor(score: number) {
  if (score >= 850) return "#16A34A"
  if (score >= 700) return "#84CC16"
  if (score >= 400) return "#F59E0B"
  return "#EF4444"
}

function scoreLabel(score: number, t: (k: string) => string) {
  if (score >= 850) return t("dashExcelente")
  if (score >= 700) return t("dashOtimo")
  if (score >= 400) return t("dashRegular")
  return t("dashCritico")
}

const CATEGORY_COLORS = ["#0A0A0A", "#16A34A", "#525252", "#A3A3A3", "#DCFCE7", "#BBF7D0"]

const CATEGORY_ICONS: Record<string, string> = {
  Alimentação: "🍽️",
  Transporte: "🚌",
  Saúde: "🏥",
  Educação: "📚",
  Entretenimento: "🎬",
  Moradia: "🏠",
  Lazer: "🎮",
}

function categoryIcon(nome: string) {
  return CATEGORY_ICONS[nome] ?? "📦"
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <div style={{
      background: "var(--of-surface)",
      borderRadius: 16,
      border: "1px solid var(--of-border)",
      padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s",
    }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </p>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} color={iconColor} strokeWidth={2} />
        </div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--of-text)", marginBottom: 4 }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: 12, fontWeight: 500,
          color: trend === "up" ? "#16A34A" : trend === "down" ? "#EF4444" : "#A3A3A3",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {trend === "up" && <TrendingUp size={12} />}
          {trend === "down" && <TrendingDown size={12} />}
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  const { lang } = useLanguage()
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--of-surface)",
      border: "1px solid var(--of-border)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      fontSize: 12,
    }}>
      <p style={{ fontWeight: 600, color: "var(--of-text)", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {formatCurrency(p.value, lang)}
        </p>
      ))}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardWithSupabase() {
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const userId = user!.id
  const fmt = (v: number) => formatCurrency(v, lang)

  const [totais, setTotais] = useState({ totalGastos: 0, totalRenda: 0, saldoDisponivel: 0, percentualEconomia: 0 })
  const [categorias, setCategorias] = useState<any[]>([])
  const [transacoes, setTransacoes] = useState<any[]>([])
  const [evolucao, setEvolucao] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [cycleModalOpen, setCycleModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [convitePendente, setConvitePendente] = useState<any>(null)
  const [adminConvite, setAdminConvite] = useState<any>(null)
  const [conviteLoading, setConviteLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [investInfo, setInvestInfo] = useState({
    total: 0,
    patrimonio: 0,
    count: 0,
    recorrentes: 0,
    diversificacao: 0,
    aportesPorMes: [] as Array<{ month: string; value: number }>,
    ultimos: [] as Investimento[],
  })
  const [subInfo, setSubInfo] = useState({
    totalMensal: 0,
    count: 0,
    proximas: [] as Assinatura[],
  })
  const [finInfo, setFinInfo] = useState({
    totalMensal: 0,
    count: 0,
    itens: [] as Compromisso[],
  })

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"
  const score = calculateFinancialScore({
    totalRendaPeriodo: totais.totalRenda,
    totalGastosPeriodo: totais.totalGastos,
    assinaturasMensal: subInfo.totalMensal,
    compromissosMensal: finInfo.totalMensal,
    investimentos: {
      totalAportes: investInfo.total,
      patrimonioEstimado: investInfo.patrimonio,
      recorrentes: investInfo.recorrentes,
      diversificacao: investInfo.diversificacao,
    },
    evolucao: evolucao.map((e) => ({ income: e.income, expenses: e.expenses })),
  }).score

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [t, c, tx, ev] = await Promise.all([
          getTotaisMes(userId),
          getGastosPorCategoria(userId),
          getTransacoesMes(userId),
          getEvolucaoMensal(userId),
        ])
        setTotais(t)
        setCategorias(c)
        setTransacoes(tx.slice(0, 8))
        setEvolucao(ev)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    async function loadConvite() {
      try {
        const mem = await getMinhaMembresia(userId)
        if (mem?.status === "pendente") {
          setConvitePendente(mem)
          if (mem.grupo?.admin_id) {
            const admin = await getAdminPerfil(mem.grupo.admin_id)
            setAdminConvite(admin)
          }
        } else {
          setConvitePendente(null)
          setAdminConvite(null)
        }
      } catch { /* silent */ }
    }
    async function loadInvestimentos() {
      try {
        const invs = await getInvestimentos(userId)
        const total = invs.reduce((a, i) => a + i.valor_aporte, 0)
        const patrimonio = calcularPatrimonioEstimado(invs)
        const recorrentes = invs.filter((i) => i.aporte_recorrente).length
        const diversificacao = new Set(invs.map((i) => i.categoria_investimento)).size

        const byMonth = new Map<string, number>()
        for (const inv of invs) {
          const m = inv.data_investimento.slice(0, 7) // YYYY-MM
          byMonth.set(m, (byMonth.get(m) ?? 0) + inv.valor_aporte)
        }
        const aportesPorMes = [...byMonth.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([month, value]) => ({ month, value }))

        setInvestInfo({
          total,
          patrimonio,
          count: invs.length,
          recorrentes,
          diversificacao,
          aportesPorMes,
          ultimos: invs.slice(0, 3),
        })
      } catch { /* silent */ }
    }
    async function loadAssinaturas() {
      try {
        const subs = await getAssinaturas(userId)
        const totalMensal = calcularTotalMensal(subs)
        setSubInfo({
          totalMensal,
          count: subs.length,
          proximas: subs.filter((s) => !!s.proximo_pagamento).slice(0, 3),
        })
      } catch { /* silent */ }
    }
    async function loadFinanciamentos() {
      try {
        const fins = await getCompromissos(userId)
        const totalMensal = fins.reduce((s, c) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0)
        setFinInfo({
          totalMensal,
          count: fins.length,
          itens: fins.slice(0, 3),
        })
      } catch { /* silent */ }
    }
    load()
    loadConvite()
    loadInvestimentos()
    loadAssinaturas()
    loadFinanciamentos()
  }, [userId, refreshKey])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}
      >
        <div style={{
          width: 32, height: 32,
          border: "2.5px solid rgba(22,163,74,0.2)",
          borderTopColor: "#16A34A",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <p style={{ fontSize: 13, color: "var(--of-text-muted)", fontWeight: 500 }}>
          Carregando seu dashboard...
        </p>
      </motion.div>
    )
  }

  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div style={{ padding: "20px 20px 24px", maxWidth: 1440, margin: "0 auto", fontFamily: "var(--font-body)" }}
      className="lg:p-8">

      {/* Banner de convite familiar */}
      {convitePendente && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)",
          border: "1px solid #86EFAC", borderRadius: 12,
          padding: "14px 18px", marginBottom: 20, flexWrap: "wrap" as const,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "#16A34A", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Users size={18} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", marginBottom: 2 }}>
              {t("dashConviteFamilia")}
            </p>
            <p style={{ fontSize: 12, color: "#166534", lineHeight: 1.4 }}>
              <strong>{adminConvite?.nome || adminConvite?.email || "Alguém"}</strong> {t("dashConvidouPara")} "{convitePendente.grupo?.nome || "Família"}"
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                setConviteLoading(true)
                try {
                  await responderConvite(convitePendente.id, false)
                  setConvitePendente(null)
                } finally { setConviteLoading(false) }
              }}
              disabled={conviteLoading}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", background: "#fff",
                color: "#374151", fontWeight: 600, fontSize: 12,
                border: "1px solid #D1D5DB", borderRadius: 8,
                cursor: "pointer", transition: "background 0.1s",
              }}
            >
              <X size={13} /> {t("dashRecusar")}
            </button>
            <button
              onClick={async () => {
                setConviteLoading(true)
                try {
                  await responderConvite(convitePendente.id, true)
                  setConvitePendente(null)
                } finally { setConviteLoading(false) }
              }}
              disabled={conviteLoading}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", background: "#16A34A",
                color: "#fff", fontWeight: 700, fontSize: 12,
                border: "none", borderRadius: 8,
                cursor: "pointer", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#15803D" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#16A34A" }}
            >
              <Check size={13} /> {t("dashAceitar")}
            </button>
          </div>
        </div>
      )}

      {/* Saudação */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginBottom: 4 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
            {t("dashBomDia")}, {userName} 👋
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button
              onClick={() => setCycleModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--of-text)",
                backgroundColor: "var(--of-surface)",
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid var(--of-border)",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "var(--of-hover)"; e.currentTarget.style.borderColor = "var(--of-text)" }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "var(--of-surface)"; e.currentTarget.style.borderColor = "var(--of-border)" }}
            >
              <CalendarDays size={15} />
              Ciclo
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--of-btn-text)",
                backgroundColor: "var(--of-btn-bg)",
                padding: "9px 18px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#262626")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--of-btn-bg)")}
            >
              <Plus size={15} />
              {t("dashNovaTx")}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ display: "grid", gap: 16, marginBottom: 24 }}
        className="grid grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label={t("dashSaldo")}
          value={fmt(totais.saldoDisponivel)}
          sub={mesAtual}
          icon={Wallet}
          iconBg="var(--of-page-bg)"
          iconColor="var(--of-text-secondary)"
          trend="neutral"
        />
        <StatCard
          label={t("dashReceitas")}
          value={fmt(totais.totalRenda)}
          sub={t("dashMesAtual")}
          icon={ArrowUpRight}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          trend="up"
        />
        <StatCard
          label={t("dashDespesas")}
          value={fmt(totais.totalGastos)}
          sub={`${totais.totalRenda > 0 ? ((totais.totalGastos / totais.totalRenda) * 100).toFixed(0) : 0}% ${t("dashDaRenda")}`}
          icon={ArrowDownRight}
          iconBg="#FEE2E2"
          iconColor="#EF4444"
          trend="down"
        />
        <StatCard
          label={t("dashEconomia")}
          value={`${totais.percentualEconomia.toFixed(1)}%`}
          sub={t("dashDaRendaTotal")}
          icon={PiggyBank}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          trend={totais.percentualEconomia > 20 ? "up" : "neutral"}
        />
      </motion.div>

      {/* Investimentos + Assinaturas */}
      <div style={{ display: "grid", gap: 16, marginBottom: 24 }} className="grid grid-cols-1 lg:grid-cols-2">
        <div style={{
          background: "var(--of-surface)",
          borderRadius: 16,
          border: "1px solid var(--of-border)",
          padding: "18px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text)", marginBottom: 2 }}>
                {t("dashInvestResumoTitulo")}
              </p>
              <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>
                {t("dashInvestResumoSub")}
              </p>
            </div>
            <Link to="/app/investimentos" style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", textDecoration: "none" }}>
              {t("dashVerTodas")}
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--of-text-muted)", fontWeight: 700 }}>
                {t("dashInvestPatrimonio")}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--of-text)", marginTop: 2 }}>
                {fmt(investInfo.patrimonio)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--of-text-muted)", fontWeight: 700 }}>
                {t("dashInvestTotalAportes")}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--of-text)", marginTop: 2 }}>
                {fmt(investInfo.total)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--of-text-muted)", fontWeight: 700 }}>
                {t("dashInvestRecorrentes")}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--of-text)", marginTop: 2 }}>
                {investInfo.recorrentes}
              </p>
            </div>
          </div>

          {investInfo.aportesPorMes.length > 0 ? (
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={investInfo.aportesPorMes.map((p) => ({
                    month: formatShortDate(p.month + "-01", lang),
                    value: p.value,
                  }))}
                  margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--of-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--of-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--of-text-muted)" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${t("commonMoedaAbrev")}${(v / 1000).toFixed(0)}k`} width={48} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name={t("dashInvestAportes")} fill="#16A34A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: "12px 0" }}>
              <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>{t("dashInvestSemDados")}</p>
            </div>
          )}

          {investInfo.ultimos.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--of-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("dashInvestUltimosAportes")}
              </p>
              {investInfo.ultimos.map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inv.nome}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                      {formatDate(inv.data_investimento, lang)}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text)" }}>{fmt(inv.valor_aporte)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          background: "var(--of-surface)",
          borderRadius: 16,
          border: "1px solid var(--of-border)",
          padding: "18px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text)", marginBottom: 2 }}>
                Planejamento futuro
              </p>
              <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>
                Assinaturas e financiamentos que pesam no seu mês.
              </p>
            </div>
            <Link to="/app/futuro" style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", textDecoration: "none" }}>
              Ver detalhes
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--of-text-muted)", fontWeight: 700 }}>
                Assinaturas / mês
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--of-text)", marginTop: 2 }}>
                {fmt(subInfo.totalMensal)}
              </p>
              <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 2 }}>{subInfo.count} ativas</p>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--of-text-muted)", fontWeight: 700 }}>
                Financiamentos / mês
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--of-text)", marginTop: 2 }}>
                {fmt(finInfo.totalMensal)}
              </p>
              <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 2 }}>{finInfo.count} ativos</p>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--of-text-muted)", fontWeight: 700 }}>
                Total recorrente
              </p>
              <p style={{ fontSize: 16, fontWeight: 900, color: "#EF4444", marginTop: 2 }}>
                {fmt(subInfo.totalMensal + finInfo.totalMensal)}
              </p>
              <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 2 }}>por mês (estimado)</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {subInfo.proximas.slice(0, 2).map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: (a.cor || "#16A34A") + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14 }}>{a.icone || "💳"}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.nome}
                    </p>
                    {a.proximo_pagamento && (
                      <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                        Próx.: {formatDate(a.proximo_pagamento, lang)}
                      </p>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text)" }}>{formatCurrency(a.valor, lang)}</p>
              </div>
            ))}

            {finInfo.itens.slice(0, 1).map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#2563EB22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14 }}>🏦</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.descricao}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                      Vence dia {f.dia_vencimento}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--of-text)" }}>{fmt(Number((f as any).valor_parcela ?? f.valor) || 0)}</p>
              </div>
            ))}

            {subInfo.proximas.length === 0 && finInfo.itens.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>
                Nenhum item recorrente cadastrado.
              </p>
            )}
          </div>

          {totais.totalRenda > 0 && (subInfo.totalMensal + finInfo.totalMensal) / totais.totalRenda > 0.25 && (
            <div style={{
              marginTop: 12,
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 12,
            }}>
              <AlertCircle size={16} color="#EF4444" />
              <p style={{ fontSize: 12, color: "#991B1B", lineHeight: 1.4 }}>
                Recorrentes acima de 25% da sua renda. Vale revisar antes do próximo mês.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 lg:grid-cols-12">

        {/* Left column */}
        <div className="lg:col-span-8" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Evolução mensal — LineChart */}
          <div style={{
            background: "var(--of-surface)",
            borderRadius: 16,
            border: "1px solid var(--of-border)",
            padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)" }}>{t("dashReceitasVsDespesas")}</h3>
                <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>{t("dashUltimos6Meses")}</p>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "var(--of-text-secondary)",
                background: "var(--of-page-bg)", borderRadius: 8, padding: "5px 10px",
              }}>
                6 meses
              </span>
            </div>

            {evolucao.length === 0 ? (
              <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{t("dashSemDados")}</p>
                <Link to="/app/adicionar" style={{ fontSize: 13, fontWeight: 600, color: "#16A34A", textDecoration: "none" }}>
                  {t("dashAddFirstTx")}
                </Link>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={evolucao} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--of-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--of-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--of-text-muted)" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone" dataKey="income" name="Receitas"
                      stroke="#16A34A" strokeWidth={2.5}
                      dot={{ fill: "#16A34A", r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone" dataKey="expenses" name="Despesas"
                      stroke="#EF4444" strokeWidth={2.5}
                      dot={{ fill: "#EF4444", r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                  {[{ cor: "#16A34A", label: t("dashReceitas") }, { cor: "#EF4444", label: t("dashDespesas") }].map((l) => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 20, height: 3, borderRadius: 2, background: l.cor }} />
                      <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Transações recentes */}
          <div style={{
            background: "var(--of-surface)",
            borderRadius: 16,
            border: "1px solid var(--of-border)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)" }}>{t("dashTxRecentes")}</h3>
              <Link to="/app/analise" style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", textDecoration: "none" }}>
                {t("dashVerTodas")}
              </Link>
            </div>

            {transacoes.length === 0 ? (
              <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <p style={{ fontSize: 14, color: "var(--of-text-muted)" }}>{t("dashNenhumaTx")}</p>
                <Link to="/app/adicionar" style={{
                  fontSize: 13, fontWeight: 700, color: "var(--of-btn-text)",
                  background: "var(--of-btn-bg)", padding: "10px 20px", borderRadius: 8, textDecoration: "none",
                }}>
                  {t("dashAddFirstTxBtn")}
                </Link>
              </div>
            ) : (
              <div>
                {transacoes.map((tx: any) => {
                  const isConfirming = confirmDeleteId === tx.id
                  const isDeleting = deletingId === tx.id
                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 16px",
                        borderBottom: "1px solid var(--of-border-light)",
                        background: isConfirming ? "#FEF2F2" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={(e) => { if (!isConfirming) e.currentTarget.style.background = "var(--of-hover)" }}
                      onMouseOut={(e) => { if (!isConfirming) e.currentTarget.style.background = "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9,
                          background: tx.tipo === "receita" ? "#DCFCE7" : "var(--of-page-bg)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 15, flexShrink: 0,
                        }}>
                          {categoryIcon(tx.categorias?.nome || "")}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tx.descricao || "—"}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 1 }}>
                            {tx.categorias?.nome || "Outros"} · {fmtDate(tx.data, t)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: tx.tipo === "receita" ? "#16A34A" : "#EF4444" }}>
                          {tx.tipo === "receita" ? "+" : "-"}{fmt(tx.valor)}
                        </span>

                        {isConfirming ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>{t("dashRemover")}?</span>
                            <button
                              onClick={async () => {
                                setDeletingId(tx.id)
                                setConfirmDeleteId(null)
                                try {
                                  await deleteTransacao(tx.id)
                                  setTransacoes((prev) => prev.filter((t) => t.id !== tx.id))
                                  setRefreshKey((k) => k + 1)
                                } catch {
                                  // silent
                                } finally {
                                  setDeletingId(null)
                                }
                              }}
                              disabled={isDeleting}
                              style={{ padding: "3px 8px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              {t("dashSim")}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ padding: "3px 8px", background: "var(--of-page-bg)", color: "var(--of-text)", border: "1px solid var(--of-border)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                            >
                              {t("dashNao")}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(tx.id)}
                            disabled={isDeleting}
                            title="Remover transação"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--of-text-muted)", opacity: 0.5, transition: "opacity 0.15s" }}
                            onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#DC2626" }}
                            onMouseOut={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = "var(--of-text-muted)" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Score Panel */}
          <ScorePanel
            score={score}
            totais={totais}
            subInfo={subInfo}
            finInfo={finInfo}
            evolucao={evolucao}
            fmt={fmt}
          />

          {/* Score Advisor IA */}
          <ScoreAdvisor
            score={score}
            scoreLabel={scoreLabel(score, t)}
            totalGastos={totais.totalGastos}
            totalRenda={totais.totalRenda}
            percentualEconomia={totais.percentualEconomia}
            categorias={categorias}
            investimentos={{
              totalAportes: investInfo.total,
              patrimonioEstimado: investInfo.patrimonio,
              recorrentes: investInfo.recorrentes,
              diversificacao: investInfo.diversificacao,
            }}
            assinaturas={{
              totalMensal: subInfo.totalMensal,
              count: subInfo.count,
            }}
          />

          {/* Categoria Donut */}
          <div style={{
            background: "var(--of-surface)",
            borderRadius: 16,
            border: "1px solid var(--of-border)",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)" }}>{t("dashPorCategoria")}</h3>
              <span style={{ fontSize: 11, color: "var(--of-text-muted)" }}>
                {new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              </span>
            </div>

            {categorias.length === 0 ? (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{t("dashSemGastos")}</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={categorias}
                      cx="50%" cy="50%"
                      innerRadius={46} outerRadius={70}
                      paddingAngle={3} dataKey="value"
                    >
                      {categorias.map((_: any, i: number) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
                  {categorias.slice(0, 5).map((item: any, i: number) => (
                    <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }} />
                        <span style={{ fontSize: 12, color: "var(--of-text-secondary)" }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)" }}>
                        {item.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        className="lg:hidden"
        onClick={() => setAddModalOpen(true)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          width: 54,
          height: 54,
          background: "var(--of-btn-bg)",
          color: "var(--of-btn-text)",
          borderRadius: "50%",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          zIndex: 10,
          cursor: "pointer",
          transition: "background 0.15s, transform 0.15s",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "#262626"; e.currentTarget.style.transform = "scale(1.05)" }}
        onMouseOut={(e) => { e.currentTarget.style.background = "var(--of-btn-bg)"; e.currentTarget.style.transform = "scale(1)" }}
      >
        <Plus size={22} />
      </button>

      <AddTransactionModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <FinancialCycleSettingsModal
        open={cycleModalOpen}
        onOpenChange={setCycleModalOpen}
        userId={userId}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
