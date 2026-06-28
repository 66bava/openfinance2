import { useEffect, useMemo, useState } from "react"
import { Link, useOutletContext } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency } from "../../../lib/format"
import {
  atualizarInvestimento,
  criarInvestimento,
  getInvestimentos,
  removerInvestimento,
  calcularRentabilidadeEstimada,
} from "../../../lib/queries/investimentos"
import type { CategoriaInvestimento, Investimento, LiquidezInvestimento, RiscoInvestimento } from "../../../lib/types"
import type { AppOutletContext } from "../../../app/components/Layout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../app/components/ui/alert-dialog"

const CARD: React.CSSProperties = {
  borderRadius: 20,
  border: "none",
  background: "var(--bg-c)",
  padding: "20px 24px",
}

const INPUT: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--bd)",
  background: "var(--bg-i)",
  color: "var(--t1)",
  fontSize: 13,
  fontWeight: 600,
  padding: "12px 16px",
  outline: "none",
  display: "block",
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--t3)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
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

function toISODateYYYYMMDD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

type EditMode = { kind: "new" } | { kind: "edit"; item: Investimento }

function defaultDraft(): any {
  return {
    nome: "",
    tipo: "manual",
    categoria_investimento: "renda_fixa" as CategoriaInvestimento,
    corretora: null,
    corretora_personalizada: "",
    valor_aporte_raw: "",
    valor_atual_raw: "",
    aporte_recorrente: false,
    recorrencia: null,
    data_investimento: toISODateYYYYMMDD(new Date()),
    vencimento: null,
    observacoes: "",
    risco: "moderado" as RiscoInvestimento,
    liquidez: "media" as LiquidezInvestimento,
    ativo: true,
  }
}

export default function InvestimentosManagePage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { currency } = useUserSettings()
  const { syncNonce, requestSync } = useOutletContext<AppOutletContext>()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Investimento[]>([])

  const [editMode, setEditMode] = useState<EditMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<any>(defaultDraft())

  const [deleteTarget, setDeleteTarget] = useState<Investimento | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fmt = (v: number) => formatCurrency(v, lang, currency)

  async function reload() {
    if (!user) return
    setLoading(true)
    try {
      const inv = await getInvestimentos(user.id)
      setItems(inv || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, syncNonce])

  const totals = useMemo(() => {
    const totalAportes = (items || []).reduce((s, i) => s + (Number(i.valor_aporte) || 0), 0)
    const totalRend = (items || []).reduce((s, i) => s + (calcularRentabilidadeEstimada(i) || 0), 0)
    const valorAtual = totalAportes + totalRend
    const pct = totalAportes > 0 ? (totalRend / totalAportes) * 100 : 0
    return { totalAportes, totalRend, valorAtual, pct }
  }, [items])

  function openNew() {
    setDraft(defaultDraft())
    setEditMode({ kind: "new" })
  }

  function openEdit(item: Investimento) {
    const aporte = Number(item.valor_aporte) || 0
    const rend = calcularRentabilidadeEstimada(item) || 0
    setDraft({
      ...defaultDraft(),
      nome: item.nome || "",
      tipo: item.tipo || "manual",
      categoria_investimento: (item.categoria_investimento || "renda_fixa") as CategoriaInvestimento,
      corretora: item.corretora ?? null,
      corretora_personalizada: item.corretora_personalizada || "",
      valor_aporte_raw: formatBRLInput(String(Math.round(aporte * 100))),
      valor_atual_raw: formatBRLInput(String(Math.round(Math.max(0, aporte + rend) * 100))),
      aporte_recorrente: Boolean(item.aporte_recorrente),
      recorrencia: (item as any).recorrencia ?? null,
      data_investimento: String(item.data_investimento || toISODateYYYYMMDD(new Date())),
      vencimento: (item as any).vencimento ?? null,
      observacoes: (item as any).observacoes ?? "",
      risco: (item.risco || "moderado") as RiscoInvestimento,
      liquidez: (item.liquidez || "media") as LiquidezInvestimento,
      ativo: Boolean(item.ativo),
    })
    setEditMode({ kind: "edit", item })
  }

  async function save() {
    if (!user || !editMode) return
    const nome = String(draft.nome || "").trim()
    if (!nome) {
      toast.error("Informe o nome do investimento")
      return
    }

    const aporte = Math.max(0, parseBRLInput(String(draft.valor_aporte_raw || "")) || 0)
    const valorAtual = Math.max(0, parseBRLInput(String(draft.valor_atual_raw || "")) || 0)
    const rendReais = Math.round((valorAtual - aporte) * 100) / 100

    const payload: any = {
      nome,
      tipo: String(draft.tipo || "manual"),
      categoria_investimento: draft.categoria_investimento || "renda_fixa",
      corretora: draft.corretora ?? null,
      corretora_personalizada: String(draft.corretora_personalizada || "").trim() || null,
      valor_aporte: aporte,
      aporte_recorrente: Boolean(draft.aporte_recorrente),
      recorrencia: draft.recorrencia ?? null,
      rentabilidade: Number.isFinite(rendReais) ? rendReais : 0,
      rentabilidade_tipo: "reais",
      data_investimento: String(draft.data_investimento || toISODateYYYYMMDD(new Date())),
      vencimento: draft.vencimento ? String(draft.vencimento) : null,
      observacoes: String(draft.observacoes || "").trim() || null,
      risco: draft.risco || "moderado",
      liquidez: draft.liquidez || "media",
      ativo: Boolean(draft.ativo),
    }

    setSaving(true)
    try {
      if (editMode.kind === "new") {
        await criarInvestimento(user.id, payload)
        toast.success("Investimento registrado!")
      } else {
        await atualizarInvestimento(editMode.item.id, user.id, payload)
        toast.success("Investimento atualizado")
      }
      setEditMode(null)
      await reload()
      requestSync()
    } catch (e: any) {
      toast.error("Erro ao salvar investimento", { description: String(e?.message || "").slice(0, 160) })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!user || !deleteTarget) return
    setDeleting(true)
    try {
      await removerInvestimento(deleteTarget.id, user.id)
      toast.success("Investimento removido")
      setDeleteTarget(null)
      await reload()
      requestSync()
    } catch (e: any) {
      toast.error("Erro ao remover investimento", { description: String(e?.message || "").slice(0, 160) })
    } finally {
      setDeleting(false)
    }
  }

  if (!user) return null

  return (
    <div className="ofx-investments">
      <div className="page">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--t1)", marginBottom: 4 }}>
              Gerenciar investimentos
            </h1>
            <p style={{ fontSize: 14, color: "var(--t2)" }}>
              {items.length === 0 ? "Cadastre investimentos para ver patrimônio e rentabilidade." : `${items.length} ativo${items.length === 1 ? "" : "s"} · ${fmt(totals.valorAtual)} atual`}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/app/investimentos" className="btn btn-ghost">
              Voltar
            </Link>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              Novo investimento
            </button>
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1.3fr 0.7fr" }}>
          {/* Investment list */}
          <div className="bg-[var(--bg-c)] border-0 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
              <h2 className="text-sm font-semibold text-[var(--t2)]">Ativos</h2>
              <span className="text-xs text-[var(--t3)]">
                {loading ? "Carregando..." : `${items.length} ${items.length === 1 ? "ativo" : "ativos"}`}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-xl"
                  style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.15)" }}
                >
                  📈
                </div>
                <p className="text-sm font-semibold text-[var(--t1)] mb-1.5">Nenhum investimento cadastrado</p>
                <p className="text-xs text-[var(--t3)] leading-relaxed max-w-xs">
                  Clique em "Novo investimento" para começar a acompanhar seu patrimônio.
                </p>
              </div>
            ) : (
              <div>
                {items.map((i, idx) => {
                  const aporte = Number(i.valor_aporte) || 0
                  const rend = calcularRentabilidadeEstimada(i) || 0
                  const atual = aporte + rend
                  const pct = aporte > 0 ? (rend / aporte) * 100 : 0
                  const catColors: Record<string, string> = {
                    renda_fixa: "#16A34A",
                    renda_variavel: "#3B82F6",
                    fundos: "#F59E0B",
                    outros: "#8B5CF6",
                  }
                  const catLabels: Record<string, string> = {
                    renda_fixa: "Renda fixa",
                    renda_variavel: "Renda variável",
                    fundos: "Fundos",
                    outros: "Outros",
                  }
                  const catKey = i.categoria_investimento || "outros"
                  const dotColor = catColors[catKey] ?? catColors.outros
                  const catLabel = catLabels[catKey] ?? catKey
                  return (
                    <div
                      key={i.id}
                      className="flex items-center gap-4 px-6 py-4 group hover:bg-white/[0.02] transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid var(--bd)" : undefined }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--t1)] truncate mb-0.5">{i.nome}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: dotColor + "18", color: dotColor }}
                          >
                            {catLabel}
                          </span>
                          <span className="text-xs text-[var(--t3)]">{fmt(aporte)} aportado</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[var(--t1)] tabular-nums">{fmt(atual)}</p>
                        <p
                          className="text-xs font-semibold tabular-nums"
                          style={{ color: rend >= 0 ? "#22C55E" : "#EF4444" }}
                        >
                          {rend >= 0 ? "+" : "−"}{fmt(Math.abs(rend))} ({Math.round(pct)}%)
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => openEdit(i)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: "6px 10px", fontSize: 12, color: "#EF4444" }}
                          onClick={() => setDeleteTarget(i)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <aside className="flex flex-col gap-4">
            <div className="bg-[var(--bg-c)] border-0 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-[var(--t2)] uppercase tracking-wider mb-5">Resumo</h2>

              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-xs text-[var(--t3)] mb-2">Total aportado</p>
                  <p className="text-2xl font-bold text-[var(--t1)] tabular-nums">{fmt(totals.totalAportes)}</p>
                </div>

                <div className="h-px bg-[var(--bd)]" />

                <div>
                  <p className="text-xs text-[var(--t3)] mb-2">Valor atual</p>
                  <p className="text-2xl font-bold text-[var(--t1)] tabular-nums">{fmt(totals.valorAtual)}</p>
                </div>

                <div className="h-px bg-[var(--bd)]" />

                <div>
                  <p className="text-xs text-[var(--t3)] mb-2">Rendimento total</p>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: totals.totalRend >= 0 ? "#22C55E" : "#EF4444" }}
                  >
                    {totals.totalRend >= 0 ? "+" : "−"}
                    {fmt(Math.abs(totals.totalRend))}
                  </p>
                  <p
                    className="text-sm font-semibold tabular-nums mt-0.5"
                    style={{ color: totals.pct >= 0 ? "#22C55E" : "#EF4444" }}
                  >
                    {totals.pct >= 0 ? "+" : ""}{Math.round(totals.pct)}% sobre aportes
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {editMode ? (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => !saving && setEditMode(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{
                background: "#0C0C0C",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 -4px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 pt-6 pb-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-1">
                    {editMode.kind === "new" ? "Novo investimento" : "Editar investimento"}
                  </p>
                  <h2 className="text-[17px] font-semibold text-[#EEEDE6]">
                    {editMode.kind === "new" ? "Registrar ativo" : draft.nome || "Editar ativo"}
                  </h2>
                </div>
                <button
                  onClick={() => !saving && setEditMode(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-[#888] hover:bg-white/5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

                <div>
                  <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Nome *</label>
                  <input
                    value={draft.nome}
                    onChange={(e) => setDraft((p: any) => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex.: CDB Nubank, Tesouro Selic..."
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#EEEDE6",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Tipo</label>
                    <input
                      value={draft.tipo}
                      onChange={(e) => setDraft((p: any) => ({ ...p, tipo: e.target.value }))}
                      placeholder="CDB, Tesouro, FII..."
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#AAAA9E",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Categoria</label>
                    <select
                      value={draft.categoria_investimento}
                      onChange={(e) => setDraft((p: any) => ({ ...p, categoria_investimento: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#AAAA9E",
                      }}
                    >
                      <option value="renda_fixa">Renda fixa</option>
                      <option value="renda_variavel">Renda variável</option>
                      <option value="fundos">Fundos</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Aportado</label>
                    <input
                      value={String(draft.valor_aporte_raw || "")}
                      onChange={(e) => setDraft((p: any) => ({ ...p, valor_aporte_raw: formatBRLInput(e.target.value) }))}
                      placeholder="0,00"
                      className="w-full rounded-xl px-4 py-3 text-base font-bold tabular-nums outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#EEEDE6",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Valor atual</label>
                    <input
                      value={String(draft.valor_atual_raw || "")}
                      onChange={(e) => setDraft((p: any) => ({ ...p, valor_atual_raw: formatBRLInput(e.target.value) }))}
                      placeholder="0,00"
                      className="w-full rounded-xl px-4 py-3 text-base font-bold tabular-nums outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#EEEDE6",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Data do aporte</label>
                    <input
                      type="date"
                      value={draft.data_investimento}
                      onChange={(e) => setDraft((p: any) => ({ ...p, data_investimento: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#AAAA9E",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">Corretora / Banco</label>
                    <input
                      value={draft.corretora_personalizada}
                      onChange={(e) => setDraft((p: any) => ({ ...p, corretora_personalizada: e.target.value }))}
                      placeholder="NuInvest, XP, Inter..."
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#AAAA9E",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#555] mb-2 tracking-wide">
                    Observações <span style={{ color: "#383838" }}>(opcional)</span>
                  </label>
                  <input
                    value={draft.observacoes}
                    onChange={(e) => setDraft((p: any) => ({ ...p, observacoes: e.target.value }))}
                    placeholder="Notas, detalhes, referência..."
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#AAAA9E",
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 pb-2">
                  <button
                    type="button"
                    className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-25 flex items-center justify-center gap-2"
                    style={{ background: "#16A34A" }}
                    onClick={() => void save()}
                    disabled={saving}
                  >
                    {saving && (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    )}
                    {saving ? "Salvando..." : editMode.kind === "new" ? "Registrar investimento" : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => !saving && setEditMode(null)}
                    disabled={saving}
                    className="w-full py-3 text-sm text-[#444] hover:text-[#666] transition-colors disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
          <AlertDialogContent className="border" style={{ background: "var(--bg-c)", borderColor: "var(--bd)", color: "var(--t1)" }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir investimento</AlertDialogTitle>
              <AlertDialogDescription style={{ color: "var(--t3)" }}>
                Confirma remover <b>{deleteTarget?.nome}</b>? Isso remove o investimento da lista e recalcula o dashboard.
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
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Removendo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
