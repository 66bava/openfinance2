import { useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { mockInvestments, formatCurrency } from "../data/mockData";

const riskColor = {
  Baixo: { bg: "#E8F5E9", text: "#388E3C" },
  Médio: { bg: "#FFF8E1", text: "#F9A825" },
  Alto: { bg: "#FFEBEE", text: "#D32F2F" },
};

export default function Investments() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleInvest = (ticker: string) => {
    toast.success(`Redirecionando para ${ticker}...`, {
      description: "Você será levado à corretora parceira.",
      duration: 3000,
    });
  };

  return (
    <div className="p-4 lg:p-6 max-w-[900px] mx-auto">
      {/* Header Banner */}
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
          <h2 style={{ fontSize: 20, fontWeight: 700 }} className="mb-1">
            Investimentos para você
          </h2>
          <p style={{ fontSize: 13 }} className="text-[#BBBBBB]">
            Baseado nos seus padrões de gasto, identificamos oportunidades alinhadas ao seu perfil.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="flex items-start gap-3 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4 mb-6">
        <Info size={16} className="text-[#777777] mt-0.5 flex-shrink-0" />
        <p style={{ fontSize: 12 }} className="text-[#555555]">
          As recomendações abaixo são sugestões educacionais baseadas em análise de dados. Sempre consulte um assessor de investimentos antes de tomar decisões financeiras.
        </p>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4 mb-6">
        {mockInvestments.map((inv) => (
          <div
            key={inv.id}
            className="bg-white rounded-lg border border-[#E0E0E0] overflow-hidden transition-shadow hover:shadow-md"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            {/* Card Header */}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Company Icon */}
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                    <span style={{ fontSize: 13, fontWeight: 700 }} className="text-white">
                      {inv.ticker.slice(0, 4)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 style={{ fontSize: 15, fontWeight: 700 }} className="text-black">
                        {inv.company}
                      </h3>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          backgroundColor: "#F5F5F5",
                          color: "#555555",
                        }}
                      >
                        {inv.ticker}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ fontSize: 12 }} className="text-[#777777]">
                        {inv.sector}
                      </span>
                      <span className="text-[#E0E0E0]">·</span>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          backgroundColor: riskColor[inv.risk as keyof typeof riskColor]?.bg,
                          color: riskColor[inv.risk as keyof typeof riskColor]?.text,
                        }}
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

              {/* Spending Context */}
              <div className="mt-4 bg-[#F5F5F5] rounded-lg px-4 py-3">
                <p style={{ fontSize: 12 }} className="text-[#555555]">
                  📊 {inv.spendingContext}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-[#F9F9F9] rounded-lg p-3">
                  <p style={{ fontSize: 11 }} className="text-[#777777] mb-1">Retorno Esperado</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={14} className="text-[#388E3C]" />
                    <span style={{ fontSize: 16, fontWeight: 700 }} className="text-[#388E3C]">
                      {inv.returnExpected}
                    </span>
                  </div>
                </div>
                <div className="bg-[#F9F9F9] rounded-lg p-3">
                  <p style={{ fontSize: 11 }} className="text-[#777777] mb-1">Preço Atual</p>
                  <span style={{ fontSize: 16, fontWeight: 700 }} className="text-black">
                    {formatCurrency(inv.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded Reason */}
            {expanded === inv.id && (
              <div className="border-t border-[#F0F0F0] px-5 py-4">
                <p style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider mb-2">
                  Por que investir?
                </p>
                <p style={{ fontSize: 13 }} className="text-[#333333] leading-relaxed">
                  {inv.reason}
                </p>
              </div>
            )}

            {/* CTA */}
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

      {/* Previous Recommendations */}
      <div className="bg-white rounded-lg border border-[#E0E0E0]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">
            Recomendações Anteriores
          </h3>
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
                  <span style={{ fontSize: 10, fontWeight: 700 }} className="text-[#333333]">
                    {rec.ticker.slice(0, 4)}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">{rec.company}</p>
                  <p style={{ fontSize: 11 }} className="text-[#999999]">{rec.date}</p>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }} className="text-[#388E3C]">
                {rec.return}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
