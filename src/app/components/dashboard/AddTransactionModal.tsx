import { useState } from "react"
import { toast } from "sonner"
import { CalendarDays, Loader2, X } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useAuth } from "../../../lib/auth-context"
import { addTransacao, getOrCreateCategoria } from "../../../lib/queries"

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Tipo = "despesa" | "receita"

const DESPESA_CATS = [
  { nome: "Alimentação", emoji: "🍽️" },
  { nome: "Transporte", emoji: "🚌" },
  { nome: "Saúde", emoji: "🏥" },
  { nome: "Educação", emoji: "📚" },
  { nome: "Entretenimento", emoji: "🎬" },
  { nome: "Moradia", emoji: "🏠" },
  { nome: "Outros", emoji: "📦" },
]

const RECEITA_CATS = [
  { nome: "Salário", emoji: "💼" },
  { nome: "Freelance", emoji: "💻" },
  { nome: "Investimentos", emoji: "📈" },
  { nome: "Aluguel", emoji: "🏠" },
  { nome: "Outros", emoji: "💰" },
]

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const { user } = useAuth()

  const [tipo, setTipo] = useState<Tipo>("despesa")
  const [amount, setAmount] = useState("")
  const [categoria, setCategoria] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const categories = tipo === "despesa" ? DESPESA_CATS : RECEITA_CATS

  const displayAmount = amount
    ? (parseInt(amount) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : ""

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "")
    setAmount(raw)
    if (errors.amount) setErrors((p) => ({ ...p, amount: "" }))
  }

  function handleTipoChange(next: Tipo) {
    setTipo(next)
    setCategoria("")
    setErrors({})
  }

  function reset() {
    setTipo("despesa")
    setAmount("")
    setCategoria("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setErrors({})
  }

  function validate() {
    const errs: Record<string, string> = {}
    const num = parseInt(amount)
    if (!amount || isNaN(num) || num <= 0) errs.amount = "Informe um valor válido"
    if (!categoria) errs.categoria = "Selecione uma categoria"
    if (!date) errs.date = "Selecione uma data"
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const userId = user!.id
      const categoriaId = await getOrCreateCategoria(userId, categoria)
      const valor = parseInt(amount) / 100

      await addTransacao(userId, {
        categoria_id: categoriaId,
        descricao: description || categoria,
        valor,
        tipo,
        data: date,
      })

      toast.success(`${tipo === "despesa" ? "Despesa" : "Receita"} registrada!`, {
        description: `${categoria} · R$ ${displayAmount}`,
        duration: 3000,
      })

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Erro ao registrar transação. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

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
            maxWidth: 540,
            maxHeight: "90vh",
            overflowY: "auto",
            backgroundColor: "var(--of-surface)",
            borderRadius: 16,
            border: "1px solid var(--of-border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            padding: "28px 28px 24px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
              Nova transação
            </h2>
            <DialogPrimitive.Close
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 32, height: 32, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--of-text-muted)", transition: "all 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = "#0A0A0A"; e.currentTarget.style.background = "var(--of-hover)" }}
              onMouseOut={(e) => { e.currentTarget.style.color = "#A3A3A3"; e.currentTarget.style.background = "none" }}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {/* Tipo Toggle */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            backgroundColor: "#F5F5F0", borderRadius: 10, padding: 4,
            marginBottom: 24, gap: 4,
          }}>
            {(["despesa", "receita"] as Tipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTipoChange(t)}
                style={{
                  padding: "9px 0",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s",
                  backgroundColor: tipo === t ? (t === "receita" ? "#16A34A" : "#0A0A0A") : "transparent",
                  color: tipo === t ? "#FFFFFF" : "#525252",
                }}
              >
                {t === "despesa" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Valor */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Valor *
              </label>
              <div style={{
                display: "flex", alignItems: "center",
                border: `1px solid ${errors.amount ? "#EF4444" : amount ? "#0A0A0A" : "#E5E5E3"}`,
                borderRadius: 10, padding: "12px 16px",
                transition: "border-color 0.15s",
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text-muted)", marginRight: 8 }}>R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  placeholder="0,00"
                  autoFocus
                  style={{
                    flex: 1, outline: "none", border: "none", background: "transparent",
                    fontSize: 28, fontWeight: 700, color: "var(--of-text)",
                  }}
                />
              </div>
              {errors.amount && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.amount}</p>}
            </div>

            {/* Categoria */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Categoria *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {categories.map(({ nome, emoji }) => (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => { setCategoria(nome); setErrors((p) => ({ ...p, categoria: "" })) }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      padding: "10px 8px", borderRadius: 10,
                      border: `1px solid ${categoria === nome ? (tipo === "receita" ? "#16A34A" : "#0A0A0A") : "#E5E5E3"}`,
                      backgroundColor: categoria === nome ? (tipo === "receita" ? "#DCFCE7" : "#0A0A0A") : "#FFFFFF",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span style={{
                      fontSize: 10, fontWeight: categoria === nome ? 600 : 400,
                      color: categoria === nome ? (tipo === "receita" ? "#15803D" : "#FFFFFF") : "#525252",
                      textAlign: "center", lineHeight: 1.2,
                    }}>
                      {nome}
                    </span>
                  </button>
                ))}
              </div>
              {errors.categoria && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.categoria}</p>}
            </div>

            {/* Descrição */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, iFood, Salário..."
                style={{
                  width: "100%", border: "1px solid var(--of-border)", borderRadius: 10,
                  padding: "10px 14px", fontSize: 14, color: "var(--of-text)",
                  outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0A0A0A")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E5E3")}
              />
            </div>

            {/* Data */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Data *
              </label>
              <div style={{
                display: "flex", alignItems: "center",
                border: `1px solid ${errors.date ? "#EF4444" : "#E5E5E3"}`,
                borderRadius: 10, padding: "10px 14px",
                transition: "border-color 0.15s",
              }}>
                <CalendarDays size={16} style={{ color: "var(--of-text-muted)", marginRight: 8, flexShrink: 0 }} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: "" })) }}
                  style={{
                    flex: 1, border: "none", outline: "none",
                    background: "transparent", fontSize: 14, color: "var(--of-text)",
                  }}
                />
              </div>
              {errors.date && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.date}</p>}
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: "12px 0", border: "1px solid var(--of-border)",
                    borderRadius: 10, fontSize: 14, fontWeight: 600,
                    color: "var(--of-text-secondary)", backgroundColor: "var(--of-surface)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#F5F5F0"; e.currentTarget.style.borderColor = "#0A0A0A" }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#FFFFFF"; e.currentTarget.style.borderColor = "#E5E5E3" }}
                >
                  Cancelar
                </button>
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1, padding: "12px 0", border: "none",
                  borderRadius: 10, fontSize: 14, fontWeight: 600,
                  color: "var(--of-btn-text)",
                  backgroundColor: submitting ? "#A3A3A3" : (tipo === "receita" ? "#16A34A" : "#0A0A0A"),
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.15s",
                }}
                onMouseOver={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = tipo === "receita" ? "#15803D" : "#262626"
                }}
                onMouseOut={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = tipo === "receita" ? "#16A34A" : "#0A0A0A"
                }}
              >
                {submitting
                  ? <><Loader2 size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Salvando...</>
                  : `Registrar ${tipo === "despesa" ? "despesa" : "receita"}`
                }
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
