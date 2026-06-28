import { useMemo, useState } from "react"
import { X, CheckCircle2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Assinatura, MetodoPagamento, RecorrenciaAssinatura } from "../../../lib/types"
import type { Lang } from "../../../lib/i18n"
import { formatCurrency } from "../../../lib/format"
import { atualizarAssinatura, removerAssinatura } from "../../../lib/queries/assinaturas"

type Step = "list" | "edit" | "done"

interface Props {
  userId: string
  lang: Lang
  currency?: string | null
  assinaturas: Assinatura[]
  onClose: () => void
  onChanged: () => Promise<void> | void
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

const RECORRENCIAS: RecorrenciaAssinatura[] = ["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]

const METODOS: Array<{ value: MetodoPagamento | ""; label: string }> = [
  { value: "", label: "Não informado" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "debito_automatico", label: "Débito automático" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "outro", label: "Outro" },
]

export function ManageSubscriptionsModal({ userId, lang, currency, assinaturas, onClose, onChanged }: Props) {
  const [step, setStep] = useState<Step>("list")
  const [editing, setEditing] = useState<Assinatura | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [nome, setNome] = useState("")
  const [valorRaw, setValorRaw] = useState("")
  const [dia, setDia] = useState("")
  const [recorrencia, setRecorrencia] = useState<RecorrenciaAssinatura>("mensal")
  const [metodo, setMetodo] = useState<MetodoPagamento | "">("")
  const [ativo, setAtivo] = useState(true)
  const [categoria, setCategoria] = useState("")

  const fmt = useMemo(() => (v: number) => formatCurrency(v, lang, currency || "BRL"), [lang, currency])

  function openEdit(a: Assinatura) {
    setEditing(a)
    setNome(a.nome || "")
    setValorRaw(formatBRLInput(String(Math.round((Number(a.valor) || 0) * 100))))
    setDia(a.dia_cobranca != null ? String(a.dia_cobranca) : "")
    setRecorrencia((a.recorrencia || "mensal") as RecorrenciaAssinatura)
    setMetodo((a.metodo_pagamento as any) || "")
    setAtivo(Boolean(a.ativo))
    setCategoria(String(a.categoria || ""))
    setStep("edit")
  }

  async function save() {
    if (!editing) return
    const nome2 = nome.trim()
    if (!nome2) {
      toast.error("Informe o nome da assinatura")
      return
    }
    const valor = Math.max(0, parseBRLInput(valorRaw))
    const diaInt = dia.trim() ? Math.max(1, Math.min(31, Math.trunc(Number(dia) || 0))) : null

    setSaving(true)
    try {
      await atualizarAssinatura(editing.id, userId, {
        nome: nome2,
        valor,
        recorrencia,
        metodo_pagamento: metodo ? (metodo as any) : null,
        dia_cobranca: diaInt,
        ativo,
        categoria: categoria.trim() || null,
      } as any)
      toast.success("Assinatura atualizada")
      await onChanged()
      setStep("done")
    } catch (e: any) {
      toast.error("Erro ao salvar assinatura", { description: String(e?.message || "").slice(0, 160) })
    } finally {
      setSaving(false)
    }
  }

  async function remove(a: Assinatura) {
    setDeletingId(a.id)
    try {
      await removerAssinatura(a.id, userId)
      toast.success("Assinatura removida")
      await onChanged()
    } catch (e: any) {
      toast.error("Erro ao remover assinatura", { description: String(e?.message || "").slice(0, 160) })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border-0 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1A1A1A]">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F0]">Gerenciar assinaturas</h2>
            <p className="text-[11px] text-[#555]">Confirme, edite ou remova serviços recorrentes</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors">
            <X size={16} className="text-[#555]" />
          </button>
        </div>

        {step === "list" ? (
          <div className="px-5 py-4 space-y-3">
            {assinaturas.length === 0 ? (
              <div className="text-[13px] text-[#555]">Nenhuma assinatura cadastrada.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {assinaturas.map((a) => (
                  <div key={a.id} className="bg-[#0D0D0D] border-0 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#F5F5F0] truncate">{a.nome}</div>
                      <div className="text-[11px] text-[#555] mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>{a.ativo ? "Ativa" : "Inativa"}</span>
                        <span>·</span>
                        <span>{a.recorrencia}</span>
                        {a.dia_cobranca ? (
                          <>
                            <span>·</span>
                            <span>Dia {a.dia_cobranca}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-[12px] text-[#D0D0D0] font-semibold">{fmt(Number(a.valor) || 0)}</div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="text-[12px] text-[#93C5FD] hover:text-[#BFDBFE]" onClick={() => openEdit(a)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-[12px] text-red-400 hover:text-red-300 flex items-center gap-1"
                        onClick={() => void remove(a)}
                        disabled={deletingId === a.id}
                      >
                        <Trash2 size={14} />
                        {deletingId === a.id ? "Removendo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {step === "edit" && editing ? (
          <div className="px-5 py-4 space-y-3">
            <div className="bg-[#0A0A0A] border-0 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-widest text-[#333] mb-2">Editando</p>
              <p className="text-[13px] text-[#D0D0D0] font-medium truncate">{editing.nome}</p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#333]">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-2 w-full rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3 text-[13px] text-[#F5F5F0] outline-none" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#333]">Valor</label>
                <input value={valorRaw} onChange={(e) => setValorRaw(formatBRLInput(e.target.value))} className="mt-2 w-full rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3 text-[13px] text-[#F5F5F0] outline-none" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#333]">Dia de cobrança</label>
                <input value={dia} onChange={(e) => setDia(e.target.value)} placeholder="1..31" className="mt-2 w-full rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3 text-[13px] text-[#F5F5F0] outline-none" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#333]">Recorrência</label>
                <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as any)} className="mt-2 w-full rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3 text-[13px] text-[#F5F5F0] outline-none">
                  {RECORRENCIAS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#333]">Método</label>
                <select value={metodo} onChange={(e) => setMetodo(e.target.value as any)} className="mt-2 w-full rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3 text-[13px] text-[#F5F5F0] outline-none">
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#333]">Categoria (opcional)</label>
              <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-2 w-full rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3 text-[13px] text-[#F5F5F0] outline-none" placeholder="Ex.: streaming, IA..." />
            </div>

            <label className="flex items-center gap-2 text-[12px] text-[#D0D0D0]">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="w-4 h-4 accent-green-600" />
              Ativa (se desmarcar, não conta como recorrente)
            </label>

            <div className="flex gap-2.5 pt-1">
              <button type="button" className="flex-1 py-2.5 text-[13px] text-[#555] border border-[#2A2A2A] rounded-lg hover:border-[#444] transition-colors disabled:opacity-40" onClick={() => setStep("list")} disabled={saving}>
                Voltar
              </button>
              <button
                type="button"
                className="flex-[2] py-2.5 text-[13px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-900/20 border border-green-600/30 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#F5F5F0] mb-1">Assinatura atualizada</h3>
              <p className="text-[12px] text-[#555] leading-relaxed max-w-xs">Alterações salvas e aplicadas no planejamento e dashboard.</p>
            </div>
            <button
              onClick={() => {
                setStep("list")
                setEditing(null)
              }}
              className="px-6 py-2.5 text-[13px] font-medium text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
            >
              Voltar à lista
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

