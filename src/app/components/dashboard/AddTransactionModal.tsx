import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarDays, Loader2, PlusCircle, TrendingDown, TrendingUp, X } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { addTransacao, getOrCreateCategoria } from "../../../lib/queries"
import { getCategoriasAtivas } from "../../../lib/queries/categorias"
import type { Categoria, MetodoPagamento } from "../../../lib/types"

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type UiTipo = "despesa" | "receita" | "aporte"

const METODOS_PAGAMENTO: { value: MetodoPagamento; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "pix_qr_code", label: "Pix QR Code" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "debito", label: "Cartão de débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "debito_automatico", label: "Débito automático" },
  { value: "outro", label: "Outro" },
]

function clampDayISO(date: string) {
  return date && date.length >= 10 ? date.slice(0, 10) : new Date().toISOString().split("T")[0]
}

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const { user } = useAuth()
  const { t } = useLanguage()

  const [tipo, setTipo] = useState<UiTipo>("despesa")
  const [amount, setAmount] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [metodo, setMetodo] = useState<MetodoPagamento | "">("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [cats, setCats] = useState<Categoria[]>([])
  const [catsLoading, setCatsLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setCatsLoading(true)
    getCategoriasAtivas(user.id)
      .then(setCats)
      .catch(() => {})
      .finally(() => setCatsLoading(false))
  }, [open, user?.id])

  const txTipo = tipo === "aporte" ? "despesa" : tipo
  const categories = useMemo(() => {
    if (tipo === "aporte") return cats.filter((c) => c.tipo === "despesa")
    return cats.filter((c) => c.tipo === (tipo === "receita" ? "receita" : "despesa"))
  }, [cats, tipo])

  const displayAmount = amount
    ? (parseInt(amount) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : ""

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "")
    setAmount(raw)
    if (errors.amount) setErrors((p) => ({ ...p, amount: "" }))
  }

  function reset() {
    setTipo("despesa")
    setAmount("")
    setCategoriaId("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setMetodo("")
    setErrors({})
  }

  function validate() {
    const errs: Record<string, string> = {}
    const num = parseInt(amount)
    if (!amount || isNaN(num) || num <= 0) errs.amount = t("modalErroValor")
    if (tipo !== "aporte" && !categoriaId) errs.categoria = t("modalErroCategoria")
    if (!date) errs.date = t("modalErroData")
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const userId = user.id
      const valor = parseInt(amount) / 100

      let catId = categoriaId
      if (tipo === "aporte") {
        catId = catId || (await getOrCreateCategoria(userId, "Aportes", "despesa"))
      }

      await addTransacao(userId, {
        categoria_id: catId,
        descricao: description || (tipo === "aporte" ? "Aporte em investimento" : "Transação"),
        valor,
        tipo: txTipo,
        data: clampDayISO(date),
        metodo_pagamento: metodo || null,
        confirmado: true,
      })

      const title =
        tipo === "receita"
          ? t("modalSuccessReceita")
          : tipo === "aporte"
            ? "Aporte registrado!"
            : t("modalSuccessDespesa")

      toast.success(title, {
        description: `${tipo === "aporte" ? "Investimento" : "Transação"} · R$ ${displayAmount}`,
        duration: 3000,
      })

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error(t("modalErroRegistrar"))
    } finally {
      setSubmitting(false)
    }
  }

  const tabBtn = (active: boolean, accent: string): React.CSSProperties => ({
    flex: 1,
    padding: "10px 0",
    borderRadius: 12,
    border: `1px solid ${active ? accent : "var(--of-border)"}`,
    background: active ? accent + "14" : "transparent",
    color: active ? accent : "var(--of-text-muted)",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  })

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
          }}
        />
        <DialogPrimitive.Content
          style={{
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 101,
            width: "100%",
            maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto",
            backgroundColor: "var(--of-surface)",
            borderRadius: 18,
            border: "1px solid var(--of-border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            padding: "24px 24px 18px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
                Nova movimentação
              </h2>
              <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                Registre despesa, receita ou aporte. Tudo impacta seu saldo do ciclo atual.
              </p>
            </div>
            <DialogPrimitive.Close
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 36, height: 36, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--of-text-secondary)",
              }}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button type="button" onClick={() => { setTipo("despesa"); setCategoriaId(""); setErrors({}); }} style={tabBtn(tipo === "despesa", "#EF4444")}>
              <TrendingDown size={16} /> Despesa
            </button>
            <button type="button" onClick={() => { setTipo("receita"); setCategoriaId(""); setErrors({}); }} style={tabBtn(tipo === "receita", "#16A34A")}>
              <TrendingUp size={16} /> Receita
            </button>
            <button type="button" onClick={() => { setTipo("aporte"); setErrors({}); }} style={tabBtn(tipo === "aporte", "#7C3AED")}>
              <PlusCircle size={16} /> Aporte
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Valor */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Valor
              </label>
              <div style={{
                border: `1px solid ${errors.amount ? "#EF4444" : "var(--of-border)"}`,
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--of-page-bg)",
              }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "var(--of-text-secondary)" }}>R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 18,
                    fontWeight: 900,
                    color: "var(--of-text)",
                    letterSpacing: "-0.02em",
                  }}
                />
              </div>
              {errors.amount && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.amount}</p>}
            </div>

            {/* Categoria */}
            {tipo !== "aporte" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Categoria
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => { setCategoriaId(e.target.value); if (errors.categoria) setErrors((p) => ({ ...p, categoria: "" })) }}
                  disabled={catsLoading}
                  style={{
                    width: "100%",
                    border: `1px solid ${errors.categoria ? "#EF4444" : "var(--of-border)"}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "var(--of-page-bg)",
                    color: "var(--of-text)",
                    outline: "none",
                  }}
                >
                  <option value="">{catsLoading ? "Carregando..." : "Selecione..."}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                  ))}
                </select>
                {errors.categoria && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.categoria}</p>}
              </div>
            )}

            {/* Descrição */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tipo === "aporte" ? "Ex: Aporte no CDB, Tesouro, ETF..." : "Ex: Supermercado, iFood, Salário..."}
                style={{
                  width: "100%",
                  border: "1px solid var(--of-border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "var(--of-text)",
                  background: "transparent",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Data + método */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Data
                </label>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  border: `1px solid ${errors.date ? "#EF4444" : "var(--of-border)"}`,
                  borderRadius: 12, padding: "12px 14px",
                  background: "var(--of-page-bg)",
                }}>
                  <CalendarDays size={16} style={{ color: "var(--of-text-muted)" }} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); if (errors.date) setErrors((p) => ({ ...p, date: "" })) }}
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--of-text)" }}
                  />
                </div>
                {errors.date && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.date}</p>}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Pagamento (opcional)
                </label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value as any)}
                  style={{
                    width: "100%",
                    border: "1px solid var(--of-border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "var(--of-page-bg)",
                    color: "var(--of-text)",
                    outline: "none",
                  }}
                >
                  <option value="">Selecione...</option>
                  {METODOS_PAGAMENTO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", gap: 12, paddingTop: 2 }}>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    border: "1px solid var(--of-border)",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--of-text-secondary)",
                    backgroundColor: "var(--of-surface)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--of-btn-text)",
                  backgroundColor: submitting
                    ? "var(--of-border)"
                    : (tipo === "receita" ? "#16A34A" : tipo === "aporte" ? "#7C3AED" : "#0A0A0A"),
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {submitting
                  ? <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Salvando...</>
                  : "Salvar"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
