import { useEffect, useMemo, useState } from "react"
import { Link, useOutletContext, useSearchParams } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency, formatDate } from "../../../lib/format"
import type { Categoria, MetodoPagamento, Transacao } from "../../../lib/types"
import type { AppOutletContext } from "../../../app/components/Layout"
import {
  deleteTransacao,
  getCategoriasForUser,
  getTransacaoById,
  getTransacoesAll,
  getTransacoesMes,
  getTransacoesPeriodo,
  updateTransacao,
} from "../../../lib/queries"
import { logAudit } from "../../../lib/audit"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../app/components/ui/dialog"

function startOfTodayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function addDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
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

function methodLabel(m: MetodoPagamento | null | undefined) {
  if (!m) return "—"
  if (m === "credito") return "Crédito"
  if (m === "debito") return "Débito"
  if (m === "pix") return "Pix"
  if (m === "dinheiro") return "Dinheiro"
  if (m === "transferencia") return "TED"
  if (m === "boleto") return "Boleto"
  if (m === "debito_automatico") return "Débito"
  if (m === "outro") return "Outro"
  return String(m)
}

type RangeMode = "ciclo" | "90d" | "12m" | "tudo"

export default function TransacoesPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency, dateLocale } = useUserSettings()
  const { syncNonce, search } = useOutletContext<AppOutletContext>()
  const [params, setParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<RangeMode>("ciclo")
  const [tx, setTx] = useState<Transacao[]>([])

  const [cats, setCats] = useState<Categoria[]>([])
  const [catsLoading, setCatsLoading] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const editId = params.get("edit")
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Transacao | null>(null)
  const [saving, setSaving] = useState(false)
  const [editDescricao, setEditDescricao] = useState("")
  const [editValorRaw, setEditValorRaw] = useState("")
  const [editData, setEditData] = useState(startOfTodayISO())
  const [editTipo, setEditTipo] = useState<"receita" | "despesa">("despesa")
  const [editCategoriaId, setEditCategoriaId] = useState<string>("")
  const [editMetodo, setEditMetodo] = useState<MetodoPagamento | null>(null)

  const fmt = (v: number) => formatCurrency(v, lang, currency)

  function fmtTxDate(dateISO: string) {
    try {
      const d = new Date(String(dateISO || "").slice(0, 10) + "T00:00:00")
      return d.toLocaleDateString(dateLocale || "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    } catch {
      return formatDate(dateISO, lang)
    }
  }

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase()
    if (!q) return tx
    return tx.filter((t) => {
      const desc = String(t.descricao || "").toLowerCase()
      const cat = String((t as any).categorias?.nome || "").toLowerCase()
      return desc.includes(q) || cat.includes(q)
    })
  }, [tx, search])

  const catsByTipo = useMemo(() => {
    return cats.filter((c) => c.tipo === editTipo)
  }, [cats, editTipo])

  useEffect(() => {
    if (!user) return
    setCatsLoading(true)
    getCategoriasForUser(user.id, { tipo: "all" })
      .then((rows) => setCats(rows))
      .finally(() => setCatsLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    let ignore = false
    setLoading(true)
    const userId = user.id

    async function run() {
      if (mode === "ciclo") return await getTransacoesMes(userId)
      if (mode === "tudo") return await getTransacoesAll(userId, { limit: 2000 })
      const end = startOfTodayISO()
      const start = mode === "90d" ? addDaysISO(-90) : addDaysISO(-365)
      return await getTransacoesPeriodo(userId, start, end)
    }

    run()
      .then((rows) => {
        if (ignore) return
        setTx((rows as any) || [])
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user?.id, mode, syncNonce])

  useEffect(() => {
    if (!user) return
    if (!editId) {
      setEditOpen(false)
      setEditing(null)
      return
    }

    const local = tx.find((t) => t.id === editId) ?? null
    if (local) {
      setEditing(local)
      setEditOpen(true)
      return
    }

    getTransacaoById(user.id, editId).then((row) => {
      if (row) {
        setEditing(row)
        setEditOpen(true)
      } else {
        const next = new URLSearchParams(params)
        next.delete("edit")
        setParams(next, { replace: true })
      }
    })
  }, [user?.id, editId, tx])

  useEffect(() => {
    if (!editing) return
    setEditDescricao(editing.descricao || "")
    setEditValorRaw(formatBRLInput(String(Math.round((Number(editing.valor || 0) || 0) * 100))))
    setEditData((editing.data || startOfTodayISO()).slice(0, 10))
    setEditTipo(editing.tipo)
    setEditCategoriaId(editing.categoria_id || "")
    setEditMetodo((editing.metodo_pagamento as any) ?? null)
  }, [editing?.id])

  async function doDelete(id: string) {
    if (!user) return
    setDeletingId(id)
    try {
      await deleteTransacao(id)
      setTx((prev) => prev.filter((t) => t.id !== id))
      await logAudit(user.id, "transacao_delete", { id }).catch(() => {})
      toast.success("Transação removida.")
    } catch {
      toast.error("Não foi possível remover a transação. Verifique suas permissões (RLS) e tente novamente.")
    } finally {
      setDeletingId(null)
      setDeleteId(null)
    }
  }

  async function doSave() {
    if (!user) return
    if (!editing) return
    if (saving) return

    const descricao = editDescricao.trim()
    const valor = parseBRLInput(editValorRaw)
    if (!descricao) {
      toast.error("Informe a descrição.")
      return
    }
    if (!(valor > 0)) {
      toast.error("Informe um valor válido.")
      return
    }
    if (!editData) {
      toast.error("Informe a data.")
      return
    }
    if (!editCategoriaId) {
      toast.error("Selecione a categoria.")
      return
    }

    setSaving(true)
    try {
      const updated = await updateTransacao(user.id, editing.id, {
        descricao,
        valor,
        data: editData,
        tipo: editTipo,
        categoria_id: editCategoriaId,
        metodo_pagamento: editMetodo,
      })
      setTx((prev) => prev.map((t) => (t.id === updated.id ? (updated as any) : t)))
      setEditing(updated as any)
      await logAudit(user.id, "transacao_update", { id: editing.id }).catch(() => {})
      toast.success("Transação atualizada.")

      const next = new URLSearchParams(params)
      next.delete("edit")
      setParams(next, { replace: true })
      setEditOpen(false)
    } catch {
      toast.error("Não foi possível salvar. Verifique suas permissões (RLS) e tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  function closeEdit() {
    const next = new URLSearchParams(params)
    next.delete("edit")
    setParams(next, { replace: true })
    setEditOpen(false)
    setEditing(null)
  }

  if (!user) return null

  return (
    <div className="ofx-transacoes">
      <div className="page">
        <div className="page-header">
          <div className="page-title">Transações</div>
          <div className="page-sub">Veja, edite ou remova suas transações.</div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Lista
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="range-tabs" role="tablist" aria-label="Período">
                {([
                  { key: "ciclo", label: "Ciclo" },
                  { key: "90d", label: "90d" },
                  { key: "12m", label: "12m" },
                  { key: "tudo", label: "Tudo" },
                ] as const).map((r) => {
                  const active = mode === r.key
                  return (
                    <button
                      key={r.key}
                      type="button"
                      className={["range-tab", active ? "active" : ""].filter(Boolean).join(" ")}
                      onClick={() => setMode(r.key)}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
              <Link className="card-action" to="/app/adicionar">
                Novo registro →
              </Link>
            </div>
          </div>

          <div className="card-body">
            {loading ? (
              <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>Carregando…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                Nenhuma transação encontrada para este período{search ? " (com o filtro atual)" : ""}.
              </div>
            ) : (
              <div className="tx-list">
                {filtered.map((t) => {
                  const catName = ((t as any).categorias?.nome as string | undefined) || (t.tipo === "receita" ? "Receita" : "Despesa")
                  const icon = ((t as any).categorias?.emoji || (t as any).categorias?.icone || "🧾") as string
                  const bg = t.tipo === "receita" ? "rgba(22,163,74,.12)" : "rgba(239,68,68,.12)"
                  const deleting = deletingId === t.id
                  return (
                    <div key={t.id} className="tx-row">
                      <div className="tx-icon" style={{ background: bg }}>
                        {icon}
                      </div>
                      <div className="tx-info">
                        <div className="tx-name">{t.descricao || "—"}</div>
                        <div className="tx-meta">
                          {fmtTxDate(t.data)} · {catName} · {methodLabel(t.metodo_pagamento as any)}
                        </div>
                      </div>
                      <div className="tx-right">
                        <div className={["tx-amount", t.tipo === "receita" ? "pos" : "neg"].join(" ")}>
                          {t.tipo === "receita" ? "+" : "−"}
                          {fmt(Math.abs(Number(t.valor) || 0))}
                        </div>
                        <div className="tx-actions">
                          <Link className="tx-link" to={`/app/transacoes?edit=${encodeURIComponent(t.id)}`}>
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="tx-danger"
                            onClick={() => setDeleteId(t.id)}
                            disabled={deleting}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent className="border" style={{ background: "var(--bg-c)", borderColor: "var(--bd)", color: "var(--t1)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover transação</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--t3)" }}>
              Isso remove a transação selecionada. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border" style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="border"
              style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
              onClick={() => { if (deleteId) void doDelete(deleteId) }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) closeEdit() }}>
        <DialogContent className="border" style={{ background: "var(--bg-c)", borderColor: "var(--bd)", color: "var(--t1)" }}>
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
            <DialogDescription style={{ color: "var(--t3)" }}>
              Ajuste os campos e salve.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="text-[12px] font-extrabold" style={{ color: "var(--t3)" }}>Descrição</label>
              <input
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-extrabold" style={{ color: "var(--t3)" }}>Valor</label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--bd)", background: "var(--bg-i)" }}>
                  <span className="text-[13px] font-extrabold" style={{ color: "var(--t3)" }}>R$</span>
                  <input
                    value={editValorRaw}
                    onChange={(e) => setEditValorRaw(formatBRLInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full bg-transparent text-[13px] font-semibold outline-none"
                    style={{ color: "var(--t1)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-extrabold" style={{ color: "var(--t3)" }}>Data</label>
                <input
                  type="date"
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                  style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-extrabold" style={{ color: "var(--t3)" }}>Tipo</label>
                <div className="mt-2 flex gap-2">
                  {(["despesa", "receita"] as const).map((k) => {
                    const active = editTipo === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setEditTipo(k)}
                        className="rounded-full border px-4 py-2 text-[12px] font-extrabold"
                        style={{
                          borderColor: "var(--bd)",
                          background: active ? (k === "receita" ? "rgba(22,163,74,0.12)" : "rgba(239,68,68,0.10)") : "var(--bg-i)",
                          color: active ? "var(--t1)" : "var(--t2)",
                        }}
                      >
                        {k === "despesa" ? "Despesa" : "Receita"}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-extrabold" style={{ color: "var(--t3)" }}>Categoria</label>
                <select
                  value={editCategoriaId}
                  onChange={(e) => setEditCategoriaId(e.target.value)}
                  disabled={catsLoading}
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                  style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
                >
                  <option value="">{catsLoading ? "Carregando..." : "Selecione"}</option>
                  {catsByTipo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.emoji || c.icone || "🧾") + " " + c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-extrabold" style={{ color: "var(--t3)" }}>Método de pagamento</label>
              <select
                value={editMetodo ?? ""}
                onChange={(e) => setEditMetodo((e.target.value || null) as any)}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
              >
                <option value="">Não informado</option>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
                <option value="boleto">Boleto</option>
                <option value="debito_automatico">Débito automático</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-2xl border px-4 py-3 text-[13px] font-extrabold disabled:opacity-70"
              style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
              onClick={closeEdit}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-2xl border px-4 py-3 text-[13px] font-extrabold disabled:opacity-70"
              style={{ borderColor: "rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.16)", color: "#22C55E" }}
              onClick={() => void doSave()}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
