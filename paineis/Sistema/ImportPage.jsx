/**
 * Finance App — Importação Financeira
 * Componente completo com todos os estados.
 * Integrar com Supabase: substituir os handlers simulados pelos reais.
 *
 * Estados: 'empty' | 'upload' | 'processing' | 'preview' | 'success' | 'error' | 'insufficient'
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Dados mock (substituir por dados reais do Supabase) ───────────────────
const MOCK_RESULT = {
  filename: "extrato_nubank_abril.csv",
  filesize: "234KB",
  transacoes: 87,
  receitas: 4200,
  despesas: 2847,
  saldo: 1353,
  score: 742,
  scorePrevio: 620,
  confiancaIA: 94,
  assinaturas: 3,
  recorrencias: 5,
  salario: 4200,
  categorias: [
    { emoji: "🍔", nome: "Alimentação", valor: 680 },
    { emoji: "🏠", nome: "Moradia", valor: 1200 },
    { emoji: "🚗", nome: "Transporte", valor: 320 },
    { emoji: "🛒", nome: "Compras", valor: 340 },
    { emoji: "📱", nome: "Assinaturas", valor: 89 },
  ],
  transacoes_preview: [
    { emoji: "💰", nome: "Salário", categoria: "Receita", valor: 4200, positivo: true, data: "01 Abr" },
    { emoji: "🏠", nome: "Aluguel", categoria: "Moradia", valor: -1200, positivo: false, data: "05 Abr" },
    { emoji: "🍔", nome: "Mercado Extra", categoria: "Alimentação", valor: -89.5, positivo: false, data: "08 Abr" },
    { emoji: "📱", nome: "Netflix", categoria: "Assinaturas", valor: -39.9, positivo: false, data: "10 Abr" },
    { emoji: "🚗", nome: "Uber", categoria: "Transporte", valor: -24.8, positivo: false, data: "12 Abr" },
  ],
};

const HISTORY_MOCK = [
  { nome: "extrato_nubank_marco.csv", transacoes: 92, data: "há 1 mês", status: "ok" },
  { nome: "extrato_inter_fev.ofx", transacoes: 74, data: "há 2 meses", status: "ok" },
];

const BANCOS = ["Nubank", "Itaú", "Bradesco", "Inter", "Santander", "C6 Bank", "BTG", "Caixa"];

const PASSOS_PROCESSAMENTO = [
  { label: "Arquivo recebido", sub: "Leitura confirmada" },
  { label: "Lendo transações", sub: "Identificando estrutura" },
  { label: "Categorizando automaticamente", sub: "87 transações encontradas" },
  { label: "Detectando recorrências", sub: "Analisando padrões" },
  { label: "Calculando Score Financeiro", sub: "Avaliando saúde financeira" },
  { label: "Gerando insights", sub: "Preparando relatório" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// ─── Sub-componentes ─────────────────────────────────────────────────────────

/** Badge genérico */
function Badge({ children, variant = "default" }) {
  const variants = {
    default: "border border-[#2A2A2A] text-[#666] bg-transparent",
    green: "border border-green-600/30 text-green-400 bg-green-900/20",
    red: "border border-red-600/30 text-red-400 bg-red-900/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${variants[variant]}`}>
      {children}
    </span>
  );
}

/** Métrica card */
function MetricCard({ label, value, color = "text-[#F5F5F0]" }) {
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#555] mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

/** Indicador de confiança da IA */
function ConfidenceBar({ value }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg">
      <span className="text-green-500 text-base">🧠</span>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#555]">Confiança da IA</span>
          <span className="text-[11px] text-green-400">{value}%</span>
        </div>
        <div className="h-[3px] bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 rounded-full transition-all duration-1000"
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Linha de transação */
function TxRow({ emoji, nome, categoria, valor, positivo, data }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#1A1A1A] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[#161616] flex items-center justify-center text-sm flex-shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#D0D0D0] truncate">{nome}</p>
        <p className="text-[11px] text-[#444]">{categoria}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-[13px] ${positivo ? "text-green-400" : "text-[#F5F5F0]"}`}>
          {positivo ? "+" : ""}
          {fmt(Math.abs(valor))}
        </p>
        <p className="text-[11px] text-[#333]">{data}</p>
      </div>
    </div>
  );
}

// ─── ESTADO: VAZIO ────────────────────────────────────────────────────────────
function EmptyState({ onStart }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#1E1E1E] flex items-center justify-center">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[#F5F5F0] mb-2">Nenhuma importação ainda</h2>
        <p className="text-[14px] text-[#555] max-w-xs leading-relaxed">
          Exporte o extrato do seu banco e jogue aqui. A Finance App organiza tudo automaticamente.
        </p>
      </div>

      <button
        onClick={onStart}
        className="flex items-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg text-[15px] font-medium transition-colors"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        Importar extrato
      </button>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Formatos suportados</p>
          <div className="flex gap-2 justify-center">
            <Badge>CSV</Badge>
            <Badge>OFX</Badge>
            <Badge>XLSX</Badge>
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Bancos compatíveis</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {BANCOS.map((b) => <Badge key={b}>{b}</Badge>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ESTADO: UPLOAD ────────────────────────────────────────────────────────────
function UploadState({ onFileSelected, onCancel }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-medium text-[#F5F5F0] mb-1">Importar extrato</h2>
        <p className="text-[13px] text-[#555]">Exporte o arquivo do seu banco e arraste aqui</p>
      </div>

      {/* Drop zone */}
      <div
        className={`border rounded-2xl p-12 text-center cursor-pointer transition-all select-none ${
          isDragging
            ? "border-green-600 bg-green-900/5"
            : "border-[#2A2A2A] border-dashed hover:border-green-700/50 hover:bg-green-900/3"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.ofx,.xlsx,.xls"
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
            isDragging ? "bg-green-900/20 border-green-600/40" : "bg-[#111] border-[#2A2A2A]"
          }`}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"
              stroke={isDragging ? "#16A34A" : "#444"} strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 9.095H6.75z" />
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

      {/* How to export guide */}
      <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => setShowGuide(!showGuide)}
        >
          <span className="text-[12px] uppercase tracking-widest text-[#333]">
            Como exportar do seu banco
          </span>
          <svg
            width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="2"
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
              <div key={banco} className="flex justify-between items-center py-2 border-b border-[#1A1A1A] last:border-0">
                <span className="text-[13px] text-[#888]">{banco}</span>
                <span className="text-[12px] text-[#444]">{instrucao}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last imports */}
      {HISTORY_MOCK.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Importações anteriores</p>
          <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
            {HISTORY_MOCK.map((item) => (
              <div key={item.nome} className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] last:border-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#888] truncate">{item.nome}</p>
                  <p className="text-[11px] text-[#333]">{item.transacoes} transações · {item.data}</p>
                </div>
                <button className="text-[11px] text-[#444] border border-[#2A2A2A] rounded-md px-2 py-1 hover:border-[#444] transition-colors">
                  Reimportar
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
  );
}

// ─── ESTADO: PROCESSANDO ──────────────────────────────────────────────────────
function ProcessingState({ filename = "extrato.csv", onSkip }) {
  const [activeStep, setActiveStep] = useState(1);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.random() * 6 + 2, 97);
        setActiveStep(
          next < 30 ? 1 : next < 50 ? 2 : next < 65 ? 3 : next < 80 ? 4 : next < 92 ? 5 : 5
        );
        return next;
      });
    }, 350);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12 min-h-[500px]">
      {/* File pill */}
      <div className="flex items-center gap-2.5 px-4 py-2 bg-[#111] border border-[#1E1E1E] rounded-lg">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-[13px] text-[#888]">{filename}</span>
      </div>

      {/* AI status */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[12px] text-green-500 font-medium tracking-wide">IA ANALISANDO</span>
        </div>
        <p className="text-[22px] font-medium text-[#F5F5F0]">
          {PASSOS_PROCESSAMENTO[activeStep]?.label}...
        </p>
        <p className="text-[13px] text-[#444] mt-1">
          {PASSOS_PROCESSAMENTO[activeStep]?.sub}
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {PASSOS_PROCESSAMENTO.map((passo, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <div key={i} className="flex items-center gap-3">
              {done ? (
                <div className="w-5 h-5 rounded-full bg-green-900/30 border border-green-600/40 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="3">
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
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between mb-2">
          <span className="text-[12px] text-[#333]">Processando arquivo</span>
          <span className="text-[12px] text-green-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-[3px] bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Skip (dev/preview only — remover em prod) */}
      {onSkip && (
        <button onClick={onSkip} className="text-[12px] text-[#333] hover:text-[#555] transition-colors">
          Pular animação →
        </button>
      )}
    </div>
  );
}

// ─── ESTADO: PREVIEW ──────────────────────────────────────────────────────────
function PreviewState({ data, onConfirm, onCancel }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium text-[#F5F5F0] mb-0.5">Revisão da importação</h2>
          <p className="text-[12px] text-[#444]">{data.filename} · {data.transacoes} transações</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] text-green-500">IA verificada</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard label="Receitas" value={fmt(data.receitas)} color="text-green-400" />
        <MetricCard label="Despesas" value={fmt(data.despesas)} color="text-red-400" />
        <MetricCard label="Saldo" value={fmt(data.saldo)} />
        <MetricCard label="Transações" value={data.transacoes} />
      </div>

      {/* Score preview */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-4 flex items-center gap-4">
        <div>
          <p className="text-[38px] font-semibold text-green-500 leading-none">{data.score}</p>
          <p className="text-[11px] text-[#444] mt-1">Score estimado</p>
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] text-[#555]">Score Financeiro</span>
            <span className="text-[12px] text-green-400">Bom</span>
          </div>
          <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-1000"
              style={{ width: `${(data.score / 1000) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#333]">0</span>
            <span className="text-[10px] text-[#333]">1000</span>
          </div>
        </div>
      </div>

      {/* Detected items */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Assinaturas", value: data.assinaturas },
          { label: "Recorrências", value: data.recorrencias },
          { label: "Salário", value: fmt(data.salario) },
        ].map((item) => (
          <div key={item.label} className="bg-[#111] border border-[#1E1E1E] rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-[#F5F5F0]">{item.value}</p>
            <p className="text-[11px] text-[#444] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Categorias detectadas</p>
        <div className="flex flex-wrap gap-1.5">
          {data.categorias.map((cat) => (
            <div key={cat.nome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#111] border border-[#1E1E1E] rounded-lg">
              <span className="text-sm">{cat.emoji}</span>
              <span className="text-[12px] text-[#888]">{cat.nome}</span>
              <span className="text-[12px] text-[#444]">{fmt(cat.valor)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction preview */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Prévia das transações</p>
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-4">
          {data.transacoes_preview.map((tx, i) => (
            <TxRow key={i} {...tx} />
          ))}
          <p className="text-[12px] text-[#333] py-3">+ {data.transacoes - data.transacoes_preview.length} transações</p>
        </div>
      </div>

      {/* AI confidence */}
      <ConfidenceBar value={data.confiancaIA} />

      {/* Actions */}
      <div className="flex gap-2.5 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-[14px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] hover:text-[#888] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-[2] py-2.5 text-[14px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
        >
          Confirmar importação
        </button>
      </div>
    </div>
  );
}

// ─── ESTADO: SUCESSO ──────────────────────────────────────────────────────────
function SuccessState({ data, onDashboard, onNewImport }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center min-h-[500px]">
      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-600/30 flex items-center justify-center">
        <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12.75l6 6 9-13.5"
            strokeDasharray="100" strokeDashoffset="100"
            style={{ animation: "check 0.5s ease-out 0.1s forwards" }} />
        </svg>
        <style>{`@keyframes check { to { stroke-dashoffset: 0; } }`}</style>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[#F5F5F0] mb-2">Importação concluída</h2>
        <p className="text-[14px] text-[#555] max-w-xs leading-relaxed">
          {data.transacoes} transações organizadas automaticamente. Dashboard atualizado.
        </p>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          `${data.transacoes} transações`,
          `${data.categorias.length} categorias`,
          `${data.recorrencias} recorrências`,
          `${data.assinaturas} assinaturas`,
        ].map((chip) => (
          <span key={chip} className="px-3 py-1.5 bg-[#111] border border-[#1E1E1E] rounded-full text-[12px] text-[#666]">
            {chip}
          </span>
        ))}
      </div>

      {/* Score bump */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-8 py-4">
        <p className="text-[11px] text-[#333] mb-2">Score atualizado</p>
        <div className="flex items-center gap-3 justify-center">
          <span className="text-base text-[#444]">{data.scorePrevio}</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className="text-3xl font-semibold text-green-500">{data.score}</span>
          <span className="text-[13px] text-green-500">+{data.score - data.scorePrevio}</span>
        </div>
      </div>

      {/* Import history */}
      <div className="w-full max-w-xs text-left">
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Histórico</p>
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A]">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#888] truncate">{data.filename}</p>
              <p className="text-[11px] text-[#333]">{data.transacoes} transações · agora mesmo</p>
            </div>
            <button className="text-[11px] text-[#333] border border-[#222] rounded px-2 py-0.5">
              Apagar
            </button>
          </div>
          {HISTORY_MOCK.map((item) => (
            <div key={item.nome} className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] last:border-0">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#555] truncate">{item.nome}</p>
                <p className="text-[11px] text-[#333]">{item.transacoes} transações · {item.data}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
  );
}

// ─── ESTADO: ERRO ──────────────────────────────────────────────────────────────
function ErrorState({ onRetry, onCancel, errorType = "format" }) {
  const errors = {
    format: {
      title: "Não conseguimos ler este arquivo",
      desc: "O formato parece diferente do esperado.",
      detail: "PDFs não são suportados. Use CSV, OFX ou XLSX do seu banco.",
      badge: "PDF não suportado",
    },
    insufficient: {
      title: "Dados insuficientes",
      desc: "O arquivo tem transações demais para analisar com confiança.",
      detail: "Exporte apenas os últimos 3 meses para melhores resultados.",
      badge: "Dados insuficientes",
    },
    corrupt: {
      title: "Arquivo corrompido",
      desc: "Não foi possível abrir o arquivo.",
      detail: "Tente exportar novamente do banco. Verifique se o download foi completo.",
      badge: "Arquivo inválido",
    },
  };

  const err = errors[errorType] || errors.format;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center min-h-[500px]">
      <div className="w-16 h-16 rounded-full bg-red-900/10 border border-red-600/20 flex items-center justify-center">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[#F5F5F0] mb-2">{err.title}</h2>
        <p className="text-[14px] text-[#555] max-w-xs leading-relaxed">{err.desc}</p>
      </div>

      {/* Error detail */}
      <div className="bg-[#0D0D0D] border border-red-900/20 rounded-xl p-4 w-full max-w-sm text-left">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-[13px] text-[#666]">arquivo.pdf</span>
          <Badge variant="red">{err.badge}</Badge>
        </div>
        <p className="text-[12px] text-[#444]">{err.detail}</p>
      </div>

      {/* Suggestions */}
      <div className="w-full max-w-sm text-left">
        <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Sugestões</p>
        <div className="flex flex-col gap-2">
          {[
            ["Exporte como CSV no app do banco", "ti-file-spreadsheet"],
            ["Baixe o arquivo OFX no internet banking", "ti-download"],
            ["Ver guia completo de exportação por banco", "ti-help"],
          ].map(([text]) => (
            <div key={text} className="flex items-center gap-3 p-3 bg-[#111] border border-[#1E1E1E] rounded-lg">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <span className="text-[13px] text-[#666]">{text}</span>
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
        <button
          onClick={onRetry}
          className="px-6 py-2.5 text-[14px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Tentar outro arquivo
        </button>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ImportPage() {
  const [state, setState] = useState("empty");
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setState("processing");

    // Simular processamento — substituir por chamada real ao backend
    setTimeout(() => setState("preview"), 5000);
  };

  const handleConfirm = async () => {
    // TODO: salvar no Supabase
    // await supabase.from('transacoes').insert(MOCK_RESULT.transacoes_preview);
    setState("success");
  };

  const handleError = () => setState("error");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-[#333] mb-6">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-[#555]">Importação</span>
        </div>

        {/* Page header */}
        {state === "empty" || state === "upload" ? (
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[#F5F5F0] mb-1">Importação financeira</h1>
            <p className="text-[14px] text-[#444]">
              Conecte seu histórico sem precisar do Open Finance
            </p>
          </div>
        ) : null}

        {/* State renderer */}
        <div className="flex flex-col">
          {state === "empty" && (
            <EmptyState onStart={() => setState("upload")} />
          )}
          {state === "upload" && (
            <UploadState
              onFileSelected={handleFileSelected}
              onCancel={() => setState("empty")}
            />
          )}
          {state === "processing" && (
            <ProcessingState
              filename={selectedFile?.name || "extrato.csv"}
              onSkip={() => setState("preview")}
            />
          )}
          {state === "preview" && (
            <PreviewState
              data={MOCK_RESULT}
              onConfirm={handleConfirm}
              onCancel={() => setState("upload")}
            />
          )}
          {state === "success" && (
            <SuccessState
              data={MOCK_RESULT}
              onDashboard={() => { /* navigate('/dashboard') */ }}
              onNewImport={() => setState("upload")}
            />
          )}
          {state === "error" && (
            <ErrorState
              onRetry={() => setState("upload")}
              onCancel={() => setState("empty")}
              errorType="format"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * NOTAS PARA CODEX:
 *
 * 1. Importar fontes no index.html:
 *    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
 *
 * 2. O handleFileSelected deve chamar o backend real para processar o arquivo.
 *    Sugestão: enviar via FormData para uma Edge Function do Supabase.
 *
 * 3. O handleConfirm deve persistir as transações via:
 *    supabase.from('transacoes').insert(transacoes)
 *    supabase.from('profiles').update({ score: novoScore }).eq('id', userId)
 *    supabase.from('relatorios').insert({ ... })
 *
 * 4. Integrar roteamento:
 *    onDashboard: navigate('/dashboard')
 *    onCancel em UploadState: navigate(-1)
 *
 * 5. Estados 'processing' real: usar React Query mutation + WebSocket ou polling
 *    para receber updates do backend enquanto processa.
 *
 * 6. O componente foi construído com zero dependências externas além do React.
 *    Tailwind classes seguem o padrão do projeto.
 */
