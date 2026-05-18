import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useOutletContext } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency } from "../../../lib/format"
import { getUserCyclesSnapshots } from "../../../lib/queries"
import { getCurrentCycleRange } from "../../../lib/financial-cycle"
import { getUserFinancialSettings } from "../../../lib/queries/financial-settings"
import { ensureActiveCycle, resetCycle, type ResetType } from "../../../lib/queries/cycles"
import type { FinancialCycle } from "../../../lib/types"
import type { AppOutletContext } from "../../../app/components/Layout"
import { PanelLoader } from "../../components/PanelLoader"
import { ResetCycleModal } from "../../../app/components/dashboard/ResetCycleModal"

function fmtRange(inicio: string, fim: string) {
  try {
    const a = new Date(inicio + "T00:00:00")
    const b = new Date(fim + "T00:00:00")
    const fa = a.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    const fb = b.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    return `${fa} → ${fb}`
  } catch {
    return `${inicio} → ${fim}`
  }
}

export default function CiclosPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()
  const { syncNonce, requestSync } = useOutletContext<AppOutletContext>()
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState<Array<Awaited<ReturnType<typeof getUserCyclesSnapshots>>[number]>>([])
  const [activeCycle, setActiveCycle] = useState<FinancialCycle | null>(null)
  const [showReset, setShowReset] = useState(false)

  const fmt = (v: number) => formatCurrency(v, lang, currency)

  useEffect(() => {
    if (!user) return
    let ignore = false
    setLoading(true)
    getUserCyclesSnapshots(user.id, 8)
      .then((rows) => {
        if (ignore) return
        setCycles(rows || [])
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    ;(async () => {
      try {
        const settings = await getUserFinancialSettings(user.id)
        const { inicio, fim } = getCurrentCycleRange({ cycle_start_day: settings.cycle_start_day })
        const cycle = await ensureActiveCycle(user.id, inicio, fim)
        if (ignore) return
        setActiveCycle(cycle ?? null)
      } catch {
        if (ignore) return
        setActiveCycle(null)
      }
    })()

    return () => {
      ignore = true
    }
  }, [user?.id, syncNonce])

  const top = useMemo(() => cycles.slice(-6).reverse(), [cycles])

  if (!user) return null
  if (loading) return <PanelLoader />

  const onConfirmReset = async (resetType: ResetType) => {
    if (!user || !activeCycle) return
    const res = await resetCycle(user.id, activeCycle.id, resetType)
    toast.success("Ciclo resetado", {
      description: `${res.affectedTransactions} transações removidas · ${res.affectedImports} importações afetadas`,
    })
    setShowReset(false)
    requestSync()
  }

  return (
    <div className="ofx-cycles">
      <div className="page">
        <div className="page-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div className="page-title">Ciclos recentes</div>
            <div className="page-sub">Resumo do ciclo atual e dos últimos ciclos (baseado no seu dia de pagamento).</div>
          </div>
          {activeCycle ? (
            <button className="card-action" type="button" onClick={() => setShowReset(true)}>
              Resetar ciclo
            </button>
          ) : null}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Últimos ciclos
            </div>
            <Link className="card-action" to="/app/transacoes">
              Ver transações →
            </Link>
          </div>

          <div className="card-body">
            {top.length === 0 ? (
              <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                Sem dados suficientes para mostrar ciclos. Importe um extrato ou registre transações.
              </div>
            ) : (
              <div className="cycle-list">
                {top.map((c) => {
                  const saldo = Number(c.totals.saldo) || 0
                  const econPct = Number(c.totals.economiaPct) || 0
                  return (
                    <div key={c.inicio + c.fim} className="cycle-item">
                      <div className="cycle-main">
                        <div className="cycle-title">
                          <span className="cycle-label">{(c.label || "Ciclo").toString().replace(".", "")}</span>
                          <span className="cycle-range">{fmtRange(c.inicio, c.fim)}</span>
                        </div>
                        <div className="cycle-meta">
                          <span className="pill">{c.totals.origem === "misto" ? "Manual + import" : c.totals.origem === "importado" ? "Import" : c.totals.origem === "manual" ? "Manual" : "Vazio"}</span>
                          <span className="pill">{c.totals.transacoes} transações</span>
                          <span className="pill">Economia {Math.round(econPct)}%</span>
                          <span className="pill">Score {c.score.score}</span>
                        </div>
                      </div>

                      <div className="cycle-right">
                        <div className={["cycle-saldo", saldo >= 0 ? "pos" : "neg"].join(" ")}>
                          {fmt(saldo)}
                        </div>
                        <div className="cycle-breakdown">
                          <span style={{ color: "#22C55E" }}>+{fmt(c.totals.renda)}</span>
                          <span style={{ color: "#EF4444" }}>−{fmt(c.totals.gastos)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {showReset && activeCycle ? (
          <ResetCycleModal
            cycle={activeCycle}
            onClose={() => setShowReset(false)}
            onConfirm={onConfirmReset}
          />
        ) : null}
      </div>
    </div>
  )
}
