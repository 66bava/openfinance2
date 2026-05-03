import { useState, useEffect } from "react"
import { toast } from "sonner"
import { TrendingUp, AlertTriangle, ExternalLink, ChevronRight, Sparkles, Info } from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { getGastosPorCategoria } from "../../lib/queries"
import { formatCurrency } from "../data/mockData"

interface Investment {
  id: string
  ticker: string
  company: string
  sector: string
  spendingContext: string
  reason: string
  returnExpected: string
  risk: "Baixo" | "Médio" | "Alto"
  price: number
}

const INVESTMENT_MAP: Record<string, Omit<Investment, "id" | "spendingContext">> = {
  Alimentação: {
    ticker: "BRFS3", company: "BRF S.A.", sector: "Alimentação",
    reason: "A BRF é líder no setor de alimentos processados no Brasil. Seus hábitos de consumo indicam potencial de retorno neste setor.",
    returnExpected: "8% ao ano", risk: "Médio", price: 14.20,
  },
  Transporte: {
    ticker: "EMBR3", company: "Embraer S.A.", sector: "Transporte",
    reason: "A Embraer é referência global em aeronáutica. Com a retomada do setor de aviação, as perspectivas são positivas.",
    returnExpected: "12% ao ano", risk: "Alto", price: 52.80,
  },
  Saúde: {
    ticker: "HAPV3", company: "Hapvida S.A.", sector: "Saúde",
    reason: "Hapvida é uma das maiores operadoras de saúde do Brasil. Setor resiliente e com crescimento contínuo.",
    returnExpected: "10% ao ano", risk: "Médio", price: 3.90,
  },
  Educação: {
    ticker: "COGN3", company: "Cogna Educação", sector: "Educação",
    reason: "Cogna é o maior grupo educacional do Brasil. Alinhado com seu perfil de investimento em conhecimento.",
    returnExpected: "7% ao ano", risk: "Médio", price: 2.15,
  },
  Entretenimento: {
    ticker: "MOVI3", company: "Movida S.A.", sector: "Mobilidade",
    reason: "Movida opera no setor de mobilidade urbana, alinhado ao perfil de consumo em entretenimento e lazer.",
    returnExpected: "9% ao ano", risk: "Médio", price: 7.40,
  },
  Outros: {
    ticker: "ITUB4", company: "Itaú Unibanco", sector: "Financeiro",
    reason: "Itaú é o maior banco privado do Brasil. Uma base sólida para diversificar seu portfólio.",
    returnExpected: "11% ao ano", risk: "Baixo", price: 38.50,
  },
}

const riskColor = {
  Baixo: { bg: "#E8F5E9", text: "#388E3C" },
  Médio: { bg: "#FFF8E1", text: "#F9A825" },
  Alto: { bg: "#FFEBEE", text: "#D32F2F" },
}

export default function Investments() {
  const { user } = useAuth()
  const userId = user!.id

  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const categorias = await getGastosPorCategoria(userId)

        if (categorias.length === 0) {
          const fallback: Investment[] = Object.entries(INVESTMENT_MAP)
            .slice(0, 4)
            .map(([cat, inv], i) => ({
              id: String(i + 1),
              ...inv,
              spendingContext: `Registre seus gastos de ${cat} para ver recomendações personalizadas`,
            }))
          setInvestments(fallback)
          return
        }

        const sugestoes: Investment[] = categorias.slice(0, 4).map((cat: any, i: number) => {
          const base = INVESTMENT_MAP[cat.name] ?? INVESTMENT_MAP["Outros"]
          return {
            id: String(i + 1),
            ...base,
            spendingContext: `Você gasta em média ${formatCurrency(cat.value)}/mês em ${cat.name} (${cat.percent}% dos seus gastos)`,
          }
        })

        setInvestments(sugestoes)
      } catch (err) {
        console.error("Erro ao carregar investimentos:", err)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [userId])

  const handleInvest = (ticker: string) => {
    toast.success(`Redirecionando para ${ticker}...`, {
      description: "Você será levado à corretora parceira.",
      duration: 3000,
    })
  }

  return (
    <div className="p-4 lg:p-6 max-w-[900px] mx-auto">
      <div className="bg-black text-white rounded-lg p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 right-12 w-24 h-24 rounded-full bg-white/5 translate-y-8" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#E0E0E0]" />
            <span style={{ fontSize: 11, fontWeight: 500 }} className="text-[#E0E0E0] uppercase tracking-wider">
              Recomendações Personalizadas
            </span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }} className="mb-1">Investimentos para você</h2>
          <p style={{ fontSize: 13 }} className="text-[#BBBBBB]">
            Baseado nos seus padrões de gasto, identificamos oportunidades alinhadas ao seu perfil.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4 mb-6">
        <Info size={16} className="text-[#777777] mt-0.5 flex-shrink-0" />
        <p style={{ fontSize: 12 }} className="text-[#555555]">
          As recomendações abaixo são sugestões educacionais baseadas em análise de dados. Sempre consulte um assessor de investimentos antes de tomar decisões financeiras.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : investments.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-10 text-center" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <AlertTriangle size={32} className="text-[#BBBBBB] mx-auto mb-3" />
          <p style={{ fontSize: 14, fontWeight: 500 }} className="text-[#555555] mb-1">
            Nenhum dado de gastos encontrado
          </p>
          <p style={{ fontSize: 13 }} className="text-[#999999]">
            Registre suas despesas para receber recomendações personalizadas.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {investments.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-lg border border-[#E0E0E0] overflow-hidden transition-shadow hover:shadow-md"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <span style={{ fontSize: 13, fontWeight: 700 }} className="text-white">{inv.ticker.slice(0, 4)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ fontSize: 15, fontWeight: 700 }} className="text-black">{inv.company}</h3>
                        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, backgroundColor: "var(--of-page-bg)", color: "#555555" }}>
                          {inv.ticker}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ fontSize: 12 }} className="text-[#777777]">{inv.sector}</span>
                        <span className="text-[#E0E0E0]">·</span>
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{ fontSize: 10, fontWeight: 600, backgroundColor: riskColor[inv.risk].bg, color: riskColor[inv.risk].text }}
                        >
                          Risco {inv.risk}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                    className="p-1 text-[#999999] hover:text-black transition-colors"
                  >
                    <ChevronRight
                      size={18}
                      className={`transition-transform duration-200 ${expanded === inv.id ? "rotate-90" : ""}`}
                    />
                  </button>
                </div>

                <div className="mt-4 bg-[#F5F5F5] rounded-lg px-4 py-3">
                  <p style={{ fontSize: 12 }} className="text-[#555555]">📊 {inv.spendingContext}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#F9F9F9] rounded-lg p-3">
                    <p style={{ fontSize: 11 }} className="text-[#777777] mb-1">Retorno Esperado</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp size={14} className="text-[#388E3C]" />
                      <span style={{ fontSize: 16, fontWeight: 700 }} className="text-[#388E3C]">{inv.returnExpected}</span>
                    </div>
                  </div>
                  <div className="bg-[#F9F9F9] rounded-lg p-3">
                    <p style={{ fontSize: 11 }} className="text-[#777777] mb-1">Preço Atual</p>
                    <span style={{ fontSize: 16, fontWeight: 700 }} className="text-black">{formatCurrency(inv.price)}</span>
                  </div>
                </div>
              </div>

              {expanded === inv.id && (
                <div className="border-t border-[#F0F0F0] px-5 py-4">
                  <p style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider mb-2">Por que investir?</p>
                  <p style={{ fontSize: 13 }} className="text-[#333333] leading-relaxed">{inv.reason}</p>
                </div>
              )}

              <div className="px-5 pb-5">
                <button
                  onClick={() => handleInvest(inv.ticker)}
                  className="w-full py-3 bg-black text-white rounded-lg hover:bg-[#333333] transition-colors flex items-center justify-center gap-2"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  Investir Agora
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#E0E0E0]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">Recomendações Anteriores</h3>
        </div>
        <div className="divide-y divide-[#F5F5F5]">
          {[
            { ticker: "PETR4", company: "Petrobras", date: "Mar 2025", return: "+6.2%" },
            { ticker: "VALE3", company: "Vale S.A.", date: "Fev 2025", return: "+3.8%" },
            { ticker: "ITUB4", company: "Itaú Unibanco", date: "Jan 2025", return: "+9.1%" },
          ].map((rec) => (
            <div key={rec.ticker} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
                  <span style={{ fontSize: 10, fontWeight: 700 }} className="text-[#333333]">{rec.ticker.slice(0, 4)}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">{rec.company}</p>
                  <p style={{ fontSize: 11 }} className="text-[#999999]">{rec.date}</p>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }} className="text-[#388E3C]">{rec.return}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
