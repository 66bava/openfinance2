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
import { deleteCycle, ensureActiveCycle, resetCycle, type ResetType } from "../../../lib/queries/cycles"
import type { FinancialCycle } from "../../../lib/types"
import type { AppOutletContext } from "../../../app/components/Layout"
import { PanelLoader } from "../../components/PanelLoader"
import { ResetCycleModal } from "../../../app/components/dashboard/ResetCycleModal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../app/components/ui/alert-dialog"

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
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<null | { id: string; label: string; inicio: string; fim: string }>(null)

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

  const onConfirmDelete = async () => {
    if (!user || !deleteTarget) return
    setDeleting(true)
    try {
      const res = await deleteCycle(user.id, deleteTarget.id)
      toast.success("Ciclo apagado", { description: `${res.deletedTransactions} transações removidas e saldo recalculado.` })
      setDeleteTarget(null)
      requestSync()
    } catch (e: any) {
      toast.error("Não foi possível apagar o ciclo", { description: String(e?.message || "").slice(0, 140) })
    } finally {
      setDeleting(false)
    }
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
                  const canDelete = Boolean((c as any).id) && String((c as any).status || "") !== "active"
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
                        {canDelete ? (
                          <button
                            type="button"
                            className="card-action"
                            style={{ marginTop: 10, justifyContent: "center" }}
                            onClick={() =>
                              setDeleteTarget({
                                id: String((c as any).id),
                                label: String(c.label || "Ciclo"),
                                inicio: c.inicio,
                                fim: c.fim,
                              })
                            }
                          >
                            Apagar ciclo
                          </button>
                        ) : null}
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

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
          <AlertDialogContent className="border" style={{ background: "var(--bg-c)", borderColor: "var(--bd)", color: "var(--t1)" }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar ciclo</AlertDialogTitle>
              <AlertDialogDescription style={{ color: "var(--t3)" }}>
                Isso apaga definitivamente as transações e importações do período {deleteTarget?.inicio} → {deleteTarget?.fim}. Não é possível desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border" style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="border"
                disabled={deleting}
                style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
                onClick={() => void onConfirmDelete()}
              >
                {deleting ? "Apagando..." : "Apagar agora"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
