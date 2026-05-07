import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Link } from "react-router";
import { Search, Sparkles, X, Trash2 } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useFeatureAccess } from "../hooks/useFeatureAccess";
import { FeatureLock } from "../components/FeatureLock";
import {
  getTransacoesPeriodo,
  getEvolucaoMensal,
  calcularCategorias,
  calcularTotais,
  deleteTransacao,
} from "../../lib/queries";
import { analisarCategoria } from "../../lib/openai";
import { verificarIncrementarIaReport } from "../../lib/queries/receitas-recorrentes";
import { toast } from "sonner";

type Period = "semana" | "mÃªs" | "ano";

const CATEGORY_COLORS = ["#16A34A", "#2563EB", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#64748B"];

const CATEGORY_ICONS: Record<string, string> = {
  "Alimentação": "🍽️",
  Transporte: "ðŸšŒ",
  "Saúde": "🏥",
  "Educação": "📚",
  Entretenimento: "ðŸŽ¬",
  Lazer: "ðŸŽ®",
  Moradia: "ðŸ ",
  "Vestuário": "👕",
  Outros: "ðŸ“¦",
};

function categoryIcon(nome: string) {
  return CATEGORY_ICONS[nome] ?? "ðŸ“¦";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function renderAI(text: string) {
  return text.split("\n").map((line, i) => {
    const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: bold }} />;
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-md" style={{ fontSize: 12 }}>
        <p className="font-semibold text-foreground mb-1">{label || payload[0]?.name}</p>
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
  if (period === "mÃªs") {
    const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
    return { inicio: inicio.toISOString().split("T")[0], fim };
  }
  const inicio = new Date(today.getFullYear(), 0, 1);
  return { inicio: inicio.toISOString().split("T")[0], fim };
}

export default function Analysis() {
  const { hasAccess, loading: accessLoading } = useFeatureAccess("pro");
  if (accessLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 24, height: 24, border: "2px solid #E5E5E3", borderTopColor: "#16A34A", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
  if (!hasAccess) return <FeatureLock messageKey="featureLockAnalysis" />;
  return <AnalysisContent />;
}

function AnalysisContent() {
  const { user } = useAuth();
  const userId = user!.id;

  const [period, setPeriod] = useState<Period>("mÃªs");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // IA por categoria
  const [aiCategory, setAiCategory] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUsado, setAiUsado] = useState<number | null>(null);
  const [aiLimite, setAiLimite] = useState<number | null>(null);

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
        console.error("Erro ao carregar anÃ¡lise:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
    setSelectedCategory(null);
    setSearchQuery("");
    setAiCategory(null);
    setAiText(null);
  }, [userId, dateRange]);

  const categorias = useMemo(() => calcularCategorias(transacoes), [transacoes]);
  const totais = useMemo(() => calcularTotais(transacoes), [transacoes]);

  const despesas = useMemo(
    () => transacoes.filter((t: any) => t.tipo === "despesa"),
    [transacoes]
  );

  const despesasFiltradas = useMemo(() => {
    let result = despesas;
    if (selectedCategory) {
      result = result.filter((t: any) => (t.categorias?.nome || "Outros") === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) =>
        (t.descricao || "").toLowerCase().includes(q) ||
        (t.categorias?.nome || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [despesas, selectedCategory, searchQuery]);

  const totalFiltrado = useMemo(
    () => despesasFiltradas.reduce((acc: number, t: any) => acc + t.valor, 0),
    [despesasFiltradas]
  );

  const periodoLabel: Record<Period, string> = {
    semana: "Ãºltimos 7 dias",
    mÃªs: "este mÃªs",
    ano: "este ano",
  };

  async function handleAnalisarCategoria(cat: any) {
    setAiCategory(cat.name);
    setAiText(null);
    setAiError(null);
    setAiLoading(true);

    try {
      // Verifica e incrementa limite semanal
      const limite = await verificarIncrementarIaReport(userId);
      setAiUsado(limite.usado);
      setAiLimite(limite.limite);

      if (!limite.success) {
        const msg = limite.limite >= 0
          ? `Limite semanal atingido (${limite.usado}/${limite.limite} anÃ¡lises). Renova na segunda-feira.`
          : "Limite de anÃ¡lises atingido.";
        setAiError(msg);
        toast.error(msg);
        setAiLoading(false);
        return;
      }

      const txDaCat = despesas.filter((t: any) => (t.categorias?.nome || "Outros") === cat.name);
      const topDescricoes = [...new Set(txDaCat.map((t: any) => t.descricao).filter(Boolean))] as string[];

      const result = await analisarCategoria({
        categoria: cat.name,
        valor: cat.value,
        percentualDoTotal: cat.percent,
        totalGastos: totais.totalGastos,
        numTransacoes: txDaCat.length,
        periodo: periodoLabel[period],
        topDescricoes,
      });
      setAiText(result);
    } catch (e: any) {
      setAiError(e.message || "Erro ao gerar anÃ¡lise.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1100px] mx-auto">
      {/* Filtros de perÃ­odo e tipo de grÃ¡fico */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-card border border-border rounded-lg overflow-hidden">
          {(["semana", "mÃªs", "ano"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 capitalize transition-colors ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex bg-card border border-border rounded-lg overflow-hidden">
          {(["bar", "pie"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChartType(c)}
              className={`px-4 py-2 transition-colors ${chartType === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {c === "bar" ? "Barras" : "Pizza"}
            </button>
          ))}
        </div>
        {loading && <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* GrÃ¡fico principal */}
        <div className="lg:col-span-2 bg-card rounded-lg p-5 border border-border" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 className="text-foreground mb-4" style={{ fontSize: 14, fontWeight: 600 }}>
            {chartType === "bar" ? "EvoluÃ§Ã£o Mensal" : `DistribuiÃ§Ã£o por Categoria (${periodoLabel[period]})`}
          </h3>
          {chartType === "bar" ? (
            evolucao.length === 0 ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                <p style={{ fontSize: 13 }} className="text-[#999999]">Sem dados de evoluÃ§Ã£o ainda</p>
                <Link to="/app/adicionar" style={{ fontSize: 12, fontWeight: 500 }} className="text-foreground underline underline-offset-2">Adicionar transaÃ§Ã£o</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--of-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Renda" fill="var(--of-border)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos" fill="#111111" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : categorias.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center gap-2">
              <p style={{ fontSize: 13 }} className="text-[#999999]">Nenhum gasto registrado {periodoLabel[period]}</p>
              <Link to="/app/adicionar" style={{ fontSize: 12, fontWeight: 500 }} className="text-foreground underline underline-offset-2">Adicionar gasto</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categorias} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value">
                  {categorias.map((_: any, i: number) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Categoria breakdown com IA */}
        <div className="bg-card rounded-lg p-5 border border-border" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 600 }}>Por Categoria</h3>
            {aiLimite !== null && aiUsado !== null && (
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                IA: {aiUsado}/{aiLimite < 0 ? "âˆž" : aiLimite} semana
              </span>
            )}
          </div>
          {categorias.length === 0 ? (
            <p style={{ fontSize: 13 }} className="text-[#999999] text-center mt-8">Sem gastos {periodoLabel[period]}</p>
          ) : (
            <div className="space-y-1">
              {categorias.map((item: any, i: number) => {
                const isSelected = selectedCategory === item.name;
                const isAiOpen = aiCategory === item.name;
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setSelectedCategory(isSelected ? null : item.name)}
                      className="w-full text-left rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                      style={{ background: isSelected ? "#F0FDF4" : undefined }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 12 }}>
                          <span>{categoryIcon(item.name)}</span>
                          {item.name}
                          {isSelected && <span className="text-[10px] text-green-600 font-semibold">â€¢ filtrado</span>}
                        </span>
                        <span className="text-foreground" style={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(item.value)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${item.percent}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      </div>
                      <span className="text-[#AAAAAA]" style={{ fontSize: 10 }}>{item.percent.toFixed(1)}% do total</span>
                    </button>

                    {/* BotÃ£o analisar IA */}
                    <button
                      onClick={() => {
                        if (isAiOpen) { setAiCategory(null); setAiText(null); }
                        else handleAnalisarCategoria(item);
                      }}
                      className="flex items-center gap-1 ml-2 mb-1 transition-colors"
                      style={{ fontSize: 11, color: isAiOpen ? "#16A34A" : "#9CA3AF", fontWeight: 500 }}
                    >
                      <Sparkles size={11} />
                      {isAiOpen ? "Fechar anÃ¡lise" : "Analisar com IA"}
                    </button>

                    {/* Resultado IA */}
                    {isAiOpen && (
                      <div className="mx-2 mb-2 p-3 rounded-lg border" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
                        {aiLoading && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            <span style={{ fontSize: 12, color: "#16A34A" }}>Analisando...</span>
                          </div>
                        )}
                        {aiError && <p style={{ fontSize: 12, color: "#DC2626" }}>{aiError}</p>}
                        {aiText && <div>{renderAI(aiText)}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="pt-3 border-t border-border flex justify-between">
                <span style={{ fontSize: 12, fontWeight: 600 }} className="text-muted-foreground">Total gastos</span>
                <span style={{ fontSize: 12, fontWeight: 700 }} className="text-foreground">{formatCurrency(totais.totalGastos)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de transaÃ§Ãµes com busca e filtro */}
      <div className="bg-card rounded-lg border border-border" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 600 }}>
              TransaÃ§Ãµes
              <span className="text-[#999999] ml-1" style={{ fontWeight: 400 }}>({periodoLabel[period]})</span>
            </h3>
            {(selectedCategory || searchQuery) && (
              <span style={{ fontSize: 12, fontWeight: 600 }} className="text-green-700">
                {formatCurrency(totalFiltrado)} Â· {despesasFiltradas.length} transaÃ§Ãµes
              </span>
            )}
          </div>

          {/* Busca */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
            <input
              type="text"
              placeholder="Buscar por descriÃ§Ã£o ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#16A34A]"
              style={{ fontSize: 13 }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-[#555]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Chips de categoria */}
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-3 py-1 rounded-full border transition-colors"
                style={{
                  fontSize: 12, fontWeight: 500,
                  background: !selectedCategory ? "#111" : "#FFF",
                  color: !selectedCategory ? "#FFF" : "#555",
                  borderColor: !selectedCategory ? "var(--of-text)" : "var(--of-border)",
                }}
              >
                Todas
              </button>
              {categorias.map((cat: any) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  className="px-3 py-1 rounded-full border transition-colors flex items-center gap-1"
                  style={{
                    fontSize: 12, fontWeight: 500,
                    background: selectedCategory === cat.name ? "#111" : "#FFF",
                    color: selectedCategory === cat.name ? "#FFF" : "#555",
                    borderColor: selectedCategory === cat.name ? "var(--of-text)" : "var(--of-border)",
                  }}
                >
                  {categoryIcon(cat.name)} {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {despesasFiltradas.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3">
            {selectedCategory || searchQuery ? (
              <>
                <p style={{ fontSize: 14 }} className="text-muted-foreground">Nenhuma transaÃ§Ã£o encontrada para esse filtro.</p>
                <button
                  onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                  className="text-green-700 underline underline-offset-2"
                  style={{ fontSize: 13 }}
                >
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14 }} className="text-muted-foreground">Nenhuma despesa {periodoLabel[period]}.</p>
                <Link to="/app/adicionar" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors" style={{ fontSize: 13, fontWeight: 600 }}>
                  + Adicionar gasto
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {despesasFiltradas.map((tx: any) => {
              const isConfirming = confirmDeleteId === tx.id;
              const isDeleting = deletingId === tx.id;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors"
                  style={{ background: isConfirming ? "#FEF2F2" : undefined }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
                      {categoryIcon(tx.categorias?.nome || "")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>{tx.descricao || "â€”"}</p>
                      <p className="text-[#999999]" style={{ fontSize: 11 }}>
                        {tx.categorias?.nome || "Outros"} Â· {formatDate(tx.data)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-[#D32F2F]" style={{ fontSize: 13, fontWeight: 600 }}>
                      -{formatCurrency(tx.valor)}
                    </p>
                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>Remover?</span>
                        <button
                          onClick={async () => {
                            setDeletingId(tx.id);
                            setConfirmDeleteId(null);
                            try {
                              await deleteTransacao(tx.id);
                              setTransacoes((prev) => prev.filter((t) => t.id !== tx.id));
                            } catch { /* silent */ }
                            finally { setDeletingId(null); }
                          }}
                          disabled={isDeleting}
                          className="px-2 py-0.5 rounded text-primary-foreground text-xs font-bold"
                          style={{ background: "#DC2626", border: "none", cursor: "pointer", fontSize: 11 }}
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ background: "var(--of-page-bg)", border: "1px solid var(--of-border)", cursor: "pointer", fontSize: 11, color: "var(--of-text)" }}
                        >
                          NÃ£o
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(tx.id)}
                        disabled={isDeleting}
                        title="Remover transaÃ§Ã£o"
                        className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-1 rounded"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#AAAAAA" }}
                        onMouseOver={(e) => { e.currentTarget.style.color = "#DC2626"; e.currentTarget.style.opacity = "1" }}
                        onMouseOut={(e) => { e.currentTarget.style.color = "#AAAAAA"; e.currentTarget.style.opacity = "0.4" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
