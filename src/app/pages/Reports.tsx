import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText, Download, FileSpreadsheet, Calendar,
  BarChart2, ArrowDownRight, ArrowUpRight, Wallet, PiggyBank,
  Sparkles, AlertTriangle, Trophy, Lock, RefreshCw, ChevronDown,
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  getTransacoesMesEspecifico,
  calcularTotais,
  calcularCategorias,
  getProfile,
} from "../../lib/queries";
import type { Profile } from "../../lib/types";
import {
  getOuCriarRelatorio,
  type RelatorioIA,
} from "../../lib/gemini";
import { useFeatureAccess } from "../hooks/useFeatureAccess";

// ── Constantes ────────────────────────────────────────────────────────────────

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
const LOADING_TEXTOS = [
  "Analisando seus gastos...",
  "Identificando padrões...",
  "Calculando recomendações...",
  "Finalizando o relatório...",
];
const PRIORIDADE: Record<string, { label: string; bg: string; color: string }> = {
  alta:  { label: "Alta",   bg: "#FEE2E2", color: "#DC2626" },
  media: { label: "Média",  bg: "#FEF3C7", color: "#D97706" },
  baixa: { label: "Baixa",  bg: "#DCFCE7", color: "#16A34A" },
};

const isPro = (plano: string) => plano === "pro" || plano === "familia";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function safe(text: string): string {
  return text
    .replace(/[ãâàá]/g, "a").replace(/[ÃÂÀÁ]/g, "A")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/[éê]/g, "e").replace(/[ÉÊ]/g, "E")
    .replace(/í/g, "i").replace(/Í/g, "I")
    .replace(/[óô]/g, "o").replace(/[ÓÔ]/g, "O")
    .replace(/ú/g, "u").replace(/Ú/g, "U");
}

function iaErroMsg(msg: string): string {
  if (msg === "GEMINI_KEY_MISSING") return "Configure a chave VITE_GEMINI_API_KEY no arquivo .env.local"
  if (msg === "RATE_LIMIT") return "Limite de requisições atingido. Tente novamente em alguns minutos."
  if (msg === "PARSE_ERROR") return "A IA retornou uma resposta inválida. Tente novamente."
  return "Erro ao gerar relatório com IA. Tente novamente."
}

// ── Geração de PDF (transações) ───────────────────────────────────────────────

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

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Openfy", ml, 15);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(safe(`Relatorio Mensal — ${month} ${year}`), ml, 25);
  doc.setFontSize(10);
  doc.setTextColor(187, 187, 187);
  doc.text(safe(userName) + "  |  " + userEmail, ml, 34);
  doc.text(new Date().toLocaleDateString("pt-BR"), mr, 34, { align: "right" });

  let y = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Executivo", ml, y);
  y += 8;

  const cardW = (pw - ml * 2 - 10) / 2;
  const summaryItems = [
    { label: "Total de Gastos",    value: formatCurrency(totais.totalGastos),      r: 211, g: 47,  b: 47  },
    { label: "Total de Renda",     value: formatCurrency(totais.totalRenda),        r: 56,  g: 142, b: 60  },
    { label: "Saldo Disponivel",   value: formatCurrency(totais.saldoDisponivel),   r: 0,   g: 0,   b: 0   },
    { label: "Economia",           value: `${totais.percentualEconomia.toFixed(1)}%`, r: 0, g: 0,   b: 0   },
  ];
  summaryItems.forEach((item, i) => {
    const x  = ml + (i % 2) * (cardW + 10);
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

  if (transacoes.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(safe("Transações do Mês"), ml, y);
    y += 8;
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
      if (y > ph - 20) { doc.addPage(); y = 20; }
      if (i % 2 === 1) { doc.setFillColor(250, 250, 250); doc.rect(ml, y - 2, pw - ml * 2, 7, "F"); }
      doc.setTextColor(119, 119, 119);
      doc.text(new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), ml + 2, y + 3);
      doc.setTextColor(0, 0, 0);
      doc.text(safe(tx.descricao || "—").slice(0, 30), ml + 25, y + 3);
      doc.setTextColor(85, 85, 85);
      doc.text(safe(tx.categorias?.nome || "Outros").slice(0, 14), ml + 100, y + 3);
      const isDesp = tx.tipo === "despesa";
      doc.setTextColor(isDesp ? 211 : 56, isDesp ? 47 : 142, isDesp ? 47 : 60);
      doc.text((isDesp ? "-" : "+") + formatCurrency(tx.valor), mr - 2, y + 3, { align: "right" });
      y += 8;
    });
  }

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(153, 153, 153);
    doc.text(`Openfy  ·  Documento confidencial  ·  Pagina ${i} de ${pageCount}`, pw / 2, ph - 10, { align: "center" });
  }

  doc.save(`relatorio-${safe(month).toLowerCase()}-${year}.pdf`);
}

// ── Geração de PDF (relatório IA) ─────────────────────────────────────────────

function generateRelatorioIAPDF(rel: RelatorioIA, userName: string, month: string, year: string) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 20;
  const mr = pw - ml;
  const maxW = mr - ml;

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Openfy — Relatorio com IA", ml, 15);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(safe(`${month} ${year}  |  ${safe(userName)}`), ml, 26);
  doc.setFontSize(9);
  doc.setTextColor(187, 187, 187);
  doc.text(new Date().toLocaleDateString("pt-BR"), mr, 34, { align: "right" });

  let y = 52;

  const addSection = (titulo: string, texto: string, destBg?: [number, number, number]) => {
    if (y > ph - 40) { doc.addPage(); y = 20; }
    if (destBg) {
      doc.setFillColor(...destBg);
      const linhas = doc.splitTextToSize(safe(texto), maxW - 8);
      const h = linhas.length * 6 + 18;
      doc.roundedRect(ml, y, maxW, h, 3, 3, "F");
      y += 8;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(titulo, ml + (destBg ? 4 : 0), y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const linhas = doc.splitTextToSize(safe(texto), maxW - (destBg ? 8 : 0));
    doc.text(linhas, ml + (destBg ? 4 : 0), y);
    y += linhas.length * 6 + (destBg ? 10 : 8);
  };

  addSection("Resumo Executivo", rel.resumo_executivo);
  addSection("Ponto de Atencao", rel.ponto_de_atencao, [255, 251, 194]);
  addSection("Analise de Categorias", rel.analise_categorias);

  if (y > ph - 60) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Recomendacoes", ml, y);
  y += 7;

  rel.recomendacoes.forEach((rec, i) => {
    if (y > ph - 30) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${safe(rec.titulo)} [${rec.prioridade.toUpperCase()}]`, ml + 2, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const linhas = doc.splitTextToSize(safe(rec.descricao), maxW - 4);
    doc.text(linhas, ml + 2, y);
    y += linhas.length * 5 + 5;
  });

  addSection("Previsao Proximo Mes", rel.previsao_proximo_mes, [239, 246, 255]);
  addSection("Score", rel.score_comentario, [240, 253, 244]);
  addSection("Mensagem Final", rel.mensagem_motivacional);

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(153, 153, 153);
    doc.text(`Openfy  ·  Relatorio IA  ·  Pagina ${i} de ${pageCount}`, pw / 2, ph - 10, { align: "center" });
  }

  doc.save(`relatorio-ia-${safe(month).toLowerCase()}-${year}.pdf`);
}

// ── Geração de XLSX ───────────────────────────────────────────────────────────

function generateXLSX(
  transacoes: any[],
  totais: ReturnType<typeof calcularTotais>,
  categorias: ReturnType<typeof calcularCategorias>,
  userName: string,
  month: string,
  year: string
) {
  const wb = XLSX.utils.book_new();
  const resumoData = [
    ["Openfy — Relatório Mensal"],
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

// ── Componente principal ──────────────────────────────────────────────────────

export default function Reports() {
  const { user } = useAuth();
  const userId = user!.id;
  const userEmail = user?.email ?? "";
  const { userPlan, loading: planLoading } = useFeatureAccess("pro");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear]   = useState(String(currentYear));
  const [format, setFormat]               = useState<"PDF" | "XLSX">("PDF");
  const [isExporting, setIsExporting]     = useState(false);
  const [transacoes, setTransacoes]       = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [profile, setProfile]             = useState<Profile | null>(null);

  // IA
  const [relatorioIA, setRelatorioIA]             = useState<RelatorioIA | null>(null);
  const [relatorioCreatedAt, setRelatorioCreatedAt] = useState<string | null>(null);
  const [loadingIA, setLoadingIA]                 = useState(false);
  const [iaErro, setIaErro]                       = useState<string | null>(null);
  const [loadingTextoIdx, setLoadingTextoIdx]     = useState(0);

  const userName = profile?.nome || user?.user_metadata?.full_name || userEmail.split("@")[0] || "Usuário";

  // Carregar perfil
  useEffect(() => {
    getProfile(userId).then(setProfile).catch(console.error);
  }, [userId]);

  // Carregar transações
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const mes = MONTH_INDEX[selectedMonth];
        const ano = parseInt(selectedYear);
        const data = await getTransacoesMesEspecifico(userId, mes, ano);
        setTransacoes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, selectedMonth, selectedYear]);

  // Verificar cache de relatório IA ao mudar mês/ano
  useEffect(() => {
    setRelatorioIA(null);
    setRelatorioCreatedAt(null);
    setIaErro(null);
    if (!isPro(userPlan) || planLoading) return;

    const mes = MONTH_INDEX[selectedMonth] + 1;
    const ano = parseInt(selectedYear);
    supabase
      .from("relatorios_ia")
      .select("conteudo, criado_em")
      .eq("user_id", userId)
      .eq("mes", mes)
      .eq("ano", ano)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.conteudo) {
          setRelatorioIA(data.conteudo as RelatorioIA);
          setRelatorioCreatedAt(data.criado_em as string);
        }
      });
  }, [selectedMonth, selectedYear, userPlan, planLoading, userId]);

  const totais    = useMemo(() => calcularTotais(transacoes), [transacoes]);
  const categorias = useMemo(() => calcularCategorias(transacoes), [transacoes]);

  const metaPct      = profile?.meta_economia ?? 20;
  const metaValor    = (totais.totalRenda * metaPct) / 100;
  const progressMeta = metaValor > 0 ? Math.min(100, (totais.saldoDisponivel / metaValor) * 100) : 0;
  const bateuMeta    = totais.saldoDisponivel >= metaValor && metaValor > 0;

  // Gerar relatório IA
  async function gerarIA(forceRegen = false) {
    setLoadingIA(true);
    setIaErro(null);
    if (forceRegen) setRelatorioIA(null);

    const mes = MONTH_INDEX[selectedMonth] + 1;
    const ano = parseInt(selectedYear);

    if (forceRegen) {
      await supabase.from("relatorios_ia").delete().eq("user_id", userId).eq("mes", mes).eq("ano", ano);
    }

    const intervalId = setInterval(() => {
      setLoadingTextoIdx((prev) => (prev + 1) % LOADING_TEXTOS.length);
    }, 2000);

    try {
      const rel = await getOuCriarRelatorio(userId, mes, ano);
      setRelatorioIA(rel);
      setRelatorioCreatedAt(new Date().toISOString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      setIaErro(iaErroMsg(msg));
    } finally {
      clearInterval(intervalId);
      setLoadingTextoIdx(0);
      setLoadingIA(false);
    }
  }

  // Exportar
  async function handleExport() {
    if (transacoes.length === 0) { toast.error("Não há dados para o período selecionado."); return; }
    setIsExporting(true);
    try {
      if (format === "PDF") {
        generatePDF(transacoes, totais, categorias, userName, userEmail, selectedMonth, selectedYear);
      } else {
        generateXLSX(transacoes, totais, categorias, userName, selectedMonth, selectedYear);
      }
      toast.success(`Relatório ${format} gerado!`, { description: `${selectedMonth} ${selectedYear}`, duration: 3000 });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-[960px] mx-auto space-y-5" style={{ fontFamily: "var(--font-body)" }}>

      {/* ── Cabeçalho: seletor de mês ── */}
      <div className="bg-white rounded-xl border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={15} className="text-[#525252]" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>Período do relatório</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div style={{ position: "relative" }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none border border-[#E0E0E0] rounded-lg px-3 py-2 pr-8 outline-none focus:border-black text-black bg-white"
              style={{ fontSize: 13 }}
            >
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="text-[#999999] pointer-events-none" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} />
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none border border-[#E0E0E0] rounded-lg px-3 py-2 pr-8 outline-none focus:border-black text-black bg-white"
              style={{ fontSize: 13 }}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="text-[#999999] pointer-events-none" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} />
          </div>
        </div>
      </div>

      {/* ── Seção 1: Resumo numérico ── */}
      <div>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: "#A3A3A3", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          Resumo do mês
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transacoes.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-8 text-center">
            <p style={{ fontSize: 14, color: "#A3A3A3" }}>Nenhuma transação em {selectedMonth} {selectedYear}.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {[
                { label: "Receitas",    value: formatCurrency(totais.totalRenda),       icon: ArrowUpRight,   color: "#16A34A" },
                { label: "Despesas",    value: formatCurrency(totais.totalGastos),       icon: ArrowDownRight, color: "#DC2626" },
                { label: "Saldo",       value: formatCurrency(totais.saldoDisponivel),   icon: Wallet,         color: totais.saldoDisponivel >= 0 ? "#16A34A" : "#DC2626" },
                { label: "Economizado", value: `${totais.percentualEconomia.toFixed(1)}%`, icon: PiggyBank,   color: "#525252" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E0E0E0] p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} style={{ color }} />
                    <p style={{ fontSize: 11, fontWeight: 500, color: "#A3A3A3" }}>{label}</p>
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Barra de meta de economia */}
            {metaValor > 0 && (
              <div className="bg-white rounded-xl border border-[#E0E0E0] p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PiggyBank size={13} style={{ color: bateuMeta ? "#16A34A" : "#D97706" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A" }}>Meta de economia</span>
                    <span style={{ fontSize: 11, color: "#A3A3A3" }}>{metaPct}% da renda</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bateuMeta ? "#16A34A" : "#D97706" }}>
                    {bateuMeta ? "✓ Atingida" : `${Math.round(Math.max(0, progressMeta))}%`}
                  </span>
                </div>
                <div className="h-2 bg-[#F5F5F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progressMeta))}%`, background: bateuMeta ? "#16A34A" : "#D97706" }}
                  />
                </div>
                <p style={{ fontSize: 11, color: "#A3A3A3", marginTop: 6 }}>
                  {formatCurrency(Math.max(0, totais.saldoDisponivel))} de {formatCurrency(metaValor)} economizados
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Seção 2: Relatório com IA ── */}
      <div>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: "#A3A3A3", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          Relatório com IA
        </h2>

        {planLoading ? null : !isPro(userPlan) ? (
          /* Lock para Free */
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-8 flex flex-col items-center text-center" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F5F5F0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Lock size={22} style={{ color: "#A3A3A3" }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", marginBottom: 8 }}>Relatório com IA disponível no plano Pro</h3>
            <p style={{ fontSize: 13, color: "#525252", marginBottom: 20, maxWidth: 360, lineHeight: 1.6 }}>
              Receba análises personalizadas, recomendações concretas e previsões para o próximo mês geradas por IA.
            </p>
            <a href="/app/perfil" style={{ padding: "10px 24px", background: "#16A34A", color: "#FFFFFF", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Ver plano Pro →
            </a>
          </div>
        ) : loadingIA ? (
          /* Loading state */
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-10 flex flex-col items-center text-center" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-5" />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A" }}>{LOADING_TEXTOS[loadingTextoIdx]}</p>
            <p style={{ fontSize: 12, color: "#A3A3A3", marginTop: 6 }}>Isso pode levar alguns segundos</p>
          </div>
        ) : iaErro ? (
          /* Erro */
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-6" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "#0A0A0A" }}>{iaErro}</p>
            </div>
            {transacoes.length > 0 && (
              <button onClick={() => gerarIA()} style={{ padding: "8px 18px", background: "#0A0A0A", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Tentar novamente
              </button>
            )}
          </div>
        ) : relatorioIA ? (
          /* Relatório gerado */
          <div className="space-y-3">
            {/* Metadata + regenerar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              {relatorioCreatedAt && (
                <p style={{ fontSize: 11, color: "#A3A3A3" }}>
                  Gerado em {new Date(relatorioCreatedAt).toLocaleDateString("pt-BR")} às {new Date(relatorioCreatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <button
                onClick={() => gerarIA(true)}
                className="flex items-center gap-1.5"
                style={{ background: "none", border: "1px solid #E0E0E0", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#525252", cursor: "pointer" }}
              >
                <RefreshCw size={12} /> Regenerar
              </button>
            </div>

            {/* Card 1 — Resumo */}
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} style={{ color: "#525252" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0A0A0A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resumo do mês</span>
              </div>
              <p style={{ fontSize: 14, color: "#333333", lineHeight: 1.7 }}>{relatorioIA.resumo_executivo}</p>
            </div>

            {/* Card 2 — Ponto de atenção */}
            <div className="rounded-xl border p-5" style={{ background: "#FEF9C3", borderColor: "#FDE047", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} style={{ color: "#D97706" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ponto de atenção</span>
              </div>
              <p style={{ fontSize: 14, color: "#92400E", lineHeight: 1.6 }}>{relatorioIA.ponto_de_atencao}</p>
            </div>

            {/* Card 3 — Análise de categorias */}
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={15} style={{ color: "#525252" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0A0A0A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Análise de categorias</span>
              </div>
              <p style={{ fontSize: 14, color: "#333333", lineHeight: 1.7 }}>{relatorioIA.analise_categorias}</p>
            </div>

            {/* Card 4 — Recomendações */}
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={15} style={{ color: "#525252" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0A0A0A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recomendações</span>
              </div>
              <div className="space-y-3">
                {relatorioIA.recomendacoes.map((rec, i) => {
                  const cfg = PRIORIDADE[rec.prioridade] ?? PRIORIDADE.baixa;
                  return (
                    <div key={i} className="rounded-lg p-4" style={{ background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>{rec.titulo}</p>
                      </div>
                      <p style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>{rec.descricao}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 5 — Previsão */}
            <div className="rounded-xl border p-5" style={{ background: "#EFF6FF", borderColor: "#BFDBFE", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={15} style={{ color: "#2563EB" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.05em" }}>Previsão para o próximo mês</span>
              </div>
              <p style={{ fontSize: 14, color: "#1E3A8A", lineHeight: 1.6 }}>{relatorioIA.previsao_proximo_mes}</p>
            </div>

            {/* Card 6 — Score */}
            <div className="rounded-xl border p-5" style={{ background: "#F0FDF4", borderColor: "#BBF7D0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={15} style={{ color: "#16A34A" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Seu score</span>
              </div>
              <p style={{ fontSize: 14, color: "#14532D", lineHeight: 1.6 }}>{relatorioIA.score_comentario}</p>
            </div>

            {/* Card 7 — Mensagem motivacional */}
            <div className="rounded-xl p-6 text-center" style={{ background: "#0A0A0A" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.7 }}>{relatorioIA.mensagem_motivacional}</p>
            </div>
          </div>
        ) : (
          /* Estado inicial: botão gerar */
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-8 flex flex-col items-center text-center" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Sparkles size={22} style={{ color: "#16A34A" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", marginBottom: 8 }}>Relatório com IA</h3>
            <p style={{ fontSize: 13, color: "#525252", marginBottom: 20, maxWidth: 340, lineHeight: 1.6 }}>
              {transacoes.length === 0
                ? "Adicione transações neste mês para gerar o relatório."
                : "Análise personalizada com recomendações concretas baseadas nos seus dados reais."}
            </p>
            <button
              disabled={transacoes.length === 0}
              onClick={() => gerarIA()}
              style={{
                padding: "11px 28px",
                background: transacoes.length === 0 ? "#E5E5E3" : "#0A0A0A",
                color: transacoes.length === 0 ? "#A3A3A3" : "#FFFFFF",
                border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
                cursor: transacoes.length === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <Sparkles size={15} />
              Gerar relatório com IA
            </button>
          </div>
        )}
      </div>

      {/* ── Seção 3: Exportação ── */}
      <div>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: "#A3A3A3", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          Exportar
        </h2>
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle PDF/XLSX */}
            <div className="flex border border-[#E0E0E0] rounded-lg overflow-hidden">
              {(["PDF", "XLSX"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${format === f ? "bg-black text-white" : "text-[#555555] hover:bg-[#F5F5F5]"}`}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {f === "PDF" ? <FileText size={13} /> : <FileSpreadsheet size={13} />}
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || loading || transacoes.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-lg hover:bg-[#333333] transition-colors disabled:bg-[#E0E0E0] disabled:text-[#999999]"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {isExporting
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Gerando...</>
                : <><Download size={14} /> Baixar {format}</>
              }
            </button>

            {isPro(userPlan) && relatorioIA && (
              <button
                onClick={() => generateRelatorioIAPDF(relatorioIA, userName, selectedMonth, selectedYear)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg border border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] transition-colors"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                <Sparkles size={14} />
                Exportar relatório IA em PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview de transações ── */}
      {!loading && transacoes.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="bg-black text-white px-5 py-4 flex items-center justify-between">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Transações — {selectedMonth} {selectedYear}</h2>
              <p className="text-[#BBBBBB] mt-0.5" style={{ fontSize: 11 }}>{userName}</p>
            </div>
          </div>

          {categorias.length > 0 && (
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <h3 className="text-[#777777] uppercase tracking-wider mb-3 flex items-center gap-2" style={{ fontSize: 11, fontWeight: 600 }}>
                <BarChart2 size={12} /> Gastos por categoria
              </h3>
              <div className="space-y-2">
                {categorias.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-24 flex-shrink-0"><p className="text-[#333333]" style={{ fontSize: 12 }}>{item.name}</p></div>
                    <div className="flex-1 h-5 bg-[#F5F5F5] rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full flex items-center pl-2" style={{ width: `${item.percent}%`, minWidth: "2rem" }}>
                        <span className="text-white" style={{ fontSize: 9, fontWeight: 600 }}>{item.percent}%</span>
                      </div>
                    </div>
                    <div className="w-24 text-right flex-shrink-0"><p className="text-black" style={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(item.value)}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-4">
            <h3 className="text-[#777777] uppercase tracking-wider mb-3" style={{ fontSize: 11, fontWeight: 600 }}>
              Detalhes ({transacoes.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E0E0E0]">
                    {["Data", "Descrição", "Categoria", "Tipo", "Valor"].map((h, i) => (
                      <th key={h} className={`pb-2 text-[#777777] ${i >= 3 ? "text-right" : "text-left"}`} style={{ fontSize: 11, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((tx, i) => (
                    <tr key={tx.id} className={i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}>
                      <td className="py-2 text-[#777777]" style={{ fontSize: 12 }}>
                        {new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="py-2 text-black" style={{ fontSize: 12 }}>{tx.descricao || "—"}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded" style={{ fontSize: 10, background: "#F5F5F5", color: "#555555" }}>
                          {tx.categorias?.nome || "Outros"}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="px-2 py-0.5 rounded text-white" style={{ fontSize: 10, background: tx.tipo === "despesa" ? "#DC2626" : "#16A34A" }}>
                          {tx.tipo === "despesa" ? "Despesa" : "Receita"}
                        </span>
                      </td>
                      <td className="py-2 text-right" style={{ fontSize: 12, fontWeight: 600, color: tx.tipo === "despesa" ? "#DC2626" : "#16A34A" }}>
                        {tx.tipo === "despesa" ? "-" : "+"}{formatCurrency(tx.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
