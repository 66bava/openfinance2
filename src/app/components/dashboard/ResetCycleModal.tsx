import { useState } from "react"
import { X, AlertTriangle, CheckCircle2, Trash2, FileX, FileCheck } from "lucide-react"
import type { FinancialCycle } from "../../../lib/types"
import type { ResetType } from "../../../lib/queries/cycles"
import { formatCurrency } from "../../../lib/format"

interface Props {
  cycle: FinancialCycle
  onClose: () => void
  onConfirm: (resetType: ResetType) => Promise<void>
}

type Step = "select" | "confirm" | "done"

const RESET_OPTIONS: Array<{
  type: ResetType
  label: string
  description: string
  detail: string
  icon: React.ReactNode
  danger: boolean
}> = [
  {
    type: "imports_only",
    label: "Remover apenas importações",
    description: "Apaga transações importadas do ciclo atual.",
    detail: "Transações manuais são preservadas. Importações anteriores serão marcadas como removidas.",
    icon: <FileX size={18} className="text-amber-400" />,
    danger: false,
  },
  {
    type: "imports_keep_manual",
    label: "Importadas, manter manuais",
    description: "Remove transações com import_id. Transações digitadas manualmente ficam.",
    detail: "Útil para reimportar extrato sem perder lançamentos feitos à mão.",
    icon: <FileCheck size={18} className="text-blue-400" />,
    danger: false,
  },
  {
    type: "all_transactions",
    label: "Remover todas as transações",
    description: "Apaga todas as transações do ciclo atual.",
    detail: "Inclui manuais e importadas. O saldo inicial herdado do ciclo anterior é mantido.",
    icon: <Trash2 size={18} className="text-red-400" />,
    danger: true,
  },
]

export function ResetCycleModal({ cycle, onClose, onConfirm }: Props) {
  const [step, setStep] = useState<Step>("select")
  const [selected, setSelected] = useState<ResetType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedOption = RESET_OPTIONS.find((o) => o.type === selected)

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(selected)
      setStep("done")
    } catch (e: any) {
      setError(e?.message ?? "Erro ao resetar ciclo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-900/20 border border-amber-600/30 flex items-center justify-center">
              <AlertTriangle size={14} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F5F5F0]">Resetar ciclo</h2>
              <p className="text-[11px] text-[#555]">
                {cycle.start_date} → {cycle.end_date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors"
          >
            <X size={16} className="text-[#555]" />
          </button>
        </div>

        {/* Step: Selecionar tipo */}
        {step === "select" && (
          <div className="px-5 py-4 space-y-3">
            {/* O que SEMPRE é preservado */}
            <div className="bg-[#0A0A0A] border border-green-900/20 rounded-xl p-3 space-y-1.5">
              <p className="text-[11px] text-green-600 font-medium uppercase tracking-wider mb-2">
                Sempre preservado
              </p>
              {[
                `Saldo herdado do ciclo anterior: ${formatCurrency(cycle.opening_balance)}`,
                "Histórico de ciclos anteriores",
                "Regras de categorização aprendidas",
                "Score dos ciclos anteriores",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={11} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-[12px] text-[#555]">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-[12px] text-[#444]">Escolha o que remover do ciclo atual:</p>

            {RESET_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected === opt.type
                    ? opt.danger
                      ? "border-red-600/50 bg-red-900/10"
                      : "border-green-700/50 bg-green-900/10"
                    : "border-[#1E1E1E] bg-[#0D0D0D] hover:border-[#2A2A2A]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] font-medium mb-0.5 ${
                        opt.danger ? "text-red-300" : "text-[#D0D0D0]"
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[12px] text-[#555]">{opt.description}</p>
                    {selected === opt.type && (
                      <p className="text-[11px] text-[#444] mt-1.5 leading-relaxed">{opt.detail}</p>
                    )}
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${
                      selected === opt.type
                        ? opt.danger
                          ? "border-red-500 bg-red-500"
                          : "border-green-500 bg-green-500"
                        : "border-[#333]"
                    }`}
                  />
                </div>
              </button>
            ))}

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-[13px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => selected && setStep("confirm")}
                disabled={!selected}
                className="flex-[2] py-2.5 text-[13px] font-medium text-white bg-amber-700 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-30"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirmação */}
        {step === "confirm" && selectedOption && (
          <div className="px-5 py-4 space-y-3">
            <div className="bg-[#0A0A0A] border border-amber-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {selectedOption.icon}
                <p className="text-[13px] font-medium text-[#D0D0D0]">{selectedOption.label}</p>
              </div>
              <p className="text-[12px] text-[#555] leading-relaxed">{selectedOption.detail}</p>
            </div>

            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-[#333] mb-2">Após o reset</p>
              {[
                "Transações removidas conforme a opção escolhida",
                "Score do ciclo será recalculado",
                "Cache e queries serão invalidados",
                "Dashboard será atualizado",
                `Saldo inicial de ${formatCurrency(cycle.opening_balance)} permanece`,
                "Nova importação pode ser feita sem duplicatas",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-[#444] mt-0.5 flex-shrink-0">›</span>
                  <span className="text-[12px] text-[#555]">{item}</span>
                </div>
              ))}
            </div>

            {selectedOption.danger && (
              <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-3">
                <p className="text-[12px] text-red-400 font-medium mb-1">Atenção: ação irreversível</p>
                <p className="text-[11px] text-red-400/70">
                  Todas as transações do ciclo serão removidas permanentemente. Esta ação não pode ser desfeita.
                </p>
              </div>
            )}

            {error && (
              <p className="text-[12px] text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setStep("select")}
                disabled={loading}
                className="flex-1 py-2.5 text-[13px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors disabled:opacity-40"
              >
                ← Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-[2] py-2.5 text-[13px] font-medium text-white rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2 ${
                  selectedOption.danger
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-amber-700 hover:bg-amber-600"
                }`}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : null}
                {loading ? "Resetando..." : "Confirmar reset"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Concluído */}
        {step === "done" && (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-900/20 border border-green-600/30 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#F5F5F0] mb-1">Ciclo resetado</h3>
              <p className="text-[12px] text-[#555] leading-relaxed max-w-xs">
                Dados removidos conforme a opção escolhida.{" "}
                {selectedOption?.label} executado com sucesso. Saldo inicial mantido.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-[13px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
