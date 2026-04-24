import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Link } from "react-router";
import { useAuth } from "../../lib/auth-context";
import {
  getTransacoesPeriodo,
  getEvolucaoMensal,
  calcularCategorias,
  calcularTotais,
} from "../../lib/queries";

type Period = "semana" | "mês" | "ano";

const CATEGORY_COLORS = ["#111111", "#333333", "#555555", "#777777", "#999999", "#BBBBBB"];

const CATEGORY_ICONS: Record<string, string> = {
  Alimentação: "🍽️",
  Transporte: "🚌",
  Saúde: "🏥",
  Educação: "📚",
  Entretenimento: "🎬",
};

function categoryIcon(nome: string) {
  return CATEGORY_ICONS[nome] ?? "📦";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white border border-[#E0E0E0] rounded-lg p-3 shadow-md"
        style={{ fontSize: 12 }}
      >
        <p className="font-semibold text-black mb-1">{label || payload[0]?.name}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color ?? "#333" }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function getDateRange(period: Period): { inicio: string; fim: string } {
  const today = new Date();
  const fim = today.toISOString().split("T")[0];

  if (period === "semana") {
    const inicio = new Date(today);
    inicio.setDate(inicio.getDate() - 7);
    return { inicio: inicio.toISOString().split("T")[0], fim };
  }

  if (period === "mês") {
    const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
    return { inicio: inicio.toISOString().split("T")[0], fim };
  }

  const inicio = new Date(today.getFullYear(), 0, 1);
  return { inicio: inicio.toISOString().split("T")[0], fim };
}

export default function Analysis() {
  const { user } = useAuth();
  const userId = user!.id;

  const [period, setPeriod] = useState<Period>("mês");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => getDateRange(period), [period]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [txData, evoData] = await Promise.all([
          getTransacoesPeriodo(userId, dateRange.inicio, dateRange.fim),
          getEvolucaoMensal(userId, 6),
        ]);
        setTransacoes(txData);
        setEvolucao(evoData);
      } catch (err) {
        console.error("Erro ao carregar análise:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [userId, dateRange]);

  const categorias = useMemo(() => calcularCategorias(transacoes), [transacoes]);
  const totais = useMemo(() => calcularTotais(transacoes), [transacoes]);
  const despesas = useMemo(
    () => transacoes.filter((t: any) => t.tipo === "despesa"),
    [transacoes]
  );

  const periodoLabel: Record<Period, string> = {
    semana: "últimos 7 dias",
    mês: "este mês",
    ano: "este ano",
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1100px] mx-auto">
      {/* Filtros */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
          {(["semana", "mês", "ano"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 capitalize transition-colors ${
                period === p ? "bg-black text-white" : "text-[#555555] hover:bg-[#F5F5F5]"
              }`}
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
          <button
            onClick={() => setChartType("bar")}
            className={`px-4 py-2 transition-colors ${
              chartType === "bar" ? "bg-black text-white" : "text-[#555555] hover:bg-[#F5F5F5]"
            }`}
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Barras
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`px-4 py-2 transition-colors ${
              chartType === "pie" ? "bg-black text-white" : "text-[#555555] hover:bg-[#F5F5F5]"
            }`}
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Pizza
          </button>
        </div>
        {loading && (
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Gráfico principal */}
        <div
          className="lg:col-span-2 bg-white rounded-lg p-5 border border-[#E0E0E0]"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <h3 className="text-black mb-4" style={{ fontSize: 14, fontWeight: 600 }}>
            {chartType === "bar" ? "Evolução Mensal" : `Distribuição por Categoria (${periodoLabel[period]})`}
          </h3>

          {chartType === "bar" ? (
            evolucao.length === 0 ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                <p style={{ fontSize: 13 }} className="text-[#999999]">
                  Sem dados de evolução ainda
                </p>
                <Link
                  to="/app/adicionar"
                  style={{ fontSize: 12, fontWeight: 500 }}
                  className="text-black underline underline-offset-2"
                >
                  Adicionar transação
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#777" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Renda" fill="#E0E0E0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos" fill="#111111" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : categorias.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center gap-2">
              <p style={{ fontSize: 13 }} className="text-[#999999]">
                Nenhum gasto registrado {periodoLabel[period]}
              </p>
              <Link
                to="/app/adicionar"
                style={{ fontSize: 12, fontWeight: 500 }}
                className="text-black underline underline-offset-2"
              >
                Adicionar gasto
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categorias}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categorias.map((_: any, i: number) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Categoria breakdown */}
        <div
          className="bg-white rounded-lg p-5 border border-[#E0E0E0]"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <h3 className="text-black mb-4" style={{ fontSize: 14, fontWeight: 600 }}>
            Por Categoria
          </h3>
          {categorias.length === 0 ? (
            <p style={{ fontSize: 13 }} className="text-[#999999] text-center mt-8">
              Sem gastos {periodoLabel[period]}
            </p>
          ) : (
            <div className="space-y-3">
              {categorias.map((item: any, i: number) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#555555]" style={{ fontSize: 12 }}>
                      {item.name}
                    </span>
                    <span className="text-black" style={{ fontSize: 12, fontWeight: 600 }}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-[#F0F0F0] flex justify-between">
                <span style={{ fontSize: 12, fontWeight: 600 }} className="text-[#555555]">
                  Total gastos
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }} className="text-black">
                  {formatCurrency(totais.totalGastos)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de transações */}
      <div
        className="bg-white rounded-lg border border-[#E0E0E0]"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
          <h3 className="text-black" style={{ fontSize: 14, fontWeight: 600 }}>
            Todas as Transações{" "}
            <span className="text-[#999999]" style={{ fontWeight: 400 }}>
              ({periodoLabel[period]})
            </span>
          </h3>
          {transacoes.length > 0 && (
            <span style={{ fontSize: 12 }} className="text-[#777777]">
              {transacoes.length} transações
            </span>
          )}
        </div>

        {despesas.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3">
            <p style={{ fontSize: 14 }} className="text-[#555555]">
              Nenhuma despesa encontrada {periodoLabel[period]}.
            </p>
            <Link
              to="/app/adicionar"
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-[#333333] transition-colors"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              + Adicionar gasto
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {despesas.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-base">
                    {categoryIcon(tx.categorias?.nome || "")}
                  </div>
                  <div>
                    <p className="text-black" style={{ fontSize: 13, fontWeight: 500 }}>
                      {tx.descricao || "—"}
                    </p>
                    <p className="text-[#999999]" style={{ fontSize: 11 }}>
                      {tx.categorias?.nome || "Outros"} · {formatDate(tx.data)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#D32F2F]" style={{ fontSize: 13, fontWeight: 600 }}>
                    -{formatCurrency(tx.valor)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
