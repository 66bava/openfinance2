import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText, Download, FileSpreadsheet, Calendar,
  BarChart2, ArrowDownRight, ArrowUpRight, Wallet, PiggyBank,
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useAuth } from "../../lib/auth-context";
import {
  getTransacoesMesEspecifico,
  calcularTotais,
  calcularCategorias,
  getProfile,
} from "../../lib/queries";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_INDEX: Record<string, number> = {
  Janeiro: 0, Fevereiro: 1, Março: 2, Abril: 3,
  Maio: 4, Junho: 5, Julho: 6, Agosto: 7,
  Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function safe(text: string): string {
  return text
    .replace(/ã/g, "a").replace(/Ã/g, "A")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .replace(/à/g, "a").replace(/À/g, "A")
    .replace(/á/g, "a").replace(/Á/g, "A")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/é/g, "e").replace(/É/g, "E")
    .replace(/ê/g, "e").replace(/Ê/g, "E")
    .replace(/í/g, "i").replace(/Í/g, "I")
    .replace(/ó/g, "o").replace(/Ó/g, "O")
    .replace(/ô/g, "o").replace(/Ô/g, "O")
    .replace(/ú/g, "u").replace(/Ú/g, "U");
}

function generatePDF(
  transacoes: any[],
  totais: ReturnType<typeof calcularTotais>,
  categorias: ReturnType<typeof calcularCategorias>,
  userName: string,
  userEmail: string,
  month: string,
  year: string
) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 20;
  const mr = pw - ml;

  // Header
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pw, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Open Finance", ml, 15);

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(safe(`Relatorio Mensal — ${month} ${year}`), ml, 25);

  doc.setFontSize(10);
  doc.setTextColor(187, 187, 187);
  doc.text(safe(userName) + "  |  " + userEmail, ml, 34);
  doc.text(new Date().toLocaleDateString("pt-BR"), mr, 34, { align: "right" });

  let y = 55;

  // Resumo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Executivo", ml, y);
  y += 8;

  const cardW = (pw - ml * 2 - 10) / 2;
  const summaryItems = [
    { label: "Total de Gastos", value: formatCurrency(totais.totalGastos), r: 211, g: 47, b: 47 },
    { label: "Total de Renda", value: formatCurrency(totais.totalRenda), r: 56, g: 142, b: 60 },
    { label: "Saldo Disponivel", value: formatCurrency(totais.saldoDisponivel), r: 0, g: 0, b: 0 },
    { label: "Economia", value: `${totais.percentualEconomia.toFixed(1)}%`, r: 0, g: 0, b: 0 },
  ];

  summaryItems.forEach((item, i) => {
    const x = ml + (i % 2) * (cardW + 10);
    const cy = y + Math.floor(i / 2) * 26;
    doc.setDrawColor(224, 224, 224);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(x, cy, cardW, 21, 2, 2, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(119, 119, 119);
    doc.text(item.label, x + 4, cy + 7);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(item.r, item.g, item.b);
    doc.text(item.value, x + 4, cy + 16);
    doc.setFont("helvetica", "normal");
  });

  y += 58;

  // Categorias
  if (categorias.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(safe("Gastos por Categoria"), ml, y);
    y += 8;

    categorias.slice(0, 8).forEach((cat) => {
      const barW = 90;
      const barX = ml + 48;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 51, 51);
      doc.text(safe(cat.name).slice(0, 14), ml, y + 5);

      doc.setFillColor(245, 245, 245);
      doc.rect(barX, y, barW, 6, "F");
      doc.setFillColor(17, 17, 17);
      doc.rect(barX, y, (barW * Number(cat.percent)) / 100, 6, "F");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(cat.value), mr, y + 5.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 11;
    });
    y += 5;
  }

  // Transações
  if (transacoes.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(safe("Transações do Mês"), ml, y);
    y += 8;

    // Header tabela
    doc.setFillColor(245, 245, 245);
    doc.rect(ml, y, pw - ml * 2, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(119, 119, 119);
    doc.text("DATA", ml + 2, y + 5);
    doc.text("DESCRICAO", ml + 25, y + 5);
    doc.text("CATEGORIA", ml + 100, y + 5);
    doc.text("VALOR", mr - 2, y + 5, { align: "right" });
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    transacoes.forEach((tx, i) => {
      if (y > ph - 20) {
        doc.addPage();
        y = 20;
      }
      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(ml, y - 2, pw - ml * 2, 7, "F");
      }
      doc.setTextColor(119, 119, 119);
      doc.text(
        new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit", month: "2-digit",
        }),
        ml + 2,
        y + 3
      );
      doc.setTextColor(0, 0, 0);
      doc.text(safe(tx.descricao || "—").slice(0, 30), ml + 25, y + 3);
      doc.setTextColor(85, 85, 85);
      doc.text(safe(tx.categorias?.nome || "Outros").slice(0, 14), ml + 100, y + 3);
      const isDesp = tx.tipo === "despesa";
      doc.setTextColor(isDesp ? 211 : 56, isDesp ? 47 : 142, isDesp ? 47 : 60);
      doc.text(
        (isDesp ? "-" : "+") + formatCurrency(tx.valor),
        mr - 2,
        y + 3,
        { align: "right" }
      );
      y += 8;
    });
  }

  // Rodapé em todas as páginas
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(153, 153, 153);
    doc.text(
      `Open Finance  ·  Documento confidencial  ·  Pagina ${i} de ${pageCount}`,
      pw / 2,
      ph - 10,
      { align: "center" }
    );
  }

  doc.save(`relatorio-${safe(month).toLowerCase()}-${year}.pdf`);
}

function generateXLSX(
  transacoes: any[],
  totais: ReturnType<typeof calcularTotais>,
  categorias: ReturnType<typeof calcularCategorias>,
  userName: string,
  month: string,
  year: string
) {
  const wb = XLSX.utils.book_new();

  // Aba Resumo
  const resumoData = [
    ["Open Finance — Relatório Mensal"],
    [`${month} ${year}  |  ${userName}`],
    ["Gerado em:", new Date().toLocaleDateString("pt-BR")],
    [],
    ["RESUMO"],
    ["Total de Gastos", totais.totalGastos],
    ["Total de Renda", totais.totalRenda],
    ["Saldo Disponível", totais.saldoDisponivel],
    ["Economia (%)", `${totais.percentualEconomia.toFixed(1)}%`],
    [],
    ["GASTOS POR CATEGORIA"],
    ["Categoria", "Valor (R$)", "% Total"],
    ...categorias.map((c) => [c.name, c.value, `${c.percent}%`]),
  ];
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
  resumoSheet["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, resumoSheet, "Resumo");

  // Aba Transações
  const txData = [
    ["Data", "Descrição", "Categoria", "Tipo", "Valor (R$)"],
    ...transacoes.map((tx) => [
      new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR"),
      tx.descricao || "—",
      tx.categorias?.nome || "Outros",
      tx.tipo === "despesa" ? "Despesa" : "Receita",
      tx.tipo === "despesa" ? -tx.valor : tx.valor,
    ]),
  ];
  const txSheet = XLSX.utils.aoa_to_sheet(txData);
  txSheet["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, txSheet, "Transações");

  XLSX.writeFile(wb, `relatorio-${month.toLowerCase()}-${year}.xlsx`);
}

export default function Reports() {
  const { user } = useAuth();
  const userId = user!.id;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [format, setFormat] = useState<"PDF" | "XLSX">("PDF");
  const [isGenerating, setIsGenerating] = useState(false);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const userEmail = user?.email ?? "";

  useEffect(() => {
    getProfile(userId).then((p) => {
      setUserName(p?.nome || user?.user_metadata?.full_name || userEmail.split("@")[0] || "Usuário");
    });
  }, [userId]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const mes = MONTH_INDEX[selectedMonth];
        const ano = parseInt(selectedYear);
        const data = await getTransacoesMesEspecifico(userId, mes, ano);
        setTransacoes(data);
      } catch (err) {
        console.error("Erro ao carregar relatório:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [userId, selectedMonth, selectedYear]);

  const totais = useMemo(() => calcularTotais(transacoes), [transacoes]);
  const categorias = useMemo(() => calcularCategorias(transacoes), [transacoes]);

  const handleDownload = async () => {
    if (transacoes.length === 0) {
      toast.error("Não há dados para o período selecionado.");
      return;
    }
    setIsGenerating(true);
    try {
      if (format === "PDF") {
        generatePDF(transacoes, totais, categorias, userName, userEmail, selectedMonth, selectedYear);
      } else {
        generateXLSX(transacoes, totais, categorias, userName, selectedMonth, selectedYear);
      }
      toast.success(`Relatório ${format} gerado!`, {
        description: `${selectedMonth} ${selectedYear} baixado com sucesso.`,
        duration: 3500,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1000px] mx-auto">
      {/* Controles */}
      <div
        className="bg-white rounded-lg border border-[#E0E0E0] p-5 mb-5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-black mb-4 flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600 }}>
          <Calendar size={16} />
          Configurar Relatório
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[#777777] uppercase tracking-wider block mb-2" style={{ fontSize: 11, fontWeight: 500 }}>
              Mês
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-[#E0E0E0] rounded-md px-3 py-2.5 outline-none focus:border-black transition-colors text-black bg-white"
              style={{ fontSize: 13 }}
            >
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[#777777] uppercase tracking-wider block mb-2" style={{ fontSize: 11, fontWeight: 500 }}>
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-[#E0E0E0] rounded-md px-3 py-2.5 outline-none focus:border-black transition-colors text-black bg-white"
              style={{ fontSize: 13 }}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[#777777] uppercase tracking-wider block mb-2" style={{ fontSize: 11, fontWeight: 500 }}>
              Formato
            </label>
            <div className="flex border border-[#E0E0E0] rounded-md overflow-hidden">
              {(["PDF", "XLSX"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors ${
                    format === f ? "bg-black text-white" : "text-[#555555] hover:bg-[#F5F5F5]"
                  }`}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {f === "PDF" ? <FileText size={14} /> : <FileSpreadsheet size={14} />}
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isGenerating || loading}
          className="mt-5 w-full sm:w-auto px-8 py-3 bg-black text-white rounded-lg hover:bg-[#333333] transition-colors disabled:bg-[#E0E0E0] disabled:text-[#999999] flex items-center gap-2"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Gerando relatório...
            </>
          ) : (
            <>
              <Download size={16} />
              Baixar Relatório {format}
            </>
          )}
        </button>
      </div>

      {/* Preview */}
      <div
        className="bg-white rounded-lg border border-[#E0E0E0] overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        {/* Header */}
        <div className="bg-black text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                <span className="text-black" style={{ fontSize: 9, fontWeight: 700 }}>OF</span>
              </div>
              <span className="text-[#E0E0E0] uppercase tracking-wider" style={{ fontSize: 12, fontWeight: 600 }}>
                Open Finance
              </span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              Relatório Mensal — {selectedMonth} {selectedYear}
            </h2>
            <p className="text-[#BBBBBB] mt-0.5" style={{ fontSize: 12 }}>
              {userName} · {userEmail}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#BBBBBB]" style={{ fontSize: 11 }}>Gerado em</p>
            <p style={{ fontSize: 12, fontWeight: 500 }}>{new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transacoes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p style={{ fontSize: 14 }} className="text-[#777777]">
              Nenhuma transação encontrada para {selectedMonth} {selectedYear}.
            </p>
          </div>
        ) : (
          <>
            {/* Resumo */}
            <div className="px-6 py-5 border-b border-[#F0F0F0]">
              <h3 className="text-[#777777] uppercase tracking-wider mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                Resumo Executivo
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total de Gastos", value: formatCurrency(totais.totalGastos), icon: ArrowDownRight, color: "#D32F2F" },
                  { label: "Total de Renda", value: formatCurrency(totais.totalRenda), icon: ArrowUpRight, color: "#388E3C" },
                  { label: "Saldo", value: formatCurrency(totais.saldoDisponivel), icon: Wallet, color: "#333333" },
                  { label: "Economia", value: `${totais.percentualEconomia.toFixed(1)}%`, icon: PiggyBank, color: "#333333" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="border border-[#E0E0E0] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color }} />
                      <p className="text-[#777777]" style={{ fontSize: 11, fontWeight: 500 }}>{label}</p>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 700, color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorias */}
            {categorias.length > 0 && (
              <div className="px-6 py-5 border-b border-[#F0F0F0]">
                <h3 className="text-[#777777] uppercase tracking-wider mb-4 flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600 }}>
                  <BarChart2 size={14} />
                  Gastos por Categoria
                </h3>
                <div className="space-y-3">
                  {categorias.map((item) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-[#333333]" style={{ fontSize: 12, fontWeight: 500 }}>{item.name}</p>
                      </div>
                      <div className="flex-1 h-6 bg-[#F5F5F5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full flex items-center pl-3"
                          style={{ width: `${item.percent}%`, minWidth: "2rem" }}
                        >
                          <span className="text-white" style={{ fontSize: 10, fontWeight: 600 }}>
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-24 text-right flex-shrink-0">
                        <p className="text-black" style={{ fontSize: 13, fontWeight: 600 }}>
                          {formatCurrency(item.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transações */}
            <div className="px-6 py-5 border-b border-[#F0F0F0]">
              <h3 className="text-[#777777] uppercase tracking-wider mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                Transações Detalhadas ({transacoes.length})
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E0E0E0]">
                    {["Data", "Descrição", "Categoria", "Tipo", "Valor"].map((h, i) => (
                      <th
                        key={h}
                        className={`pb-2 text-[#777777] ${i >= 3 ? "text-right" : "text-left"}`}
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((tx, i) => (
                    <tr key={tx.id} className={i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}>
                      <td className="py-2.5 text-[#777777]" style={{ fontSize: 12 }}>
                        {new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="py-2.5 text-black" style={{ fontSize: 12, fontWeight: 500 }}>
                        {tx.descricao || "—"}
                      </td>
                      <td className="py-2.5">
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{ fontSize: 10, fontWeight: 500, backgroundColor: "#F5F5F5", color: "#555555" }}
                        >
                          {tx.categorias?.nome || "Outros"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className="px-2 py-0.5 rounded text-white"
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            backgroundColor: tx.tipo === "despesa" ? "#D32F2F" : "#388E3C",
                          }}
                        >
                          {tx.tipo === "despesa" ? "Despesa" : "Receita"}
                        </span>
                      </td>
                      <td
                        className="py-2.5 text-right"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: tx.tipo === "despesa" ? "#D32F2F" : "#388E3C",
                        }}
                      >
                        {tx.tipo === "despesa" ? "-" : "+"}{formatCurrency(tx.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Rodapé */}
        <div className="px-6 py-4 bg-[#F5F5F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
              <span className="text-white" style={{ fontSize: 8, fontWeight: 700 }}>OF</span>
            </div>
            <span className="text-[#777777]" style={{ fontSize: 11 }}>Open Finance — Gestão Financeira</span>
          </div>
          <span className="text-[#999999]" style={{ fontSize: 11 }}>
            Documento confidencial · {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
}
