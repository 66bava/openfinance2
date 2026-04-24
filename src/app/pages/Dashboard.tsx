import { useState, useEffect } from "react"
import { Link } from "react-router"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { ArrowDownRight, ArrowUpRight, Wallet, Plus, PiggyBank } from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import {
  getTotaisMes,
  getGastosPorCategoria,
  getTransacoesMes,
  getEvolucaoMensal,
} from "../../lib/queries"
import { formatCurrency, formatDate, categoryIcons } from "../data/mockData"

const CATEGORY_COLORS = ["#111111", "#333333", "#555555", "#777777", "#999999", "#BBBBBB"]

function categoryIcon(nome: string) {
  return categoryIcons[nome] ?? "📦"
}

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="bg-white rounded-lg p-5 border border-[#E0E0E0]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start justify-between mb-3">
        <p style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
          <Icon size={16} className="text-[#333333]" />
        </div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }} className="text-black">{value}</p>
      {sub && (
        <p
          style={{ fontSize: 12, fontWeight: 500 }}
          className={accent === "positive" ? "text-[#388E3C] mt-1" : accent === "negative" ? "text-[#D32F2F] mt-1" : "text-[#777777] mt-1"}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-3 shadow-md" style={{ fontSize: 12 }}>
        <p className="font-semibold text-black mb-1">{label || payload[0]?.name}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color ?? "#333" }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { user } = useAuth()
  const userId = user!.id
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"

  const [totais, setTotais] = useState({ totalGastos: 0, totalRenda: 0, saldoDisponivel: 0, percentualEconomia: 0 })
  const [categorias, setCategorias] = useState<any[]>([])
  const [transacoes, setTransacoes] = useState<any[]>([])
  const [evolucao, setEvolucao] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const [totaisData, categoriasData, transacoesData, evolucaoData] = await Promise.all([
          getTotaisMes(userId),
          getGastosPorCategoria(userId),
          getTransacoesMes(userId),
          getEvolucaoMensal(userId),
        ])
        setTotais(totaisData)
        setCategorias(categoriasData)
        setTransacoes(transacoesData.filter((t: any) => t.tipo === "despesa").slice(0, 6))
        setEvolucao(evolucaoData)
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [userId])

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <p style={{ fontSize: 13 }} className="text-[#777777]">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 700 }} className="text-black mt-0.5">
          Olá, {userName} 👋
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total de Gastos" value={formatCurrency(totais.totalGastos)} sub="Mês atual" icon={ArrowDownRight} accent="negative" />
        <StatCard label="Total de Renda" value={formatCurrency(totais.totalRenda)} sub="Mês atual" icon={ArrowUpRight} accent="positive" />
        <StatCard label="Saldo Disponível" value={formatCurrency(totais.saldoDisponivel)} sub="Atualizado agora" icon={Wallet} accent="neutral" />
        <StatCard label="Economia" value={`${totais.percentualEconomia.toFixed(1)}%`} sub="Do total de renda" icon={PiggyBank} accent={totais.percentualEconomia > 0 ? "positive" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-5 border border-[#E0E0E0]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">Evolução Mensal</h3>
            <span className="bg-[#F5F5F5] text-[#333333] rounded-md px-2 py-1" style={{ fontSize: 11, fontWeight: 500 }}>6 meses</span>
          </div>
          {evolucao.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
              <p style={{ fontSize: 13 }} className="text-[#999999]">Sem dados de evolução ainda</p>
              <Link to="/app/adicionar" style={{ fontSize: 12, fontWeight: 500 }} className="text-black underline underline-offset-2">
                Adicione sua primeira transação
              </Link>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={evolucao} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Renda" fill="#E0E0E0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos" fill="#111111" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#111111]" />
                  <span style={{ fontSize: 11 }} className="text-[#777777]">Gastos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#E0E0E0]" />
                  <span style={{ fontSize: 11 }} className="text-[#777777]">Renda</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg p-5 border border-[#E0E0E0]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">Gastos por Categoria</h3>
            <span className="bg-[#F5F5F5] text-[#333333] rounded-md px-2 py-1" style={{ fontSize: 11, fontWeight: 500 }}>
              {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </div>
          {categorias.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center">
              <p style={{ fontSize: 13 }} className="text-[#999999]">Nenhum gasto registrado este mês</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={categorias} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {categorias.map((_: any, index: number) => (
                      <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5">
                {categorias.map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                      <span style={{ fontSize: 11 }} className="text-[#555555]">{item.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600 }} className="text-black">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E0E0E0]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
          <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">Últimas Transações</h3>
          <Link to="/app/analise" className="text-[#555555] hover:text-black transition-colors" style={{ fontSize: 12, fontWeight: 500 }}>
            Ver todas →
          </Link>
        </div>
        {transacoes.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3">
            <p style={{ fontSize: 14, fontWeight: 500 }} className="text-[#555555]">Nenhuma transação ainda.</p>
            <Link to="/app/adicionar" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-[#333333] transition-colors" style={{ fontSize: 13, fontWeight: 600 }}>
              + Adicionar primeiro gasto
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {transacoes.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-base">
                    {categoryIcon(tx.categorias?.nome || "")}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">{tx.descricao || "—"}</p>
                    <p style={{ fontSize: 11 }} className="text-[#999999]">{tx.categorias?.nome || "Outros"} · {formatDate(tx.data)}</p>
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }} className="text-[#D32F2F]">
                  -{formatCurrency(tx.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/app/adicionar"
        className="lg:hidden fixed bottom-20 right-5 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#333333] transition-colors z-10"
        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
      >
        <Plus size={24} />
      </Link>
    </div>
  )
}
