import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, X, Loader2 } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useAuth } from "../../../lib/auth-context"
import { getProfile, upsertProfile } from "../../../lib/queries"

interface IncomeSource {
  id: string
  tipo: string
  valor: string
}

interface ConfigureIncomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (total: number) => void
}

const TIPOS = [
  { value: "freelance", label: "Freelance" },
  { value: "aluguel", label: "Aluguel" },
  { value: "investimentos", label: "Investimentos" },
  { value: "pensao", label: "Pensão" },
  { value: "outros", label: "Outros" },
]

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ConfigureIncomeModal({ open, onOpenChange, onSuccess }: ConfigureIncomeModalProps) {
  const { user } = useAuth()

  const [rendaPrincipal, setRendaPrincipal] = useState("")
  const [fontes, setFontes] = useState<IncomeSource[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    getProfile(user.id).then((p) => {
      if (p?.renda_mensal) {
        setRendaPrincipal(formatBRL(p.renda_mensal))
      }
      setLoading(false)
    })
  }, [open, user])

  const totalFontes = fontes.reduce((sum, f) => sum + parseBRL(f.valor), 0)
  const totalRenda = parseBRL(rendaPrincipal) + totalFontes

  function addFonte() {
    setFontes((prev) => [...prev, { id: Date.now().toString(), tipo: "freelance", valor: "" }])
  }

  function removeFonte(id: string) {
    setFontes((prev) => prev.filter((f) => f.id !== id))
  }

  function updateFonte(id: string, field: keyof IncomeSource, value: string) {
    setFontes((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f))
  }

  async function handleSave() {
    if (!user) return
    const total = totalRenda
    if (total <= 0) {
      toast.error("Informe pelo menos uma renda válida")
      return
    }
    setSaving(true)
    try {
      const currentProfile = await getProfile(user.id)
      await upsertProfile(user.id, user.email ?? "", {
        nome: currentProfile?.nome,
        telefone: currentProfile?.telefone,
        data_nascimento: currentProfile?.data_nascimento,
        plano: currentProfile?.plano ?? "free",
        renda_mensal: total,
        meta_economia: currentProfile?.meta_economia ?? 0,
      })
      toast.success("Renda atualizada!", {
        description: `Total mensal: R$ ${formatBRL(total)}`,
        duration: 3000,
      })
      onSuccess?.(total)
      onOpenChange(false)
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--of-border)", borderRadius: 8,
    padding: "9px 12px", fontSize: 14, color: "var(--of-text)",
    outline: "none", backgroundColor: "var(--of-surface)",
    transition: "border-color 0.15s",
    width: "100%", boxSizing: "border-box",
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
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
            maxWidth: 480,
            maxHeight: "90vh",
            overflowY: "auto",
            backgroundColor: "var(--of-surface)",
            borderRadius: 16,
            border: "1px solid var(--of-border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            padding: "28px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
                Renda mensal
              </h2>
              <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 2 }}>
                Configure suas fontes de renda
              </p>
            </div>
            <DialogPrimitive.Close
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--of-text-muted)", transition: "all 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = "#0A0A0A"; e.currentTarget.style.background = "var(--of-hover)" }}
              onMouseOut={(e) => { e.currentTarget.style.color = "#A3A3A3"; e.currentTarget.style.background = "none" }}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <div style={{ width: 24, height: 24, border: "2.5px solid #16A34A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Renda principal */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Renda principal (salário)
                </label>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--of-border)", borderRadius: 10, padding: "10px 14px", transition: "border-color 0.15s" }}
                  onFocus={() => {}} >
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text-muted)", marginRight: 8 }}>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rendaPrincipal}
                    onChange={(e) => setRendaPrincipal(e.target.value)}
                    placeholder="0,00"
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 22, fontWeight: 700, color: "var(--of-text)" }}
                    onFocus={(e) => { e.currentTarget.parentElement!.style.borderColor = "#0A0A0A" }}
                    onBlur={(e) => { e.currentTarget.parentElement!.style.borderColor = "#E5E5E3" }}
                  />
                </div>
              </div>

              {/* Fontes extras */}
              {fontes.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>
                    Outras fontes
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {fontes.map((fonte) => (
                      <div key={fonte.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          value={fonte.tipo}
                          onChange={(e) => updateFonte(fonte.id, "tipo", e.target.value)}
                          style={{ ...inputStyle, width: 140, flexShrink: 0 }}
                        >
                          {TIPOS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--of-border)", borderRadius: 8, padding: "9px 12px", flex: 1, transition: "border-color 0.15s" }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text-muted)", marginRight: 4 }}>R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={fonte.valor}
                            onChange={(e) => updateFonte(fonte.id, "valor", e.target.value)}
                            placeholder="0,00"
                            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--of-text)" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFonte(fonte.id)}
                          style={{
                            width: 32, height: 36, border: "1px solid var(--of-border)", borderRadius: 8,
                            background: "var(--of-surface)", cursor: "pointer", color: "var(--of-text-muted)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s", flexShrink: 0,
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444" }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E5E5E3"; e.currentTarget.style.color = "#A3A3A3" }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add fonte button */}
              <button
                type="button"
                onClick={addFonte}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px 0", border: "1px dashed #E5E5E3", borderRadius: 10,
                  background: "var(--of-surface)", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  color: "var(--of-text-secondary)", transition: "all 0.15s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "#0A0A0A"; e.currentTarget.style.color = "#0A0A0A" }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E5E5E3"; e.currentTarget.style.color = "#525252" }}
              >
                <Plus size={14} />
                Adicionar outra fonte de renda
              </button>

              {/* Total */}
              <div style={{
                padding: "16px 20px",
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 12, color: "#15803D", fontWeight: 500 }}>Renda total mensal estimada</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#15803D", letterSpacing: "-0.03em", marginTop: 4 }}>
                  R$ {formatBRL(totalRenda)}
                </p>
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: 12 }}>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: "12px 0",
                      border: "1px solid var(--of-border)", borderRadius: 10,
                      fontSize: 14, fontWeight: 600, color: "var(--of-text-secondary)",
                      background: "var(--of-surface)", cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "var(--of-hover)" }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "var(--of-surface)" }}
                  >
                    Cancelar
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "12px 0",
                    border: "none", borderRadius: 10,
                    fontSize: 14, fontWeight: 600, color: "var(--of-btn-text)",
                    backgroundColor: saving ? "#A3A3A3" : "#16A34A",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#15803D" }}
                  onMouseOut={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#16A34A" }}
                >
                  {saving
                    ? <><Loader2 size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Salvando...</>
                    : "Salvar renda"
                  }
                </button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
