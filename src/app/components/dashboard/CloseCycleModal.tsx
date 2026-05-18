import { useState } from "react"
import { X, TrendingUp, TrendingDown, Wallet, ChevronRight } from "lucide-react"
import { formatCurrency } from "../../../lib/format"
import type { FinancialCycle } from "../../../lib/types"

interface Props {
  cycle: FinancialCycle
  incomeTotal: number
  expenseTotal: number
  investmentTotal: number
  scoreSnapshot: number
  nextStartDate: string
  nextEndDate: string
  onClose: () => void
  onConfirm: (closingBalanceOverride?: number) => Promise<void>
}

export function CloseCycleModal({
  cycle,
  incomeTotal,
  expenseTotal,
  investmentTotal,
  scoreSnapshot,
  nextStartDate,
  onClose,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customBalance, setCustomBalance] = useState("")
  const [useCustomBalance, setUseCustomBalance] = useState(false)

  const calculatedClosing = cycle.opening_balance + incomeTotal - expenseTotal
  const economy = incomeTotal > 0 ? ((incomeTotal - expenseTotal) / incomeTotal) * 100 : 0

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const override =
        useCustomBalance && customBalance !== ""
          ? parseFloat(customBalance.replace(",", "."))
          : undefined
      await onConfirm(override)
    } catch (e: any) {
      setError(e?.message ?? "Erro ao fechar ciclo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1A1A1A]">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F0]">Fechar ciclo</h2>
            <p className="text-[12px] text-[#555] mt-0.5">
              {cycle.start_date} → {cycle.end_date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors"
          >
            <X size={16} className="text-[#555]" />
          </button>
        </div>

        {/* Resumo */}
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3">
              <p className="text-[11px] text-[#444] mb-1">Saldo inicial</p>
              <p className="text-base font-semibold text-[#F5F5F0]">
                {formatCurrency(cycle.opening_balance)}
              </p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3">
              <p className="text-[11px] text-[#444] mb-1">Score</p>
              <p className="text-base font-semibold text-green-400">{scoreSnapshot}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={11} className="text-green-500" />
                <span className="text-[10px] text-[#444]">Receitas</span>
              </div>
              <p className="text-[13px] font-medium text-green-400">{formatCurrency(incomeTotal)}</p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown size={11} className="text-red-400" />
                <span className="text-[10px] text-[#444]">Despesas</span>
              </div>
              <p className="text-[13px] font-medium text-red-400">{formatCurrency(expenseTotal)}</p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <Wallet size={11} className="text-blue-400" />
                <span className="text-[10px] text-[#444]">Invest.</span>
              </div>
              <p className="text-[13px] font-medium text-[#F5F5F0]">{formatCurrency(investmentTotal)}</p>
            </div>
          </div>

          {/* Saldo calculado */}
          <div className="bg-[#0A0A0A] border border-green-900/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[#555]">Saldo calculado para fechar</span>
              <span className={`text-lg font-semibold ${calculatedClosing >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatCurrency(calculatedClosing)}
              </span>
            </div>
            <p className="text-[11px] text-[#333]">
              {formatCurrency(cycle.opening_balance)} + {formatCurrency(incomeTotal)} − {formatCurrency(expenseTotal)} ={" "}
              {formatCurrency(calculatedClosing)}
            </p>
            {economy > 0 && (
              <p className="text-[11px] text-green-500 mt-1">
                Economia: {economy.toFixed(1)}% da renda
              </p>
            )}
          </div>

          {/* Saldo customizado (extrato real) */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={useCustomBalance}
                onChange={(e) => setUseCustomBalance(e.target.checked)}
                className="accent-green-600"
              />
              <span className="text-[12px] text-[#666]">
                Usar saldo real do extrato (diferente do calculado)
              </span>
            </label>
            {useCustomBalance && (
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 1350.00"
                value={customBalance}
                onChange={(e) => setCustomBalance(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-[13px] text-[#F5F5F0] outline-none focus:border-green-700"
              />
            )}
          </div>

          {/* O que acontece */}
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-[#333] mb-2">O que vai acontecer</p>
            {[
              "Ciclo atual será marcado como fechado",
              `Saldo de ${formatCurrency(useCustomBalance && customBalance ? parseFloat(customBalance.replace(",", ".")) || calculatedClosing : calculatedClosing)} será carregado para o próximo ciclo`,
              `Próximo ciclo inicia em ${nextStartDate}`,
              "Histórico do ciclo atual será preservado",
              "Score snapshot será salvo",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <ChevronRight size={11} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-[12px] text-[#555]">{item}</span>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-[13px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-[2] py-2.5 text-[13px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : null}
            {loading ? "Fechando..." : "Confirmar fechamento"}
          </button>
        </div>
      </div>
    </div>
  )
}
