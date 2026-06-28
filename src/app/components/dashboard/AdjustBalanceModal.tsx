import { useMemo, useState } from "react"
import { X, CheckCircle2, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react"
import type { Lang } from "../../../lib/i18n"
import { formatCurrency } from "../../../lib/format"

interface Props {
  lang: Lang
  currency?: string | null
  currentBalance: number
  initialTargetBalance?: number | null
  initialReason?: string | null
  onClose: () => void
  onConfirm: (input: { targetBalance: number; reason: string }) => Promise<void>
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "")
}

function formatBRLInput(value: string) {
  const digits = onlyDigits(value)
  if (!digits) return ""
  const n = Number.parseInt(digits, 10) / 100
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseBRLInput(formatted: string): number {
  if (!formatted) return 0
  const normalized = formatted.replace(/\./g, "").replace(",", ".")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export function AdjustBalanceModal({
  lang,
  currency,
  currentBalance,
  initialTargetBalance,
  initialReason,
  onClose,
  onConfirm,
}: Props) {
  const [targetRaw, setTargetRaw] = useState(() =>
    formatBRLInput(String(Math.round(Number(initialTargetBalance ?? currentBalance) * 100))),
  )
  const [reason, setReason] = useState(() => String(initialReason ?? ""))
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = useMemo(() => parseBRLInput(targetRaw), [targetRaw])
  const delta = useMemo(() => target - (Number(currentBalance) || 0), [target, currentBalance])
  const deltaAbs = Math.round(Math.abs(delta) * 100) / 100
  const fmt = useMemo(() => (v: number) => formatCurrency(v, lang, currency || "BRL"), [lang, currency])

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm({ targetBalance: target, reason: reason.trim() })
      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? "Erro ao ajustar saldo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#0C0C0C] border border-white/[0.06] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 -4px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        {done ? (
          <div className="px-8 pt-10 pb-10 flex flex-col items-center text-center gap-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.2)" }}
            >
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#F0F0F0] mb-1.5">Saldo ajustado</h3>
              <p className="text-sm text-[#666] leading-relaxed max-w-xs">
                O ajuste foi registrado e o dashboard vai refletir o novo saldo.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ background: "#16A34A" }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-1">Ajuste de saldo</p>
                <h2 className="text-[17px] font-semibold text-[#EEEDE6]">Qual é o saldo real?</h2>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-[#888] hover:bg-white/5 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-6 pb-6 pt-5 flex flex-col gap-5">
              {/* Current balance context */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-sm text-[#555]">Saldo atual</span>
                <span className="text-sm font-semibold text-[#888] tabular-nums">{fmt(Number(currentBalance) || 0)}</span>
              </div>

              {/* Main input - the hero */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-2.5 tracking-wide">Novo saldo</label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                    style={{ color: "#444" }}
                  >
                    R$
                  </span>
                  <input
                    value={targetRaw}
                    onChange={(e) => setTargetRaw(formatBRLInput(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-xl pl-10 pr-4 py-4 text-2xl font-bold tabular-nums outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#EEEDE6",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(22,163,74,0.5)"
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                    }}
                  />
                </div>

                {/* Delta pill */}
                {deltaAbs >= 0.01 && (
                  <div className="flex items-center gap-2 mt-2.5 px-1">
                    {delta >= 0 ? (
                      <ArrowUp size={12} className="text-green-500 shrink-0" />
                    ) : (
                      <ArrowDown size={12} className="text-red-500 shrink-0" />
                    )}
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: delta >= 0 ? "#22C55E" : "#EF4444" }}
                    >
                      {delta >= 0 ? "+" : "−"}{fmt(deltaAbs)}
                    </span>
                    <span className="text-xs text-[#555]">
                      {delta >= 0 ? "vai ser adicionado" : "vai ser removido"}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-2.5 tracking-wide">
                  Motivo <span className="text-[#383838]">(opcional)</span>
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: saldo do extrato bancário..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#AAAA9E",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleConfirm}
                  disabled={loading || !Number.isFinite(target) || deltaAbs < 0.01}
                  className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-25 flex items-center justify-center gap-2"
                  style={{ background: "#16A34A" }}
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  {loading ? "Salvando..." : "Confirmar ajuste"}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full py-3 text-sm text-[#444] hover:text-[#666] transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
