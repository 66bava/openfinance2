import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { formatCurrency, formatShortDate } from "../../../lib/format"
import type { MetodoPagamento } from "../../../lib/types"
import { getCurrentCycleRange } from "../../../lib/financial-cycle"
import { calculateFinancialScore } from "../../../score-engine"
import { getTotaisMes } from "../../../lib/queries"
import { getUserFinancialSettings } from "../../../lib/queries/financial-settings"
import { atualizarInvestimento, criarInvestimento, getInvestimentos, calcularPatrimonioEstimado } from "../../../lib/queries/investimentos"
import { getAssinaturas, calcularTotalMensal, criarAssinatura } from "../../../lib/queries/assinaturas"
import { criarCompromisso, getCompromissos } from "../../../lib/queries/futuro"
import { addTransacoesBulkResilientWithReport, createNotification, getOrCreateCategoria } from "../../../lib/queries"
import { ensureActiveCycle, refreshActiveCycleTotals } from "../../../lib/queries/cycles"
import {
  checkImportDuplicates,
  candidateFingerprint,
  completeImportBatch,
  createImportBatch,
  deleteImportBatch,
  failImportBatch,
  getImportBatches,
  updateImportBatch,
  type ImportBatchRow,
} from "../../../lib/queries/imports"
import {
  detectRecurringTransactions,
  detectSalary,
  detectSubscriptions,
  importedTxRecurringKey,
  normalizeImportedTransactions,
  applyUserCategorizationRules,
  parseAnySupportedFile,
  type ImportedTransactionCandidate,
  type ImportParseResult,
} from "../../../lib/import"
import { mapImportedTransactionToDb } from "../../../lib/import/map-to-db"
import { getUserCategorizationRules, upsertUserCategorizationRule } from "../../../lib/queries/categorization-rules"
import { triggerPostImportNotifications } from "../../../lib/notifications-auto"
import type { AppOutletContext } from "../../../app/components/Layout"

type ImportUIState = "empty" | "upload" | "processing" | "preview" | "success" | "error" | "insufficient" | "partial"

type DetectedSub = { key: string; name: string; monthlyEstimate: number; confidence: number }

type DetectedPlan = { key: string; name: string; monthlyEstimate: number; kind: "despesa_fixa" | "financiamento"; dueDay: number }

type DetectedInvestment = { key: string; name: string; amount: number; date: string; type: "receita" | "despesa" }

type SaveFailure = { idx: number; reason: string; stage: "validation" | "supabase"; payload?: Record<string, any> }

type CategoryChip = { emoji: string; nome: string; valor: number }

type TxPreviewRow = { emoji: string; nome: string; categoria: string; valor: number; positivo: boolean; data: string }

type PreviewData = {
  filename: string
  filesizeLabel: string
  transacoes: number
  receitas: number
  despesas: number
  saldo: number
  score: number
  scorePrevio: number
  confiancaIA: number
  assinaturas: number
  recorrencias: number
  salario: number
  categorias: CategoryChip[]
  transacoes_preview: TxPreviewRow[]
  paymentMethods: Array<{ method: MetodoPagamento; count: number }>
  statementBalance: number | null
  invalidRows: number
  detected: { encoding: string; delimiter: string | null; bank: string | null }
}

const PASSOS_PROCESSAMENTO: Array<{ label: string; sub: string }> = [
  { label: "Arquivo recebido", sub: "Leitura confirmada" },
  { label: "Lendo transações", sub: "Identificando estrutura" },
  { label: "Categorizando automaticamente", sub: "Organizando por categoria" },
  { label: "Detectando recorrências", sub: "Analisando padrões" },
  { label: "Calculando Score Financeiro", sub: "Avaliando saúde financeira" },
  { label: "Finalizando", sub: "Preparando prévia" },
]

function methodLabel(m: MetodoPagamento) {
  switch (m) {
    case "credito":
      return "Crédito"
    case "debito":
      return "Débito"
    case "pix":
      return "Pix"
    case "pix_qr_code":
      return "Pix QR"
    case "boleto":
      return "Boleto"
    case "dinheiro":
      return "Dinheiro"
    case "transferencia":
      return "Transferência"
    case "debito_automatico":
      return "Débito automático"
    default:
      return "Outro"
  }
}

function filesizeLabel(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function computeConfidence(rawRows: number, normalized: ImportedTransactionCandidate[]) {
  const coverage = rawRows > 0 ? normalized.length / rawRows : 0
  const highCat = normalized.filter((t) => t.category.confidence >= 0.85).length
  const catRate = normalized.length > 0 ? highCat / normalized.length : 0
  const withPayment = normalized.filter((t) => t.paymentMethod != null).length
  const payRate = normalized.length > 0 ? withPayment / normalized.length : 0

  const score = 0.55 * coverage + 0.3 * catRate + 0.15 * payRate
  return Math.round(clamp01(score) * 100)
}

function emojiForCategory(name: string) {
  const n = name.toLowerCase()
  if (n.includes("alimenta")) return "🍔"
  if (n.includes("moradia")) return "🏠"
  if (n.includes("transporte")) return "🚗"
  if (n.includes("assin")) return "📱"
  if (n.includes("saúde") || n.includes("saude")) return "💊"
  if (n.includes("educa")) return "📚"
  if (n.includes("conta")) return "🧾"
  if (n.includes("receita")) return "💰"
  return "📦"
}

function TxRow({ emoji, nome, categoria, valor, positivo, data }: TxPreviewRow) {
  return (
    <div
      className="flex items-center justify-between py-3 last:pb-0"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
          style={{ background: positivo ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)" }}
        >
          {emoji}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] truncate" style={{ color: "#D0D0D0" }}>{nome}</p>
          <p className="text-[11px]" style={{ color: "#555" }}>
            {categoria} · {data}
          </p>
        </div>
      </div>
      <span
        className="text-[13px] font-semibold tabular-nums shrink-0 ml-3"
        style={{ color: positivo ? "#22C55E" : "#EF4444" }}
      >
        {positivo ? "+" : "−"}
        {Math.abs(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "red" }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { border: "1px solid rgba(255,255,255,0.08)", color: "#666", background: "transparent" },
    green: { border: "1px solid rgba(34,197,94,0.2)", color: "#22C55E", background: "rgba(22,163,74,0.08)" },
    red: { border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", background: "rgba(239,68,68,0.08)" },
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
      style={styles[variant]}
    >
      {children}
    </span>
  )
}

function MetricCard({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-[11px] uppercase tracking-wide font-medium mb-3" style={{ color: "#555" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: color || "#EEEDE6" }}>{value}</p>
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <span className="text-[11px] font-medium" style={{ color: "#555" }}>Confiança da análise</span>
          <span className="text-[11px] font-semibold" style={{ color: "#22C55E" }}>{value}%</span>
        </div>
        <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${value}%`, background: value >= 70 ? "#16A34A" : value >= 40 ? "#F59E0B" : "#EF4444" }}
          />
        </div>
      </div>
    </div>
  )
}

const STEPS = [
  {
    n: "1",
    title: "Exporte o extrato",
    desc: "No app do seu banco, exporte o histórico em CSV, OFX ou XLSX.",
  },
  {
    n: "2",
    title: "Arraste ou selecione",
    desc: "A Finance App lê o arquivo e identifica transações, categorias e método de pagamento.",
  },
  {
    n: "3",
    title: "Revise e importe",
    desc: "Confirme a prévia e os dados entram no seu histórico com um clique.",
  },
]

function EmptyState({
  onStart,
  history,
  onDeleteImport,
}: {
  onStart: () => void
  history: ImportBatchRow[]
  onDeleteImport: (id: string) => void
}) {
  const recentImports = history.slice(0, 3)

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 0 48px" }}>
      {/* ── Upload zone ── */}
      <button
        type="button"
        onClick={onStart}
        style={{
          width: "100%",
          borderRadius: 18,
          border: "2px dashed rgba(22,163,74,0.35)",
          background: "rgba(22,163,74,0.04)",
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
          textAlign: "center",
          marginBottom: 28,
          transition: "border-color 0.2s, background 0.2s",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(22,163,74,0.65)"
          ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(22,163,74,0.08)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(22,163,74,0.35)"
          ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(22,163,74,0.04)"
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(22,163,74,0.12)",
            border: "1px solid rgba(22,163,74,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 9.095H6.75z" />
          </svg>
        </div>

        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1, #EEEDE6)", marginBottom: 6, letterSpacing: "-0.2px" }}>
            Arraste o extrato aqui ou clique para selecionar
          </div>
          <div style={{ fontSize: 13, color: "var(--t2, #8A8A7E)", lineHeight: 1.55 }}>
            Suporta arquivos do seu banco exportados no aplicativo ou internet banking
          </div>
        </div>

        {/* Format badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {["CSV", "OFX", "XLSX"].map((f) => (
            <span
              key={f}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: "1px solid rgba(22,163,74,0.4)",
                background: "rgba(22,163,74,0.12)",
                color: "#4ADE80",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 28px",
            borderRadius: 12,
            background: "#16A34A",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Selecionar arquivo
        </div>
      </button>

      {/* ── Como funciona ── */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--bd, rgba(255,255,255,0.06))",
          background: "var(--bg-c, #111111)",
          padding: "20px 24px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t3, #444440)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Como funciona
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {STEPS.map((step) => (
            <div key={step.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(22,163,74,0.12)",
                  border: "1px solid rgba(22,163,74,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#16A34A",
                }}
              >
                {step.n}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1, #EEEDE6)", marginBottom: 2 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--t2, #8A8A7E)", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Histórico recente ── */}
      {recentImports.length > 0 && (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--bd, rgba(255,255,255,0.06))",
            background: "var(--bg-c, #111111)",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t3, #444440)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "16px 20px", borderBottom: "1px solid var(--bd, rgba(255,255,255,0.06))" }}>
            Últimas importações
          </div>
          {recentImports.map((imp, idx) => (
            <div
              key={imp.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 20px",
                borderTop: idx > 0 ? "1px solid var(--bd, rgba(255,255,255,0.04))" : undefined,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--t1, #EEEDE6)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {imp.filename || "Importação"}
                </div>
                <div style={{ fontSize: 11, color: "var(--t3, #444440)", marginTop: 2 }}>
                  {imp.tx_count != null ? `${imp.tx_count} transações` : ""}
                  {imp.created_at ? ` · ${new Date(imp.created_at).toLocaleDateString("pt-BR")}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteImport(imp.id)}
                aria-label="Remover importação"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--t3, #444440)",
                  padding: 6,
                  flexShrink: 0,
                  display: "flex",
                  borderRadius: 8,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer link ── */}
      <p style={{ fontSize: 12, color: "var(--t3, #444440)", textAlign: "center" }}>
        Prefere registrar manualmente?{" "}
        <Link
          to="/app/adicionar"
          style={{ color: "var(--t2, #8A8A7E)", textDecoration: "underline", textUnderlineOffset: 4 }}
        >
          Abrir Registro Rápido
        </Link>
      </p>
    </div>
  )
}

function UploadState({
  onFileSelected,
  onCancel,
  history,
  lastSyncAt,
  onDeleteImport,
}: {
  onFileSelected: (file: File) => void
  onCancel: () => void
  history: ImportBatchRow[]
  lastSyncAt: Date | null
  onDeleteImport: (id: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.currentTarget.value = ""
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-[#F5F5F0] mb-1">Importar extrato</h2>
          <p className="text-[13px] text-[#555]">Exporte o arquivo do seu banco e arraste aqui</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-widest text-[#333]">Último sync</p>
          <p className="text-[12px] text-[#555]">{lastSyncAt ? lastSyncAt.toLocaleString("pt-BR") : "—"}</p>
        </div>
      </div>

      <div
        className={`border rounded-2xl p-10 sm:p-12 text-center cursor-pointer transition-all select-none ${
          isDragging
            ? "border-green-600 bg-green-900/5"
            : "border-[#2A2A2A] border-dashed hover:border-green-700/50 hover:bg-green-900/3"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.ofx,.xlsx,.xls" className="hidden" onChange={handleChange} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
              isDragging ? "bg-green-900/20 border-green-600/40" : "bg-[#111] border-[#2A2A2A]"
            }`}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={isDragging ? "#16A34A" : "#444"} strokeWidth="1.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 9.095H6.75z"
              />
            </svg>
          </div>
          <div>
            <p className={`text-[15px] transition-colors ${isDragging ? "text-green-400" : "text-[#D0D0D0]"}`}>
              {isDragging ? "Solte para importar" : "Arraste o arquivo aqui"}
            </p>
            <p className="text-[13px] text-[#444] mt-1">ou clique para selecionar</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="green">CSV</Badge>
            <Badge variant="green">OFX</Badge>
            <Badge variant="green">XLSX</Badge>
          </div>
          <p className="text-[11px] text-[#333]">Máximo 25MB</p>
        </div>
      </div>

      <div className="bg-[#0D0D0D] border-0 rounded-xl overflow-hidden">
        <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setShowGuide(!showGuide)}>
          <span className="text-[12px] uppercase tracking-widest text-[#333]">Como exportar do seu banco</span>
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#333"
            strokeWidth="2"
            className={`transition-transform ${showGuide ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showGuide && (
          <div className="px-4 pb-3 border-t border-[#1A1A1A]">
            {[
              ["Nubank", "App → Extrato → Exportar → CSV"],
              ["Itaú", "Internet Banking → Extrato → Download OFX"],
              ["Bradesco", "Internet Banking → Conta → Extrato → CSV"],
              ["Inter", "App → Extrato → Compartilhar → CSV"],
              ["Santander", "Internet Banking → Conta Corrente → OFX"],
            ].map(([banco, instrucao]) => (
              <div key={banco} className="flex justify-between items-center py-2 border-b border-[#1A1A1A] last:border-0 gap-4">
                <span className="text-[13px] text-[#888]">{banco}</span>
                <span className="text-[12px] text-[#444] text-right">{instrucao}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Importações anteriores</p>
          <div className="bg-[#111] border-0 rounded-xl overflow-hidden">
            {history.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] last:border-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#888] truncate">{item.filename}</p>
                  <p className="text-[11px] text-[#333]">
                    {item.transactions_count} transações ·{" "}
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleDateString("pt-BR")
                      : new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge
                  variant={item.status === "completed" ? "green" : item.status === "failed" ? "red" : "default"}
                >
                  {item.status === "completed" ? "Concluído" : item.status === "failed" ? "Falhou" : "Processando"}
                </Badge>
                <button
                  type="button"
                  onClick={() => onDeleteImport(item.id)}
                  className="text-[11px] text-[#444] border border-[#2A2A2A] rounded-md px-2 py-1 hover:border-[#444] transition-colors"
                >
                  Apagar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onCancel} className="text-[13px] text-[#444] hover:text-[#666] text-left transition-colors">
        ← Cancelar
      </button>
    </div>
  )
}

function ProcessingState({ filename, activeStep, progress }: { filename: string; activeStep: number; progress: number }) {
  const step = PASSOS_PROCESSAMENTO[Math.min(PASSOS_PROCESSAMENTO.length - 1, Math.max(0, activeStep))]!
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12 min-h-[520px]">
      <div className="flex items-center gap-2.5 px-4 py-2 bg-[#111] border-0 rounded-lg max-w-full">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="1.5" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <span className="text-[13px] text-[#888] truncate">{filename}</span>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[12px] text-green-500 font-medium tracking-wide">ANALISANDO</span>
        </div>
        <p className="text-[22px] font-medium text-[#F5F5F0]">{step.label}...</p>
        <p className="text-[13px] text-[#444] mt-1">{step.sub}</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs px-2">
        {PASSOS_PROCESSAMENTO.map((passo, i) => {
          const done = i < activeStep
          const active = i === activeStep
          return (
            <div key={passo.label} className="flex items-center gap-3">
              {done ? (
                <div className="w-5 h-5 rounded-full bg-green-900/30 border border-green-600/40 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="3" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              ) : active ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#1E1E1E] border-t-green-500 animate-spin flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-[#222] flex-shrink-0" />
              )}
              <span className={`text-[13px] ${done ? "text-green-500" : active ? "text-[#D0D0D0]" : "text-[#333]"}`}>
                {passo.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-xs px-2">
        <div className="flex justify-between mb-2">
          <span className="text-[12px] text-[#333]">Processando arquivo</span>
          <span className="text-[12px] text-green-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-[3px] bg-[#1A1A1A] rounded-full overflow-hidden">
          <div className="h-full bg-green-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

function PreviewState({
  data,
  items,
  excludedCount,
  savedCount = 0,
  pendingFailuresCount = 0,
  logs,
  onExcludeToggle,
  onBulkSelect,
  onUpdateTx,
  onSaveRule,
  onConfirm,
  onCancel,
  saving,
  fmt,
  focusEditIdx,
  onFocusConsumed,
  detectedSubs,
  confirmedSubKeys,
  onToggleSubKey,
  detectedPlans,
  confirmedPlanKeys,
  onTogglePlanKey,
  detectedInvestments,
  confirmedInvestmentKeys,
  onToggleInvestmentKey,
}: {
  data: PreviewData
  items: Array<{ idx: number; tx: ImportedTransactionCandidate; excluded: boolean }>
  excludedCount: number
  savedCount?: number
  pendingFailuresCount?: number
  logs: Array<{ level: "info" | "warn"; msg: string }>
  onExcludeToggle: (idx: number) => void
  onBulkSelect: (mode: "select_all" | "unselect_all") => void
  onUpdateTx: (idx: number, patch: Partial<ImportedTransactionCandidate>) => void
  onSaveRule: (idx: number) => void
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
  fmt: (v: number) => string
  focusEditIdx?: number | null
  onFocusConsumed?: (() => void) | null
  detectedSubs?: DetectedSub[]
  confirmedSubKeys?: Set<string>
  onToggleSubKey?: (key: string) => void
  detectedPlans?: DetectedPlan[]
  confirmedPlanKeys?: Set<string>
  onTogglePlanKey?: (key: string) => void
  detectedInvestments?: DetectedInvestmentV2[]
  confirmedInvestmentKeys?: Set<string>
  onToggleInvestmentKey?: (key: string) => void
}) {
  const [visible, setVisible] = useState(60)
  const [editing, setEditing] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const idxByFingerprint = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const fp = candidateFingerprint({ date: it.tx.date, description: it.tx.description, amount: it.tx.amount, type: it.tx.type })
      map.set(fp, it.idx)
    }
    return map
  }, [items])

  useEffect(() => {
    if (focusEditIdx == null) return
    setEditing(focusEditIdx)
    onFocusConsumed?.()
  }, [focusEditIdx, onFocusConsumed])

  const effectiveTxs = useMemo(() => items.filter((x) => !x.excluded).map((x) => x.tx), [items])
  const effectiveIncome = useMemo(
    () => effectiveTxs.filter((t) => t.type === "receita").reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [effectiveTxs],
  )
  const effectiveExpenses = useMemo(
    () => effectiveTxs.filter((t) => t.type === "despesa").reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [effectiveTxs],
  )
  const effectiveBalance = effectiveIncome - effectiveExpenses

  const filtered = query.trim()
    ? items.filter((x) => {
        const q = query.trim().toLowerCase()
        return (
          x.tx.description.toLowerCase().includes(q) ||
          x.tx.category.name.toLowerCase().includes(q) ||
          (x.tx.paymentMethod || "").toLowerCase().includes(q)
        )
      })
    : items

  const shown = filtered.slice(0, Math.min(visible, filtered.length))
  const totalSelected = items.length - excludedCount
  const canSelectAll = excludedCount > 0
  const canUnselectAll = totalSelected > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-[#444] uppercase mb-2">Revisão da importação</p>
          <h2 className="text-xl font-bold text-[#F5F5F0] mb-1">Confirme o que será importado</h2>
          <p className="text-sm text-[#555] truncate">
            {data.filename} · {effectiveTxs.length} transações · {data.filesizeLabel}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 bg-green-950/20 border border-green-900/25 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-500">Verificado</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canSelectAll}
            onClick={() => onBulkSelect("select_all")}
            className="px-3 py-2 text-[12px] text-[#D0D0D0] bg-[#111] border border-[#1E1E1E] rounded-lg hover:border-[#2A2A2A] transition-colors disabled:opacity-40 disabled:hover:border-[#1E1E1E]"
          >
            Marcar todas
          </button>
          <button
            type="button"
            disabled={!canUnselectAll}
            onClick={() => onBulkSelect("unselect_all")}
            className="px-3 py-2 text-[12px] text-[#666] bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg hover:border-[#2A2A2A] transition-colors disabled:opacity-40 disabled:hover:border-[#1A1A1A]"
          >
            Desmarcar todas
          </button>
          {excludedCount > 0 ? <Badge variant="default">{excludedCount} removidas</Badge> : null}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por descrição/categoria…"
          className="w-full sm:w-[320px] bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
        />
      </div>

      {savedCount > 0 || pendingFailuresCount > 0 ? (
        <div className="bg-[#111] border-0 rounded-xl p-3 text-[12px] text-[#666]">
          <span className="text-[#888]">Status do salvamento:</span>{" "}
          {savedCount > 0 ? <span>{savedCount} já salvas</span> : <span>nenhuma salva ainda</span>}
          {pendingFailuresCount > 0 ? <span>{` · ${pendingFailuresCount} com erro (edite e tente novamente)`}</span> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Receitas" value={fmt(effectiveIncome)} color="#22C55E" />
        <MetricCard label="Despesas" value={fmt(effectiveExpenses)} color="#EF4444" />
        <MetricCard label="Saldo do período" value={fmt(effectiveBalance)} />
        <MetricCard label="Transações selecionadas" value={effectiveTxs.length} />
      </div>

      <div className="bg-[#111] border-0 rounded-2xl p-5 flex items-center gap-5">
        <div className="shrink-0 text-center">
          <p className="text-4xl font-bold text-green-400 leading-none tabular-nums">{data.score}</p>
          <p className="text-xs text-[#444] mt-2">Score estimado</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-[#666]">Score Financeiro</span>
            <span className="text-sm font-semibold text-green-400">
              {data.score >= 850 ? "Excelente" : data.score >= 700 ? "Bom" : data.score >= 400 ? "Regular" : "Crítico"}
            </span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-700"
              style={{ width: `${(data.score / 1000) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-[#333]">0</span>
            <span className="text-xs text-[#333]">1000</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Assinaturas detectadas", value: data.assinaturas },
          { label: "Recorrências", value: data.recorrencias },
          { label: "Salário", value: data.salario > 0 ? fmt(data.salario) : "—" },
        ].map((item) => (
          <div key={item.label} className="bg-[#111] border-0 rounded-2xl p-4 text-center">
            <p className="text-xl font-bold text-[#F5F5F0] tabular-nums mb-1.5">{item.value}</p>
            <p className="text-xs text-[#444]">{item.label}</p>
          </div>
        ))}
      </div>

      {detectedSubs && detectedSubs.length > 0 && (
        <div className="bg-[#0D0D0D] border border-green-900/25 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-xs font-semibold tracking-widest text-green-600 uppercase">Assinaturas detectadas</p>
              </div>
              <p className="text-sm text-[#555] leading-relaxed">Quer cadastrar estas assinaturas? Selecione as que deseja salvar.</p>
            </div>
            <span className="text-xs text-[#444] shrink-0 mt-1">{confirmedSubKeys?.size ?? 0} selecionada(s)</span>
          </div>
          <div className="flex flex-col gap-2">
            {detectedSubs.map((sub) => {
              const checked = confirmedSubKeys?.has(sub.key) ?? false
              return (
                <label key={sub.key} className="flex items-center gap-3 cursor-pointer px-3 py-3 bg-[#111] border border-[#1A1A1A] rounded-xl hover:border-green-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSubKey?.(sub.key)}
                    className="w-4 h-4 accent-green-600 shrink-0"
                  />
                  <span className="flex-1 text-sm font-medium text-[#D0D0D0] truncate">{sub.name}</span>
                  <span className="text-sm font-semibold text-[#888] shrink-0 tabular-nums">
                    {sub.monthlyEstimate.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<span className="text-[#444] font-normal">/mês</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {detectedPlans && detectedPlans.length > 0 && (
        <div className="bg-[#0D0D0D] border border-amber-900/25 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase">Planejamento detectado</p>
              </div>
              <p className="text-sm text-[#555] leading-relaxed">Sugestões de contas fixas e financiamentos. Selecione para criar no Planejamento.</p>
            </div>
            <span className="text-xs text-[#444] shrink-0 mt-1">{confirmedPlanKeys?.size ?? 0} selecionado(s)</span>
          </div>
          <div className="flex flex-col gap-2">
            {detectedPlans.map((p) => {
              const checked = confirmedPlanKeys?.has(p.key) ?? false
              const label = p.kind === "financiamento" ? "Financiamento" : "Conta fixa"
              return (
                <label key={p.key} className="flex items-center gap-3 cursor-pointer px-3 py-3 bg-[#111] border border-[#1A1A1A] rounded-xl hover:border-amber-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePlanKey?.(p.key)}
                    className="w-4 h-4 accent-amber-600 shrink-0"
                  />
                  <span className="flex-1 text-sm font-medium text-[#D0D0D0] truncate">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/30 text-amber-500 border border-amber-900/20 shrink-0">{label}</span>
                  <span className="text-sm font-semibold text-[#888] shrink-0 tabular-nums">{fmt(p.monthlyEstimate)}<span className="text-[#444] font-normal">/mês</span></span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {detectedInvestments && detectedInvestments.length > 0 && (
        <div className="bg-[#0D0D0D] border border-blue-900/25 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase">Investimentos detectados</p>
              </div>
              <p className="text-sm text-[#555] leading-relaxed">
                Selecione apenas <span className="text-[#888] font-semibold">aportes</span> para registrar em Investimentos. Os demais ficam como transações normais.
              </p>
            </div>
            <span className="text-xs text-[#444] shrink-0 mt-1">{confirmedInvestmentKeys?.size ?? 0} selecionado(s)</span>
          </div>
          <div className="flex flex-col gap-2">
            {detectedInvestments.map((inv) => {
              const checked = confirmedInvestmentKeys?.has(inv.key) ?? false
              const canAutoSave = inv.action === "aporte"
              const idx = idxByFingerprint.get(inv.key) ?? null
              const dateLabel = (() => {
                try {
                  return new Date(inv.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")
                } catch {
                  return inv.date
                }
              })()
              return (
                <label
                  key={inv.key}
                  className={`flex items-center gap-3 cursor-pointer px-3 py-3 bg-[#111] border border-[#1A1A1A] rounded-xl transition-colors ${canAutoSave ? "hover:border-blue-900/30" : "opacity-60 cursor-not-allowed"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canAutoSave}
                    onChange={() => (canAutoSave ? onToggleInvestmentKey?.(inv.key) : null)}
                    className="w-4 h-4 accent-blue-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#D0D0D0] truncate">{inv.name || "Investimento não classificado"}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-xs text-[#444]">{dateLabel}</span>
                      <span className="text-[#333]">·</span>
                      <span className="text-xs text-[#444]">{investmentActionLabel(inv.action)}</span>
                      {inv.probableType ? (
                        <>
                          <span className="text-[#333]">·</span>
                          <span className="text-xs text-[#444]">{inv.probableType}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-[#888] tabular-nums">{fmt(inv.amount)}</span>
                    {idx != null ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditing(idx)
                        }}
                        className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {data.paymentMethods.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Métodos detectados</p>
          <div className="flex flex-wrap gap-1.5">
            {data.paymentMethods.map((m) => (
              <div key={m.method} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#111] border-0 rounded-lg">
                <span className="text-[12px] text-[#888]">{methodLabel(m.method)}</span>
                <span className="text-[12px] text-[#444]">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.statementBalance != null && (
        <div className="bg-[#0D0D0D] border-0 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-1">Saldo do extrato</p>
          <p className="text-[13px] text-[#666]">{fmt(data.statementBalance)}</p>
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Categorias detectadas</p>
        <div className="flex flex-wrap gap-1.5">
          {data.categorias.map((cat) => (
            <div
              key={cat.nome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#111] border-0 rounded-lg"
            >
              <span className="text-sm">{cat.emoji}</span>
              <span className="text-[12px] text-[#888]">{cat.nome}</span>
              <span className="text-[12px] text-[#444]">{fmt(cat.valor)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Prévia das transações</p>
        <div className="bg-[#111] border-0 rounded-xl px-4">
          {data.transacoes_preview.map((tx, i) => (
            <TxRow key={i} {...tx} />
          ))}
          {data.transacoes > data.transacoes_preview.length ? (
            <p className="text-[12px] text-[#333] py-3">+ {data.transacoes - data.transacoes_preview.length} transações</p>
          ) : null}
        </div>
      </div>

      <ConfidenceBar value={data.confiancaIA} />

      <div className="bg-[#0D0D0D] border-0 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-[#333] mb-1">Detecção</p>
            <p className="text-[12px] text-[#666] truncate">
              {data.detected.bank ? `${data.detected.bank} · ` : ""}
              {data.detected.delimiter ? `Delimitador ${data.detected.delimiter === "\t" ? "TAB" : data.detected.delimiter} · ` : ""}
              Encoding {data.detected.encoding}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {data.invalidRows > 0 ? <Badge variant="red">{data.invalidRows} linhas ignoradas</Badge> : <Badge variant="green">Arquivo OK</Badge>}
            {excludedCount > 0 ? <Badge variant="default">{excludedCount} removidas</Badge> : null}
          </div>
        </div>
        {logs.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1">
            {logs.slice(0, 4).map((l, i) => (
              <div key={i} className={`text-[12px] ${l.level === "warn" ? "text-[#888]" : "text-[#555]"}`}>
                {l.msg}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] uppercase tracking-widest text-[#333]">Transações (editável)</p>
        </div>
        <div className="bg-[#111] border-0 rounded-xl overflow-hidden">
          {shown.map(({ idx, tx, excluded }) => {
            const isEditing = editing === idx
            const conf = Math.round((tx.category.confidence || 0) * 100)
            return (
              <div
                key={idx}
                className={`px-4 py-3 border-b border-[#1A1A1A] last:border-0 ${excluded ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(isEditing ? null : idx)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[12px] text-[#666]">{formatShortDate(tx.date, "pt")}</span>
                      <span className="text-[13px] text-[#D0D0D0] truncate">{tx.description}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="default">{tx.type === "receita" ? "Receita" : "Despesa"}</Badge>
                      <Badge variant="default">{tx.category.name}</Badge>
                      {tx.paymentMethod ? <Badge variant="default">{methodLabel(tx.paymentMethod)}</Badge> : null}
                      <Badge variant={conf >= 85 ? "green" : conf >= 65 ? "default" : "red"}>{conf}%</Badge>
                      {tx.isRecurring ? <Badge variant="green">Recorrente</Badge> : null}
                      {tx.isSubscription ? <Badge variant="green">Assinatura</Badge> : null}
                      {tx.isSalary ? <Badge variant="green">Salário</Badge> : null}
                      {(tx as any).isDuplicate ? <Badge variant="red">Duplicata</Badge> : null}
                      {tx.isInvestment ? <Badge variant="green">Investimento</Badge> : null}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[13px] font-medium ${tx.type === "receita" ? "text-green-400" : "text-red-400"}`}>
                      {tx.type === "receita" ? "+" : "−"}
                      {fmt(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onExcludeToggle(idx)}
                      className="text-[11px] text-[#444] border border-[#2A2A2A] rounded-md px-2 py-1 hover:border-[#444] transition-colors"
                    >
                      {excluded ? "Restaurar" : "Remover"}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-6 gap-2">
                    <input
                      value={tx.date}
                      onChange={(e) => onUpdateTx(idx, { date: e.target.value })}
                      className="sm:col-span-1 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
                      placeholder="YYYY-MM-DD"
                    />
                    <input
                      value={tx.description}
                      onChange={(e) => onUpdateTx(idx, { description: e.target.value })}
                      className="sm:col-span-3 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
                      placeholder="Descrição"
                    />
                    <input
                      value={String(tx.amount)}
                      onChange={(e) => onUpdateTx(idx, { amount: Math.max(0, Number(e.target.value) || 0) })}
                      className="sm:col-span-1 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
                      placeholder="Valor"
                      inputMode="decimal"
                    />
                    <select
                      value={tx.type}
                      onChange={(e) => onUpdateTx(idx, { type: e.target.value as any })}
                      className="sm:col-span-1 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
                    >
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>

                    <input
                      value={tx.category.name}
                      onChange={(e) => onUpdateTx(idx, { category: { ...tx.category, name: e.target.value, confidence: Math.min(0.99, tx.category.confidence || 0.6), reason: "manual" } })}
                      className="sm:col-span-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
                      placeholder="Categoria"
                    />
                    <select
                      value={tx.paymentMethod ?? ""}
                      onChange={(e) => onUpdateTx(idx, { paymentMethod: (e.target.value || null) as any })}
                      className="sm:col-span-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[12px] text-[#D0D0D0] outline-none focus:border-green-700/60"
                    >
                      <option value="">Método…</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="pix">Pix</option>
                      <option value="pix_qr_code">Pix QR</option>
                      <option value="boleto">Boleto</option>
                      <option value="transferencia">Transferência</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="debito_automatico">Débito automático</option>
                      <option value="outro">Outro</option>
                    </select>
                    <label className="sm:col-span-1 flex items-center gap-2 px-3 py-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg text-[12px] text-[#666]">
                      <input
                        type="checkbox"
                        checked={!!tx.isRecurring}
                        onChange={(e) => onUpdateTx(idx, { isRecurring: e.target.checked })}
                      />
                      Recorr.
                    </label>
                    <label className="sm:col-span-1 flex items-center gap-2 px-3 py-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg text-[12px] text-[#666]">
                      <input
                        type="checkbox"
                        checked={!!tx.isSubscription}
                        onChange={(e) => onUpdateTx(idx, { isSubscription: e.target.checked })}
                      />
                      Assin.
                    </label>
                    <label className="sm:col-span-1 flex items-center gap-2 px-3 py-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg text-[12px] text-[#666]">
                      <input type="checkbox" checked={!!tx.isSalary} onChange={(e) => onUpdateTx(idx, { isSalary: e.target.checked })} />
                      Salário
                    </label>
                    <button
                      type="button"
                      onClick={() => onSaveRule(idx)}
                      className="sm:col-span-2 px-4 py-2 text-[12px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
                    >
                      Salvar preferência
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}

          {filtered.length === 0 ? <div className="px-4 py-6 text-[13px] text-[#444]">Nenhuma transação encontrada.</div> : null}
        </div>
        {filtered.length > shown.length ? (
          <button
            type="button"
            onClick={() => setVisible((v) => v + 80)}
            className="mt-2 text-[12px] text-[#555] hover:text-[#888] transition-colors"
          >
            Carregar mais ({shown.length}/{filtered.length})
          </button>
        ) : null}
      </div>

      <div className="flex gap-2.5 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] hover:text-[#888] transition-colors disabled:opacity-60 disabled:hover:border-[#2A2A2A]"
        >
          Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex-[2] py-2.5 text-[14px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-60 disabled:hover:bg-green-700"
        >
          {saving ? "Salvando..." : "Confirmar importação"}
        </button>
      </div>
    </div>
  )
}

function SuccessState({
  data,
  onDashboard,
  onNewImport,
  history,
  onDeleteImport,
}: {
  data: PreviewData
  onDashboard: () => void
  onNewImport: () => void
  history: ImportBatchRow[]
  onDeleteImport: (id: string) => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center min-h-[520px]">
      <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-600/30 flex items-center justify-center">
        <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12.75l6 6 9-13.5" strokeDasharray="100" strokeDashoffset="100" style={{ animation: "check 0.5s ease-out 0.1s forwards" }} />
        </svg>
        <style>{`@keyframes check { to { stroke-dashoffset: 0; } }`}</style>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[#F5F5F0] mb-2">Importação concluída</h2>
        <p className="text-[14px] text-[#555] max-w-xs leading-relaxed">{data.transacoes} transações organizadas automaticamente. Dashboard atualizado.</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {[`${data.transacoes} transações`, `${data.categorias.length} categorias`, `${data.recorrencias} recorrências`, `${data.assinaturas} assinaturas`].map((chip) => (
          <span key={chip} className="px-3 py-1.5 bg-[#111] border-0 rounded-full text-[12px] text-[#666]">
            {chip}
          </span>
        ))}
      </div>

      <div className="bg-[#111] border-0 rounded-xl px-8 py-4">
        <p className="text-[11px] text-[#333] mb-2">Score atualizado</p>
        <div className="flex items-center gap-3 justify-center">
          <span className="text-base text-[#444]">{data.scorePrevio}</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className="text-3xl font-semibold text-green-500">{data.score}</span>
          <span className="text-[13px] text-green-500">+{Math.max(0, data.score - data.scorePrevio)}</span>
        </div>
      </div>

      {history.length > 0 && (
        <div className="w-full max-w-xs text-left">
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Histórico</p>
          <div className="bg-[#111] border-0 rounded-xl overflow-hidden">
            {history.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] last:border-0">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="1.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#888] truncate">{item.filename}</p>
                  <p className="text-[11px] text-[#333]">
                    {item.transactions_count} transações · {item.completed_at ? new Date(item.completed_at).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteImport(item.id)}
                  className="text-[11px] text-[#333] border border-[#222] rounded px-2 py-0.5 hover:border-[#444] transition-colors"
                >
                  Apagar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={onNewImport}
          className="px-4 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
        >
          Nova importação
        </button>
        <button
          onClick={onDashboard}
          className="px-6 py-2.5 text-[14px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
        >
          Ver dashboard →
        </button>
      </div>
    </div>
  )
}

function ErrorState({
  onRetry,
  onCancel,
  onShowPreview,
  errorType = "format",
  filename,
  detected,
  debugMessage,
}: {
  onRetry: () => void
  onCancel: () => void
  onShowPreview?: (() => void) | null
  errorType?: "format" | "insufficient" | "corrupt" | "save"
  filename?: string | null
  detected?: { bank: string | null; encoding: string | null; delimiter: string | null; parsedRows: number; txs: number; invalidRows: number } | null
  debugMessage?: string | null
}) {
  const [showDetails, setShowDetails] = useState(false)
  const errors = {
    format: {
      title: "Não conseguimos ler este arquivo",
      desc: "O formato parece diferente do esperado.",
      detail: "Use CSV, OFX ou XLSX exportado pelo seu banco. PDFs não são suportados.",
      badge: "Formato inválido",
    },
    insufficient: {
      title: "Dados insuficientes",
      desc: "Não conseguimos identificar as colunas com segurança.",
      detail: "Tente exportar um período menor (ex.: últimos 90 dias) ou use outro formato do banco (OFX/CSV).",
      badge: "Dados insuficientes",
    },
    corrupt: {
      title: "Arquivo corrompido",
      desc: "Não foi possível abrir o arquivo.",
      detail: "Tente exportar novamente do banco e confira se o download foi completo.",
      badge: "Arquivo inválido",
    },
    save: {
      title: "Não foi possível salvar a importação",
      desc: "Conseguimos ler o arquivo, mas houve um problema ao salvar no banco.",
      detail:
        "Tente novamente. Se persistir, confira se as migrations do Supabase foram aplicadas (principalmente RLS/policies e colunas de transações).",
      badge: "Falha ao salvar",
    },
  } as const

  const err = errors[errorType] ?? errors.format

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center min-h-[520px]">
      <div className="w-16 h-16 rounded-full bg-red-900/10 border border-red-600/20 flex items-center justify-center">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth="1.5" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[#F5F5F0] mb-2">{err.title}</h2>
        <p className="text-[14px] text-[#555] max-w-xs leading-relaxed">{err.desc}</p>
      </div>

      <div className="bg-[#0D0D0D] border border-red-900/20 rounded-xl p-4 w-full max-w-sm text-left">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth="1.5" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="text-[13px] text-[#666] truncate">{filename || "arquivo"}</span>
          <Badge variant="red">{err.badge}</Badge>
        </div>
        <p className="text-[12px] text-[#444]">{err.detail}</p>

        {errorType === "save" && debugMessage ? (
          <div className="mt-3 pt-3 border-t border-[#1A1A1A]">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-[12px] text-[#666] hover:text-[#888] underline underline-offset-4"
            >
              {showDetails ? "Ocultar detalhes" : "Ver detalhes técnicos"}
            </button>
            {showDetails ? (
              <div className="mt-2 bg-[#0B0B0B] border-0 rounded-lg p-3 text-[12px] text-[#888] whitespace-pre-wrap break-words">
                {debugMessage}
              </div>
            ) : null}
            <div className="mt-2 text-[12px] text-[#444]">
              Dica: se aparecer "row-level security", rode a migration `20260517_transacoes_rls_own_policy.sql`. Se aparecer "coluna não existe",
              aplique a migration `20260514_import_batches_and_transacoes_import_id.sql` e/ou atualize o schema.
            </div>
          </div>
        ) : null}

        {detected ? (
          <div className="mt-3 pt-3 border-t border-[#1A1A1A]">
            <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">O que detectamos</p>
            <div className="flex flex-col gap-1 text-[12px] text-[#555]">
              <div>{detected.bank ? `Banco provável: ${detected.bank}` : "Banco provável: não identificado"}</div>
              <div>
                {detected.delimiter ? `Delimitador: ${detected.delimiter === "\t" ? "TAB" : detected.delimiter}` : "Delimitador: —"}
              </div>
              <div>{detected.encoding ? `Encoding: ${detected.encoding}` : "Encoding: —"}</div>
              <div>{`Linhas lidas: ${detected.parsedRows} · Transações válidas: ${detected.txs}`}</div>
              {detected.invalidRows > 0 ? <div>{`Linhas ignoradas: ${detected.invalidRows}`}</div> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="w-full max-w-sm text-left">
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Sugestões</p>
        <div className="flex flex-col gap-2">
          {[
            "Exporte como CSV no app do banco",
            "Baixe o arquivo OFX no internet banking",
            "Se preferir, registre manualmente no Registro Rápido",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3 p-3 bg-[#111] border-0 rounded-lg">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              {text.includes("Registro Rápido") ? (
                <Link to="/app/adicionar" className="text-[13px] text-[#666] hover:text-[#888] transition-colors">
                  {text}
                </Link>
              ) : (
                <span className="text-[13px] text-[#666]">{text}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
        >
          Cancelar
        </button>
        {onShowPreview ? (
          <button
            onClick={onShowPreview}
            className="px-4 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
          >
            Ver revisão
          </button>
        ) : null}
        <button
          onClick={onRetry}
          className="px-6 py-2.5 text-[14px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          Tentar outro arquivo
        </button>
      </div>

      <p className="text-[12px] text-[#333]">
        Prefere lançar manualmente?{" "}
        <Link to="/app/adicionar" className="text-[#666] hover:text-[#888] underline underline-offset-4">
          Abrir Registro Rápido
        </Link>
      </p>
    </div>
  )
}

function PartialSaveState({
  filename,
  summary,
  failures,
  items,
  onViewPreview,
  onRetrySave,
  onEditItem,
  onNewFile,
}: {
  filename?: string | null
  summary: { attempted: number; saved: number; failed: number }
  failures: SaveFailure[]
  items: Array<{ idx: number; tx: ImportedTransactionCandidate; excluded: boolean }>
  onViewPreview: () => void
  onRetrySave: () => void
  onEditItem: (idx: number) => void
  onNewFile: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const { lang } = useLanguage()
  const byIdx = useMemo(() => new Map(items.map((i) => [i.idx, i.tx] as const)), [items])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center min-h-[520px]">
      <div className="w-16 h-16 rounded-full bg-red-900/10 border border-red-600/20 flex items-center justify-center">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth="1.5" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[#F5F5F0] mb-2">Alguns registros não puderam ser salvos</h2>
        <p className="text-[14px] text-[#555] max-w-sm leading-relaxed">
          Conseguimos ler o arquivo, mas alguns registros foram rejeitados pelo banco ou estavam inválidos.
        </p>
      </div>

      <div className="bg-[#0D0D0D] border border-red-900/20 rounded-xl p-4 w-full max-w-sm text-left">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth="1.5" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="text-[13px] text-[#666] truncate">{filename || "arquivo"}</span>
          <Badge variant="red">Falha parcial</Badge>
        </div>
        <div className="text-[12px] text-[#555] flex flex-col gap-1">
          <div>{`Tentadas: ${summary.attempted}`}</div>
          <div className="text-green-500">{`Salvas: ${summary.saved}`}</div>
          <div className="text-red-400">{`Com erro: ${summary.failed}`}</div>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="px-4 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
        >
          {showDetails ? "Ocultar detalhes" : "Ver detalhes"}
        </button>
        <button
          onClick={onViewPreview}
          className="px-4 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
        >
          Editar registros
        </button>
        <button
          onClick={onRetrySave}
          className="px-6 py-2.5 text-[14px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
        <button
          onClick={onNewFile}
          className="px-4 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
        >
          Outro arquivo
        </button>
      </div>

      {showDetails ? (
        <div className="w-full max-w-2xl text-left">
          <div className="bg-[#111] border-0 rounded-xl overflow-hidden">
            {failures.slice(0, 200).map((f) => {
              const tx = byIdx.get(f.idx)
              return (
                <div key={`${f.idx}-${f.stage}`} className="px-4 py-3 border-b border-[#1A1A1A] last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-[#888] truncate">
                        {tx ? `${tx.date} · ${tx.type.toUpperCase()} · ${formatShortDate(tx.date, lang)}` : `#${f.idx}`}
                      </div>
                      <div className="text-[13px] text-[#D0D0D0] truncate">{tx?.description || "—"}</div>
                      <div className="text-[12px] text-red-400 mt-1">
                        <span className="text-[#666] mr-2">{f.stage === "validation" ? "Validação" : "Supabase"}</span>
                        {f.reason}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditItem(f.idx)}
                      className="text-[12px] text-[#333] border border-[#222] rounded px-3 py-1 hover:border-[#444] transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {failures.length > 200 ? <div className="text-[12px] text-[#333] mt-2">{`Mostrando 200 de ${failures.length} erros.`}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function buildPreviewData(params: {
  file: File
  parsedRows: number
  normalized: ImportedTransactionCandidate[]
  scorePrevio: number
  scoreEstimado: number
  statementBalance: number | null
  invalidRows: number
  detected: { encoding: string; delimiter: string | null; bank: string | null }
}): PreviewData {
  const { file, parsedRows, normalized, scorePrevio, scoreEstimado, statementBalance, invalidRows, detected } = params

  const receitas = normalized.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0)
  const despesas = normalized.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0)
  const saldo = receitas - despesas

  const recurring = detectRecurringTransactions(normalized)
  const subs = detectSubscriptions(normalized, recurring)
  const salary = detectSalary(normalized)

  const catSums = new Map<string, number>()
  for (const t of normalized) {
    if (t.type !== "despesa") continue
    const name = t.category.name || "Outros"
    catSums.set(name, (catSums.get(name) || 0) + t.amount)
  }
  const categorias = [...catSums.entries()]
    .map(([nome, valor]) => ({ nome, valor, emoji: emojiForCategory(nome) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)

  const byMethod = new Map<MetodoPagamento, number>()
  for (const t of normalized) {
    if (!t.paymentMethod) continue
    byMethod.set(t.paymentMethod, (byMethod.get(t.paymentMethod) || 0) + 1)
  }
  const paymentMethods = [...byMethod.entries()]
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const previewTxs = normalized.slice(0, 5).map((t) => {
    const positivo = t.type === "receita"
    return {
      emoji: emojiForCategory(positivo ? "Receita" : t.category.name),
      nome: t.description,
      categoria: t.category.name,
      valor: positivo ? t.amount : -t.amount,
      positivo,
      data: formatShortDate(t.date, "pt"),
    }
  })

  const confidence = computeConfidence(parsedRows, normalized)

  // não marca "dados insuficientes" aqui; isso é decidido fora
  const transacoes = normalized.length

  return {
    filename: file.name,
    filesizeLabel: filesizeLabel(file.size),
    transacoes,
    receitas,
    despesas,
    saldo,
    score: scoreEstimado,
    scorePrevio,
    confiancaIA: confidence,
    assinaturas: subs.length,
    recorrencias: recurring.length,
    salario: salary?.amount ?? 0,
    categorias,
    transacoes_preview: previewTxs,
    paymentMethods,
    statementBalance,
    invalidRows,
    detected,
  }
}

function normalizeKey(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function dueDayFromISO(dateISO: string) {
  const m = String(dateISO || "").match(/^\d{4}-\d{2}-(\d{2})$/)
  const d = m ? Number(m[1]) : NaN
  if (!Number.isFinite(d)) return 5
  return Math.min(31, Math.max(1, d))
}

function detectPlanningSuggestions(
  txs: ImportedTransactionCandidate[],
  recurring: Array<{ key: string; description: string; cadence: string; amountMedian: number }>,
  subs: DetectedSub[],
): DetectedPlan[] {
  const subsKeys = new Set((subs || []).map((s) => s.key))
  const out = new Map<string, DetectedPlan>()

  const fixedRe =
    /\baluguel\b|\bcondomin(?:io|io)\b|\bluz\b|\benergia\b|\bagua\b|\b[aá]gua\b|\bgas\b|\binternet\b|\btelefone\b|\bcelular\b|\bclaro\b|\bvivo\b|\btim\b|\boi\b|\bsabesp\b|\bcopasa\b|\bcemig\b|\benel\b|\blight\b|\bunimed\b|\bplano\s+de\s+saude\b|\bseguro\b|\bacademia\b|\bmensalidade\b|\bescola\b|\bcurso\b|\bfaculdade\b|\bcreche\b/
  const financeRe =
    /\bfinanciament(?:o|os)\b|\bprestac(?:ao|ão)\b|\bparcela\b|\bconsorcio\b|\bcons[oó]rcio\b|\bemprestimo\b|\bempr[eé]stimo\b|\bcdc\b|\bcredito\s+consignado\b/
  // Filtro anti-falso-positivo: compras comuns não devem virar planejamento automaticamente
  const notPlanRe =
    /\bifood\b|\brappi\b|\buber\b|\b99\b|\brestaurante\b|\blanche\b|\bdelivery\b|\bmercado\b|\bsupermerc\b|\bpadaria\b|\bposto\b|\bgasolina\b|\bcombust[íi]vel\b|\bfarm[aá]cia\b|\bshopping\b|\bamazon\b|\bmercadolivre\b|\bmagalu\b|\bloj(a|as)\b|\bpassagem\b|\bmetr[oô]\b|\bônibus\b|\bonibus\b/

  for (const r of recurring || []) {
    if (r.cadence !== "mensal") continue
    if (subsKeys.has(r.key)) continue
    const nk = normalizeKey(r.description)
    if (notPlanRe.test(nk)) continue
    const kind: DetectedPlan["kind"] | null = financeRe.test(nk) ? "financiamento" : fixedRe.test(nk) ? "despesa_fixa" : null
    if (!kind) continue

    const sample = txs.find((t) => importedTxRecurringKey(t) === r.key) ?? txs[0]
    const dueDay = sample ? dueDayFromISO(sample.date) : 5

    out.set(r.key, {
      key: r.key,
      name: r.description,
      monthlyEstimate: Number(r.amountMedian) || 0,
      kind,
      dueDay,
    })
  }

  return [...out.values()]
    .filter((x) => x.monthlyEstimate > 0)
    .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
    .slice(0, 12)
}

function classifyInvestmentAction(t: ImportedTransactionCandidate): "aporte" | "rendimento" | "resgate" | "movimentacao_interna" | "nao_classificado" {
  const nk = normalizeKey(t.description)
  const reason = String(t.category?.reason || "")

  if (reason === "investimento_aporte") return "aporte"
  if (reason === "investimento_rendimento") return "rendimento"

  if (/\bresgate\b|\bvencimento\b/.test(nk)) return "resgate"
  if (/\brendimento\b|\bjuros\b|\bdividend/.test(nk)) return "rendimento"
  if (/\btransfer[eê]ncia\b|\btransferencia\b|\bmovimentac[aã]o\b|\bportabilidade\b/.test(nk)) return "movimentacao_interna"
  if (/\baplicac[aã]o\b|\baplicação\b|\baporte\b/.test(nk)) return t.type === "despesa" ? "aporte" : "resgate"

  return "nao_classificado"
}

function guessInvestmentType(desc: string): string | null {
  const s = normalizeKey(desc)
  if (/\btesouro\b|\btesouro\s+direto\b/.test(s)) return "Tesouro Direto"
  if (/\bcdb\b/.test(s)) return "CDB"
  if (/\blci\b/.test(s)) return "LCI"
  if (/\blca\b/.test(s)) return "LCA"
  if (/\bfii\b|\bfundo\b/.test(s)) return "Fundos"
  if (/\bpoupanc/.test(s)) return "Poupança"
  if (/\bcaixinha\b/.test(s)) return "Caixinha"
  if (/\bcrypt\b|\bbitcoin\b|\beth\b/.test(s)) return "Cripto"
  return null
}

type DetectedInvestmentAction = ReturnType<typeof classifyInvestmentAction>

type DetectedInvestmentV2 = DetectedInvestment & {
  action: DetectedInvestmentAction
  probableType: string | null
}

function investmentActionLabel(action: DetectedInvestmentAction) {
  switch (action) {
    case "aporte":
      return "Aporte"
    case "rendimento":
      return "Rendimento"
    case "resgate":
      return "Resgate"
    case "movimentacao_interna":
      return "Movimentação interna"
    default:
      return "Investimento não classificado"
  }
}

function detectInvestmentSuggestions(txs: ImportedTransactionCandidate[]): DetectedInvestmentV2[] {
  const out: DetectedInvestmentV2[] = []
  for (const t of txs || []) {
    if (!t.isInvestment) continue
    const key = candidateFingerprint({ date: t.date, description: t.description, amount: t.amount, type: t.type })
    out.push({
      key,
      name: t.description,
      amount: t.amount,
      date: t.date,
      type: t.type,
      action: classifyInvestmentAction(t),
      probableType: guessInvestmentType(t.description),
    })
  }
  return out.slice(0, 20)
}

function guessInvestmentName(desc: string) {
  const s = normalizeKey(desc)
  if (/\btesouro\b/.test(s)) return "Tesouro Direto"
  if (/\bcdb\b/.test(s)) return "CDB"
  if (/\bcaixinha\b/.test(s)) return "Caixinha"
  if (/\bpoupanc/.test(s)) return "Poupança"
  if (/\bfii\b|\bfundo\b/.test(s)) return "Fundos"
  if (/\bcrypt/.test(s) || /\bbitcoin\b|\beth\b/.test(s)) return "Cripto"
  const parts = s.split(" ").filter(Boolean).slice(0, 3)
  const label = parts.join(" ").trim()
  return label ? label.replace(/\b\w/g, (m) => m.toUpperCase()) : "Investimento"
}

export default function ImportacaoPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const { requestSync } = useOutletContext<AppOutletContext>()

  const [state, setState] = useState<ImportUIState>("empty")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [parsedResult, setParsedResult] = useState<ImportParseResult | null>(null)
  const [candidates, setCandidates] = useState<ImportedTransactionCandidate[]>([])
  const [duplicateFingerprints, setDuplicateFingerprints] = useState<Set<string>>(new Set())
  const [detectedSubs, setDetectedSubs] = useState<DetectedSub[]>([])
  const [confirmedSubKeys, setConfirmedSubKeys] = useState<Set<string>>(new Set())
  const [detectedPlans, setDetectedPlans] = useState<DetectedPlan[]>([])
  const [confirmedPlanKeys, setConfirmedPlanKeys] = useState<Set<string>>(new Set())
  const [detectedInvestments, setDetectedInvestments] = useState<DetectedInvestmentV2[]>([])
  const [confirmedInvestmentKeys, setConfirmedInvestmentKeys] = useState<Set<string>>(new Set())
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [overrides, setOverrides] = useState<Map<number, Partial<ImportedTransactionCandidate>>>(new Map())
  const [parserLogs, setParserLogs] = useState<Array<{ level: "info" | "warn"; msg: string }>>([])
  const [errorType, setErrorType] = useState<"format" | "insufficient" | "corrupt" | "save">("format")
  const [errorFilename, setErrorFilename] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(10)
  const [saving, setSaving] = useState(false)
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set())
  const [saveFailures, setSaveFailures] = useState<SaveFailure[]>([])
  const [saveSummary, setSaveSummary] = useState<{ attempted: number; saved: number; failed: number } | null>(null)
  const [focusEditIdx, setFocusEditIdx] = useState<number | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [lastSaveError, setLastSaveError] = useState<{ raw: string; pretty?: string } | null>(null)

  const [history, setHistory] = useState<ImportBatchRow[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)

  const [cycleRange, setCycleRange] = useState<{ inicio: string; fim: string } | null>(null)
  const [cycleTotals, setCycleTotals] = useState<{ income: number; expenses: number } | null>(null)

  const [scorePrevio, setScorePrevio] = useState(0)
  const scorePrevioRef = useRef(0)

  useEffect(() => {
    scorePrevioRef.current = scorePrevio
  }, [scorePrevio])

  const fmtCurrency = useCallback((v: number) => formatCurrency(v, lang), [lang])

  const getEffectiveTx = useCallback(
    (idx: number): ImportedTransactionCandidate | null => {
      const base = candidates[idx]
      if (!base) return null
      const ov = overrides.get(idx)
      if (!ov) return base
      return {
        ...base,
        ...ov,
        category: ov.category ?? base.category,
      }
    },
    [candidates, overrides],
  )

  const itemsForPreview = useMemo(() => {
    return candidates.map((t, idx) => {
      const effective = getEffectiveTx(idx) ?? t
      const fp = candidateFingerprint({
        date: effective.date,
        description: effective.description,
        amount: effective.amount,
        type: effective.type,
      })
      const isDuplicate = duplicateFingerprints.has(fp)
      return {
        idx,
        tx: { ...effective, isDuplicate } as any,
        excluded: excluded.has(idx),
      }
    })
  }, [candidates, excluded, duplicateFingerprints, getEffectiveTx])

  const excludedCount = useMemo(() => {
    return excluded.size
  }, [excluded])

  const bulkSelect = useCallback(
    (mode: "select_all" | "unselect_all") => {
      setExcluded(() => {
        if (mode === "unselect_all") {
          return new Set(candidates.map((_, i) => i))
        }
        // "Marcar todas": seleciona tudo, mas mantém duplicatas fora por segurança
        const next = new Set<number>()
        for (let i = 0; i < candidates.length; i++) {
          const tx = getEffectiveTx(i)
          if (!tx) continue
          const fp = candidateFingerprint({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type })
          if (duplicateFingerprints.has(fp)) next.add(i)
        }
        return next
      })
    },
    [candidates, duplicateFingerprints, getEffectiveTx],
  )

  const toggleExclude = useCallback((idx: number) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const updateTx = useCallback((idx: number, patch: Partial<ImportedTransactionCandidate>) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      const cur = next.get(idx) ?? {}
      const merged: any = { ...cur, ...patch }
      if (patch.category) merged.category = patch.category
      next.set(idx, merged)
      return next
    })
  }, [])

  const ruleKeyFromDescription = useCallback((desc: string) => {
    const cleaned = desc
      .toLowerCase()
      .replace(/[|/\\]+/g, " ")
      .replace(/[\u0000-\u001F]/g, " ")
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
    const parts = cleaned.split(" ").filter(Boolean)
    const stop = new Set(["pagamento", "compra", "pix", "transferencia", "transferência", "debito", "débito", "credito", "crédito"])
    const best = parts.find((p) => p.length >= 3 && !stop.has(p)) ?? parts[0] ?? cleaned
    return best || cleaned || "regra"
  }, [])

  const saveRuleForTx = useCallback(
    async (idx: number) => {
      if (!user) return
      const tx = getEffectiveTx(idx)
      if (!tx) return
      const key = ruleKeyFromDescription(tx.description)
      try {
        await upsertUserCategorizationRule({
          userId: user.id,
          key,
          tipo: tx.type,
          categoriaNome: tx.category.name,
          confidence: Math.min(0.99, Math.max(0.7, tx.category.confidence || 0.85)),
          source: "user_correction",
        })
        toast.success("Preferência salva")
      } catch {
        toast.error("Não foi possível salvar a preferência")
      }
    },
    [getEffectiveTx, ruleKeyFromDescription, user],
  )

  const resetImportState = useCallback(() => {
    setSelectedFile(null)
    setPreview(null)
    setParsedResult(null)
    setCandidates([])
    setDuplicateFingerprints(new Set())
    setDetectedSubs([])
    setConfirmedSubKeys(new Set())
    setDetectedPlans([])
    setConfirmedPlanKeys(new Set())
    setDetectedInvestments([])
    setConfirmedInvestmentKeys(new Set())
    setExcluded(new Set())
    setOverrides(new Map())
    setParserLogs([])
    setSavedIdxs(new Set())
    setSaveFailures([])
    setSaveSummary(null)
    setFocusEditIdx(null)
    setActiveBatchId(null)
    setLastSaveError(null)
  }, [])

  const reloadHistory = useCallback(async () => {
    if (!user) return
    const rows = await getImportBatches(user.id)
    setHistory(rows)
    const last = rows.find((r) => r.completed_at) ?? rows[0]
    setLastSyncAt(last?.completed_at ? new Date(last.completed_at) : null)
  }, [user])

  useEffect(() => {
    if (!user) return
    reloadHistory().catch(() => {})
  }, [user?.id, reloadHistory])

  useEffect(() => {
    if (!user) return
    getUserFinancialSettings(user.id)
      .then((s) => {
        const { inicio, fim } = getCurrentCycleRange({ cycle_start_day: s.cycle_start_day })
        setCycleRange({ inicio, fim })
      })
      .catch(() => setCycleRange(null))
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const userId = user.id
    Promise.all([getTotaisMes(userId), getInvestimentos(userId), getAssinaturas(userId), getCompromissos(userId)])
      .then(([t, invs, subs, comps]) => {
        setCycleTotals({ income: t.totalRenda, expenses: t.totalGastos })
        const subsMensal = calcularTotalMensal(subs || [])
        const compMensal = (comps || []).reduce((s, c) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0)
        const totalAportes = (invs || []).reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0)
        const patrimonio = calcularPatrimonioEstimado(invs || [])
        const recorrentes = (invs || []).filter((i) => i.aporte_recorrente).length
        const diversificacao = new Set((invs || []).map((i) => i.categoria_investimento)).size
        const base = calculateFinancialScore({
          totalRendaPeriodo: t.totalRenda,
          totalGastosPeriodo: t.totalGastos,
          assinaturasMensal: subsMensal,
          compromissosMensal: compMensal,
          investimentos: { totalAportes, patrimonioEstimado: patrimonio, recorrentes, diversificacao },
          evolucao: null,
        })
        setScorePrevio(base.score)
      })
      .catch(() => {})
  }, [user?.id])

  const [scoreBaseInputs, setScoreBaseInputs] = useState<{
    subsMensal: number
    compMensal: number
    totalAportes: number
    patrimonio: number
    recorrentes: number
    diversificacao: number
  } | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    Promise.all([getInvestimentos(userId), getAssinaturas(userId), getCompromissos(userId)])
      .then(([invs, subs, comps]) => {
        const subsMensal = calcularTotalMensal(subs || [])
        const compMensal = (comps || []).reduce((s, c) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0)
        const totalAportes = (invs || []).reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0)
        const patrimonio = calcularPatrimonioEstimado(invs || [])
        const recorrentes = (invs || []).filter((i) => i.aporte_recorrente).length
        const diversificacao = new Set((invs || []).map((i) => i.categoria_investimento)).size
        setScoreBaseInputs({ subsMensal, compMensal, totalAportes, patrimonio, recorrentes, diversificacao })
      })
      .catch(() => setScoreBaseInputs(null))
  }, [user?.id])

  const runPreview = useCallback(
    async (file: File) => {
      if (!user) return
      resetImportState()
      setSelectedFile(file)
      setErrorFilename(null)
      setProcessingStep(0)
      setProcessingProgress(12)
      setState("processing")

      try {
        if (file.size > 25 * 1024 * 1024) {
          setErrorType("insufficient")
          setErrorFilename(file.name)
          setState("error")
          return
        }

        setProcessingStep(0)
        setProcessingProgress(18)
        await new Promise((r) => setTimeout(r, 90))

        const parsed = await parseAnySupportedFile(file)
        setParsedResult(parsed)
        setProcessingStep(1)
        setProcessingProgress(38)
        await new Promise((r) => setTimeout(r, 90))

        let normalized = normalizeImportedTransactions(parsed)

        // marca flags (recorrência / assinatura / salário) para preview + edição
        const recurring = detectRecurringTransactions(normalized)
        const recurringKeys = new Set(recurring.map((r) => r.key))
        const subs = detectSubscriptions(normalized, recurring)
        const subKeys = new Set(subs.map((s) => s.key))
        const salary = detectSalary(normalized)

        normalized = normalized.map((t) => {
          const rKey = importedTxRecurringKey(t)
          const isRecurring = recurringKeys.has(rKey)
          const isSubscription = subKeys.has(rKey) || /netflix|spotify|prime|hbo|disney|openai|claude|adobe|canva/i.test(t.description)
          const isSalary = salary ? t.type === "receita" && Math.abs(t.amount - salary.amount) <= Math.max(1, salary.amount * 0.02) : false
          return { ...t, isRecurring, isSubscription, isSalary }
        })

        // aplica regras de categorização do usuário (aprendizado por correção)
        try {
          const rules = await getUserCategorizationRules(user.id)
          if (rules.length > 0) {
            normalized = applyUserCategorizationRules(normalized, rules)
          }
        } catch {
          // não bloqueia preview se falhar
        }

        // verifica duplicatas no banco (cross-batch) antes de exibir preview
        try {
          const dbDuplicates = await checkImportDuplicates(user.id, normalized)
          setDuplicateFingerprints(dbDuplicates)
          // pré-exclui duplicatas automáticas (usuário pode reativar manualmente)
          if (dbDuplicates.size > 0) {
            const autoExcluded = new Set<number>()
            normalized.forEach((c, idx) => {
              if (dbDuplicates.has(candidateFingerprint(c))) autoExcluded.add(idx)
            })
            setExcluded(autoExcluded)
          } else {
            setExcluded(new Set())
          }
        } catch {
          setDuplicateFingerprints(new Set())
        }

        setCandidates(normalized)
        setDetectedSubs(subs)
        setDetectedPlans(detectPlanningSuggestions(normalized, recurring as any, subs))
        setConfirmedPlanKeys(new Set())
        setDetectedInvestments(detectInvestmentSuggestions(normalized))
        setConfirmedInvestmentKeys(new Set())
        setProcessingStep(2)
        setProcessingProgress(58)
        await new Promise((r) => setTimeout(r, 90))

        if (normalized.length === 0 || parsed.rows.length === 0) {
          setErrorType("insufficient")
          setErrorFilename(file.name)
          setState("error")
          return
        }

        if (normalized.length > 10000) {
          setErrorType("insufficient")
          setErrorFilename(file.name)
          setState("error")
          return
        }

        setProcessingStep(3)
        setProcessingProgress(74)

        const inCycle = cycleRange
          ? normalized.filter((t) => t.date >= cycleRange.inicio && t.date <= cycleRange.fim)
          : normalized
        const importIncome = inCycle.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0)
        const importExpenses = inCycle.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0)

        const baseIncome = cycleTotals?.income ?? 0
        const baseExpenses = cycleTotals?.expenses ?? 0

        const inputs = scoreBaseInputs
          ? {
              totalRendaPeriodo: baseIncome + importIncome,
              totalGastosPeriodo: baseExpenses + importExpenses,
              assinaturasMensal: scoreBaseInputs.subsMensal,
              compromissosMensal: scoreBaseInputs.compMensal,
              investimentos: {
                totalAportes: scoreBaseInputs.totalAportes,
                patrimonioEstimado: scoreBaseInputs.patrimonio,
                recorrentes: scoreBaseInputs.recorrentes,
                diversificacao: scoreBaseInputs.diversificacao,
              },
              evolucao: null,
            }
          : {
              totalRendaPeriodo: baseIncome + importIncome,
              totalGastosPeriodo: baseExpenses + importExpenses,
              evolucao: null,
            }

        setProcessingStep(4)
        setProcessingProgress(86)
        await new Promise((r) => setTimeout(r, 90))

        const estimated = calculateFinancialScore(inputs as any)

        const invalidRows = parsed.diagnostics?.invalidRows ?? 0
        const detected = {
          encoding: parsed.diagnostics?.encoding ?? "—",
          delimiter: parsed.diagnostics?.delimiter ?? null,
          bank: parsed.diagnostics?.bankHint ?? null,
        }

        const logs: Array<{ level: "info" | "warn"; msg: string }> = []
        logs.push({ level: "info", msg: `Detectado: ${detected.bank ?? "Banco não identificado"} · ${parsed.source.toUpperCase()}` })
        if (detected.delimiter) logs.push({ level: "info", msg: `Delimitador: ${detected.delimiter === "\t" ? "TAB" : detected.delimiter}` })
        logs.push({ level: "info", msg: `Encoding: ${detected.encoding}` })
        if (invalidRows > 0) logs.push({ level: "warn", msg: `${invalidRows} linhas foram ignoradas por estarem incompletas.` })
        const dropped = Math.max(0, parsed.rows.length - normalized.length)
        if (dropped > 0) logs.push({ level: "warn", msg: `${dropped} linhas não viraram transação (faltou data/valor/descrição).` })
        setParserLogs(logs)

        const data = buildPreviewData({
          file,
          parsedRows: parsed.rows.length,
          normalized,
          scorePrevio: scorePrevioRef.current || 0,
          scoreEstimado: estimated.score,
          statementBalance: parsed.statementBalance ?? null,
          invalidRows,
          detected,
        })

        setProcessingStep(5)
        setProcessingProgress(98)

        // micro-delay só para evitar flash; não afeta lógica de processamento
        await new Promise((r) => setTimeout(r, 220))

        setPreview(data)
        setState("preview")
      } catch (e) {
        setErrorType("format")
        setErrorFilename(file.name)
        setState("error")
      }
    },
    [cycleRange, cycleTotals, resetImportState, scoreBaseInputs, user],
  )

  const confirmImport = useCallback(async () => {
    if (!user || !preview || !selectedFile) return
    setSaving(true)
    let batchId: string | null = null
    try {
      // garante ciclo ativo (quando a tabela existe) para associar import/transações
      let cycleId: string | null = null
      try {
        const s = await getUserFinancialSettings(user.id)
        const r = getCurrentCycleRange({ cycle_start_day: s.cycle_start_day })
        const cycle = await ensureActiveCycle(user.id, r.inicio, r.fim)
        cycleId = cycle?.id ?? null
      } catch {
        cycleId = null
      }

      const selected = candidates
        .map((_, idx) => ({ idx, tx: getEffectiveTx(idx) }))
        .filter((x): x is { idx: number; tx: ImportedTransactionCandidate } => Boolean(x.tx))
        .filter((x) => !excluded.has(x.idx))
        .filter((x) => !savedIdxs.has(x.idx))

      let normalized = selected.map((x) => x.tx)

      if (normalized.length === 0) {
        throw new Error(savedIdxs.size > 0 ? "Nenhuma transação pendente para salvar." : "Nenhuma transação para salvar.")
      }

      // Recheca duplicatas no estado FINAL (após edições) para evitar duplicação real no banco.
      // Duplicatas são ignoradas automaticamente (não falham o salvamento).
      let duplicatesSkipped = 0
      try {
        const dups = await checkImportDuplicates(user.id, normalized)
        if (dups.size > 0) {
          const filtered = normalized.filter(
            (t) =>
              !dups.has(
                candidateFingerprint({ date: t.date, description: t.description, amount: t.amount, type: t.type }),
              ),
          )
          duplicatesSkipped = normalized.length - filtered.length
          normalized = filtered
          if (duplicatesSkipped > 0) {
            toast.message("Duplicatas ignoradas", {
              description: `${duplicatesSkipped} transação(ões) já existiam e foram ignoradas.`,
            })
          }
        }
      } catch {
        // melhor esforço (UI já faz uma checagem antes)
      }

      if (normalized.length === 0) {
        throw new Error("Todas as transações selecionadas já existiam no seu histórico (duplicatas).")
      }

      const totalIncome = normalized.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0)
      const totalExpenses = normalized.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0)
      const dates = normalized.map((t) => String(t.date || "")).filter(Boolean).sort()
      const periodStart = dates.length ? dates[0]! : null
      const periodEnd = dates.length ? dates[dates.length - 1]! : null

      const paymentMethodCounts = normalized.reduce((acc, t) => {
        if (!t.paymentMethod) return acc
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const categorySums = normalized.reduce((acc, t) => {
        if (t.type !== "despesa") return acc
        const name = t.category.name || "Outros"
        acc[name] = (acc[name] || 0) + (Number(t.amount) || 0)
        return acc
      }, {} as Record<string, number>)
      const categoriesTop = Object.entries(categorySums)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)

      // cria batch para histórico (se o schema existir). Se não existir, importa mesmo assim.
      let batch: { id: string } | null = activeBatchId ? { id: activeBatchId } : null
      try {
        if (!batch) {
          const b = await createImportBatch(user.id, {
            cycle_id: cycleId,
            source: selectedFile.name.toLowerCase().endsWith(".ofx")
              ? "ofx"
              : selectedFile.name.toLowerCase().endsWith(".csv")
                ? "csv"
                : "xlsx",
            filename: preview.filename,
            filesize_bytes: selectedFile.size,
            statement_balance: preview.statementBalance,
            transactions_count: normalized.length,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            score_before: preview.scorePrevio,
            score_after: preview.score,
            recurring_count: preview.recorrencias,
            subscriptions_count: preview.assinaturas,
            payment_methods: paymentMethodCounts,
            categories_top: categoriesTop,
            bank_detected: preview.detected.bank ?? null,
            imported_at: null,
            period_start: periodStart,
            period_end: periodEnd,
            valid_transactions_count: normalized.length,
            failed_transactions_count: 0,
            metadata: {
              detected: preview.detected,
              invalid_rows: preview.invalidRows,
            } as any,
          })
          batch = { id: b.id }
          batchId = b.id
          setActiveBatchId(b.id)
        } else {
          batchId = batch.id
        }
      } catch (e: any) {
        const msg = String(e?.message || "")
        const missingBatchTable =
          /import_batches/i.test(msg) &&
          (/does not exist/i.test(msg) || /schema cache/i.test(msg) || /could not find/i.test(msg) || /relation/i.test(msg))
        if (!missingBatchTable) {
          setParserLogs((prev) => [
            ...prev,
            { level: "warn", msg: `Não consegui criar o histórico de importação (import_batches). Vou importar as transações mesmo assim. ${msg}`.trim() },
          ])
          batch = null
          batchId = null
          setActiveBatchId(null)
        } else {
          batch = null
          setParserLogs((prev) => [
            ...prev,
            {
              level: "warn",
              msg: "Seu Supabase ainda não tem o histórico de importação (import_batches). Vou importar as transações mesmo assim.",
            },
            { level: "warn", msg: "Para ativar histórico/undo por import: execute a migration `20260514_import_batches_and_transacoes_import_id.sql`." },
          ])
        }
      }

      // cria categorias necessárias (únicas)
      const wanted = new Set<string>()
      for (const t of normalized) wanted.add(t.category.name || "Outros")
      if (![...wanted].some((x) => x.toLowerCase() === "receita")) wanted.add("Receita")

      const categoryIdByName = new Map<string, string>()
      for (const name of wanted) {
        const tipo = name === "Receita" ? "receita" : "despesa"
        try {
          const id = await getOrCreateCategoria(user.id, name, tipo)
          categoryIdByName.set(name, id)
        } catch (e: any) {
          const msg = String(e?.message || "")
          setParserLogs((prev) => [...prev, { level: "warn", msg: `Não consegui criar/encontrar a categoria '${name}'. Vou salvar sem categoria (se permitido). ${msg}`.trim() }])
        }
      }

      const validationFailures: SaveFailure[] = []
      const itemsToInsert: Array<{ idx: number; payload: Record<string, any> }> = []
      const allowedFingerprints = new Set(
        normalized.map((tx) =>
          candidateFingerprint({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type }),
        ),
      )

      for (const { idx, tx } of selected) {
        const fp = candidateFingerprint({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type })
        if (!allowedFingerprints.has(fp)) continue
        const categoriaNome = tx.type === "receita" ? "Receita" : tx.category.name || "Outros"
        const categoriaId = categoryIdByName.get(categoriaNome) ?? categoryIdByName.get("Outros") ?? null
        const mapped = mapImportedTransactionToDb(tx, user.id, {
          categoriaId,
          importId: batch?.id ?? null,
          cycleId: cycleId ?? null,
          txFingerprint: fp,
          confirmado: true,
        })
        if (!mapped.ok) {
          validationFailures.push({ idx, stage: "validation", reason: mapped.errors.join("; "), payload: mapped.value ?? undefined })
          continue
        }
        itemsToInsert.push({ idx, payload: mapped.value })
      }

      if (import.meta.env.DEV) {
        console.debug("[importacao] payload enviado ao Supabase", {
          attempted: itemsToInsert.length,
          validationFailed: validationFailures.length,
          rows: itemsToInsert,
        })
      }

      const bulkRes = await addTransacoesBulkResilientWithReport(user.id, itemsToInsert, { chunkSize: 500 })
      if (bulkRes.droppedColumns.length > 0) {
        setParserLogs((prev) => [
          ...prev,
          {
            level: "warn",
            msg: `Ajuste automático: seu banco não tinha as colunas ${bulkRes.droppedColumns.map((c) => `'${c}'`).join(", ")}. Importação seguiu sem elas.`,
          },
        ])
      }

      const supabaseFailures: SaveFailure[] = bulkRes.failed.map((f) => ({
        idx: f.idx,
        stage: "supabase",
        reason: f.message,
        payload: f.payload,
      }))

      const allFailures = [...validationFailures, ...supabaseFailures]
      setSaveFailures(allFailures)
      setSaveSummary({ attempted: selected.length, saved: bulkRes.insertedIdxs.length, failed: allFailures.length })

      if (batch?.id) {
        updateImportBatch(user.id, batch.id, {
          valid_transactions_count: bulkRes.insertedIdxs.length,
          failed_transactions_count: allFailures.length,
          bank_detected: preview.detected.bank ?? null,
          period_start: periodStart,
          period_end: periodEnd,
        } as any).catch(() => {})
      }

      if (bulkRes.insertedIdxs.length > 0) {
        setSavedIdxs((prev) => {
          const next = new Set(prev)
          for (const id of bulkRes.insertedIdxs) next.add(id)
          return next
        })
      }

      if (import.meta.env.DEV) {
        console.debug("[importacao] resultado Supabase", {
          attempted: itemsToInsert.length,
          inserted: bulkRes.insertedIdxs.length,
          failed: bulkRes.failed.length,
          droppedColumns: bulkRes.droppedColumns,
          failedItems: bulkRes.failed,
        })
      }

      if (allFailures.length > 0) {
        toast.error("Conseguimos ler o arquivo, mas alguns registros não puderam ser salvos.", {
          description: `${bulkRes.insertedIdxs.length} salvas · ${allFailures.length} com erro`,
        })
        if (batch?.id) {
          updateImportBatch(user.id, batch.id, {
            status: "failed",
            completed_at: new Date().toISOString(),
            imported_at: new Date().toISOString(),
            error_message: "partial_save",
            error_details: {
              inserted: bulkRes.insertedIdxs.length,
              failed: allFailures.length,
              failures: allFailures.slice(0, 50),
            } as any,
            valid_transactions_count: bulkRes.insertedIdxs.length,
            failed_transactions_count: allFailures.length,
          } as any).catch(() => {})
        }
        setErrorType("save")
        setErrorFilename(preview.filename)
        setState("partial")

        createNotification(user.id, {
          type: "import_failed",
          title: "Importação com falhas",
          message: `${bulkRes.insertedIdxs.length} transações salvas, ${allFailures.length} com erro.`,
          metadata: {
            batch_id: batch?.id ?? null,
            filename: preview.filename,
            period_start: periodStart,
            period_end: periodEnd,
          },
        }).catch(() => {})

        return
      }

      let scoreAfterReal: number | null = null
      try {
        const [t2, invs2, subs2, comps2] = await Promise.all([
          getTotaisMes(user.id),
          getInvestimentos(user.id),
          getAssinaturas(user.id),
          getCompromissos(user.id),
        ])
        const subsMensal2 = calcularTotalMensal(subs2 || [])
        const compMensal2 = (comps2 || []).reduce((s, c) => s + (Number((c as any).valor_parcela ?? c.valor) || 0), 0)
        const totalAportes2 = (invs2 || []).reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0)
        const patrimonio2 = calcularPatrimonioEstimado(invs2 || [])
        const recorrentes2 = (invs2 || []).filter((i) => i.aporte_recorrente).length
        const diversificacao2 = new Set((invs2 || []).map((i) => i.categoria_investimento)).size
        const res2 = calculateFinancialScore({
          totalRendaPeriodo: t2.totalRenda,
          totalGastosPeriodo: t2.totalGastos,
          assinaturasMensal: subsMensal2,
          compromissosMensal: compMensal2,
          investimentos: {
            totalAportes: totalAportes2,
            patrimonioEstimado: patrimonio2,
            recorrentes: recorrentes2,
            diversificacao: diversificacao2,
          },
          evolucao: null,
        })
        scoreAfterReal = res2.score
        if (batch?.id) {
          await updateImportBatch(user.id, batch.id, { score_after: scoreAfterReal })
        }
      } catch {
        // sem bloqueio: o batch ainda pode ser finalizado
      }

      if (batch?.id) {
        try {
          await completeImportBatch(user.id, batch.id)
        } catch (e: any) {
          const msg = String(e?.message || "")
          setParserLogs((prev) => [
            ...prev,
            {
              level: "warn",
              msg: `Importação salva, mas não consegui finalizar o histórico (import_batches). ${msg ? `Detalhe: ${msg}` : ""}`.trim(),
            },
          ])
        }
      }
      if (scoreAfterReal != null) {
        setPreview((p) => (p ? { ...p, score: scoreAfterReal } : p))
      }
      setPreview((p) =>
        p
          ? {
              ...p,
              transacoes: normalized.length,
              receitas: totalIncome,
              despesas: totalExpenses,
              saldo: totalIncome - totalExpenses,
            }
          : p,
      )

      if (batch?.id) {
        toast.success("Importação salva com sucesso")
      } else {
        toast.success("Transações importadas com sucesso", {
          description: "Seu Supabase ainda não possui histórico de imports. Execute a migration de importação para habilitar.",
        })
      }

      // Notificações automáticas pós-importação
      const investmentTxs = normalized.filter((t) => t.isInvestment)
      const topCat = preview.categorias?.[0] ?? null
      const topCatPercent = topCat && totalExpenses > 0 ? (topCat.valor / totalExpenses) * 100 : 0
      triggerPostImportNotifications(user.id, {
        filename: preview.filename,
        inserted: bulkRes.insertedIdxs.length,
        failed: bulkRes.failed.length,
        duplicates: duplicatesSkipped > 0 ? duplicatesSkipped : duplicateFingerprints.size,
        scoreAntes: preview.scorePrevio || 0,
        scoreDepois: scoreAfterReal ?? preview.score,
        saldoDisponivel: totalIncome - totalExpenses,
        topCategoria: topCat ? { name: topCat.nome, value: topCat.valor, percent: topCatPercent } : null,
        subscriptions: (preview.assinaturas ?? 0) > 0
          ? detectSubscriptions(normalized, detectRecurringTransactions(normalized)).map((s) => ({
              name: s.name,
              monthlyEstimate: s.monthlyEstimate,
            }))
          : [],
        investmentCount: investmentTxs.length,
        investmentTotal: investmentTxs.reduce((s, t) => s + t.amount, 0),
      }).catch(() => {})

      // Evita mostrar insights antigos por cache (30min)
      try {
        localStorage.removeItem(`of-insights-cache:v2:${user.id}`)
      } catch {
        // ignore
      }

      // Recarrega dashboard/score/insights imediatamente após importação
      requestSync()
      refreshActiveCycleTotals(user.id).catch(() => {})

      // Cria assinaturas confirmadas pelo usuário no preview
      const subsToCreate = detectedSubs.filter((s) => confirmedSubKeys.has(s.key))
      if (subsToCreate.length > 0) {
        const today = new Date().toISOString().slice(0, 10)
        await Promise.allSettled(
          subsToCreate.map((s) =>
            criarAssinatura(user.id, {
              nome: s.name,
              valor: s.monthlyEstimate,
              recorrencia: "mensal",
              renovacao_automatica: true,
              ativo: true,
              proximo_pagamento: today,
            }),
          ),
        )
      }

      // Cria sugestões confirmadas no Planejamento (contas fixas / financiamentos)
      const plansToCreate = detectedPlans.filter((p) => confirmedPlanKeys.has(p.key))
      if (plansToCreate.length > 0) {
        const today = new Date().toISOString().slice(0, 10)
        const existing = await getCompromissos(user.id).catch(() => [])
        await Promise.allSettled(
          plansToCreate.map(async (p) => {
            const exists = (existing || []).some((c: any) => c.ativo && c.tipo === p.kind && normalizeKey(c.descricao) === normalizeKey(p.name))
            if (exists) return
            await criarCompromisso(user.id, {
              descricao: p.name,
              valor: p.monthlyEstimate,
              categoria_id: null,
              tipo: p.kind,
              dia_vencimento: Math.min(31, Math.max(1, p.dueDay || 5)),
              data_inicio: today,
              data_fim: null,
              ativo: true,
              financiamento_tipo: null,
              valor_total_financiado: null,
              valor_entrada: null,
              valor_parcela: p.kind === "financiamento" ? p.monthlyEstimate : null,
              parcelas_total: null,
              parcelas_pagas: null,
              metodo_pagamento: null,
              observacoes: "Criado a partir de importação (sugestão confirmada).",
            } as any)
          }),
        )
      }

      // Cria/atualiza investimentos confirmados (apenas aportes por enquanto)
      const invToApply = detectedInvestments.filter((i) => confirmedInvestmentKeys.has(i.key) && i.action === "aporte")
      if (invToApply.length > 0) {
        const existingInvs = await getInvestimentos(user.id).catch(() => [])
        for (const inv of invToApply) {
          const name = guessInvestmentName(inv.name)
          const match = (existingInvs || []).find((x: any) => x.ativo && normalizeKey(x.nome) === normalizeKey(name))
          if (match?.id) {
            await atualizarInvestimento(match.id, user.id, { valor_aporte: (Number(match.valor_aporte) || 0) + (Number(inv.amount) || 0) } as any)
          } else {
            await criarInvestimento(user.id, {
              nome: name,
              tipo: "importado",
              categoria_investimento: "renda_fixa",
              corretora: null,
              corretora_personalizada: null,
              valor_aporte: Number(inv.amount) || 0,
              aporte_recorrente: false,
              recorrencia: null,
              rentabilidade: null,
              rentabilidade_tipo: "percent",
              data_investimento: inv.date,
              vencimento: null,
              observacoes: "Criado a partir de importação (aporte confirmado).",
              risco: "moderado",
              liquidez: "media",
              ativo: true,
            } as any)
          }
        }
      }

      setSaveFailures([])
      setSaveSummary(null)
      setSavedIdxs(new Set())
      setActiveBatchId(null)
      await reloadHistory()
      setState("success")
    } catch (e: any) {
      const rawMsg = String(e?.message || "")
      if (import.meta.env.DEV) {
        console.debug("[importacao] erro ao salvar", {
          message: rawMsg,
          error: e,
          attemptedCandidates: candidates.length,
          excluded: excluded.size,
          savedIdxs: savedIdxs.size,
        })
      }
      const pretty =
        rawMsg && rawMsg !== "unknown"
          ? rawMsg
              .replace(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i, "Faltou a coluna $1 na tabela $2.")
              .replace(/relation \"([^\"]+)\" does not exist/i, "A tabela $1 não existe no banco.")
              .replace(/new row violates row-level security policy for table \"([^\"]+)\"/i, "Permissão insuficiente para salvar em $1.")
          : ""

      setLastSaveError({ raw: rawMsg || "unknown", pretty: pretty || undefined })
      toast.error("Não foi possível salvar a importação", { description: pretty ? pretty.slice(0, 120) : undefined })
      if (batchId) {
        failImportBatch(user.id, batchId, {
          message: rawMsg || "unknown",
          details: { name: e?.name, stack: e?.stack, code: e?.code, details: e?.details, hint: e?.hint },
        }).catch(() => {})
      }
      const msg = rawMsg
      if (/import_id|import_batches|column .* does not exist|relation .* does not exist/i.test(msg)) setErrorType("format")
      else setErrorType("save")
      setErrorFilename(preview.filename)
      setState("error")
    } finally {
      setSaving(false)
    }
  }, [
    activeBatchId,
    candidates,
    excluded,
    getEffectiveTx,
    preview,
    reloadHistory,
    savedIdxs,
    selectedFile,
    user,
    detectedSubs,
    confirmedSubKeys,
    detectedPlans,
    confirmedPlanKeys,
    detectedInvestments,
    confirmedInvestmentKeys,
    requestSync,
  ])

  const handleDeleteImport = useCallback(
    async (id: string) => {
      if (!user) return
      try {
        await deleteImportBatch(user.id, id)
        toast.success("Importação apagada")
        await reloadHistory()
      } catch {
        toast.error("Não foi possível apagar este import")
      }
    },
    [reloadHistory, user],
  )

  return (
    <div className="ofx-dashboard">
      <div className="page">
        <div className="flex items-center gap-2 text-[12px] text-[#333] mb-6">
          <Link to="/app" className="hover:text-[#555] transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-[#555]">Importação</span>
        </div>

        {state === "empty" || state === "upload" ? (
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[#F5F5F0] mb-1">Importação financeira</h1>
            <p className="text-[14px] text-[#444]">Conecte seu histórico sem precisar do Open Finance</p>
          </div>
        ) : null}

        <div className="flex flex-col">
          {state === "empty" && (
            <EmptyState
              onStart={() => setState("upload")}
              history={history}
              onDeleteImport={handleDeleteImport}
            />
          )}
          {state === "upload" && (
            <UploadState
              onFileSelected={runPreview}
              onCancel={() => setState("empty")}
              history={history}
              lastSyncAt={lastSyncAt}
              onDeleteImport={handleDeleteImport}
            />
          )}
          {state === "processing" && <ProcessingState filename={selectedFile?.name || "extrato"} activeStep={processingStep} progress={processingProgress} />}
          {state === "preview" && preview && (
            <PreviewState
              data={preview}
              items={itemsForPreview}
              excludedCount={excludedCount}
              savedCount={savedIdxs.size}
              pendingFailuresCount={saveFailures.length}
              logs={parserLogs}
              onExcludeToggle={toggleExclude}
              onBulkSelect={bulkSelect}
              onUpdateTx={updateTx}
              onSaveRule={(idx) => void saveRuleForTx(idx)}
              fmt={fmtCurrency}
              saving={saving}
              onConfirm={confirmImport}
              onCancel={() => {
                resetImportState()
                setState("upload")
              }}
              focusEditIdx={focusEditIdx}
              onFocusConsumed={() => setFocusEditIdx(null)}
              detectedSubs={detectedSubs}
              confirmedSubKeys={confirmedSubKeys}
              onToggleSubKey={(key) =>
                setConfirmedSubKeys((prev) => {
                  const next = new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }
              detectedPlans={detectedPlans}
              confirmedPlanKeys={confirmedPlanKeys}
              onTogglePlanKey={(key) =>
                setConfirmedPlanKeys((prev) => {
                  const next = new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }
              detectedInvestments={detectedInvestments}
              confirmedInvestmentKeys={confirmedInvestmentKeys}
              onToggleInvestmentKey={(key) =>
                setConfirmedInvestmentKeys((prev) => {
                  const next = new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }
            />
          )}
          {state === "success" && preview && (
            <SuccessState
              data={preview}
              history={history}
              onDeleteImport={handleDeleteImport}
              onDashboard={() => navigate("/app")}
              onNewImport={() => {
                resetImportState()
                setState("upload")
              }}
            />
          )}
          {state === "partial" && preview && saveSummary ? (
            <PartialSaveState
              filename={errorFilename ?? preview.filename}
              summary={saveSummary}
              failures={saveFailures}
              items={itemsForPreview}
              onViewPreview={() => setState("preview")}
              onRetrySave={confirmImport}
              onEditItem={(idx) => {
                setFocusEditIdx(idx)
                setState("preview")
              }}
              onNewFile={() => {
                resetImportState()
                setState("upload")
              }}
            />
          ) : null}
          {state === "error" && (
            <ErrorState
              errorType={errorType}
              filename={errorFilename}
              debugMessage={errorType === "save" ? (lastSaveError?.pretty || lastSaveError?.raw || null) : null}
              detected={
                parsedResult
                  ? {
                      bank: parsedResult.diagnostics?.bankHint ?? null,
                      encoding: (parsedResult.diagnostics?.encoding as any) ?? null,
                      delimiter: (parsedResult.diagnostics?.delimiter as any) ?? null,
                      parsedRows: parsedResult.rows.length,
                      txs: candidates.length,
                      invalidRows: parsedResult.diagnostics?.invalidRows ?? 0,
                    }
                  : null
              }
              onShowPreview={preview && candidates.length > 0 ? () => setState("preview") : null}
              onRetry={() => setState("upload")}
              onCancel={() => setState("empty")}
            />
          )}
        </div>
      </div>
    </div>
  )
}
