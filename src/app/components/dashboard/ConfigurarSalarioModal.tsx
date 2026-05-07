import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, X, Loader2, Repeat, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useAuth } from "../../../lib/auth-context"
import {
  getReceitasRecorrentes,
  upsertReceitaRecorrente,
  deleteReceitaRecorrente,
  toggleReceitaRecorrente,
  type ReceitaRecorrente,
} from "../../../lib/queries/receitas-recorrentes"

interface ConfigurarSalarioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface EntradaForm {
  id?: string
  descricao: string
  valor: string
  dia_do_mes: number
}

const DIAS = Array.from({ length: 28 }, (_, i) => i + 1)

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ConfigurarSalarioModal({ open, onOpenChange, onSuccess }: ConfigurarSalarioModalProps) {
  const { user } = useAuth()

  const [entradas, setEntradas] = useState<ReceitaRecorrente[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [novaEntrada, setNovaEntrada] = useState<EntradaForm | null>(null)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    getReceitasRecorrentes(user.id)
      .then(setEntradas)
      .finally(() => setLoading(false))
  }, [open, user])

  function startNovaEntrada() {
    setNovaEntrada({ descricao: "", valor: "", dia_do_mes: 5 })
  }

  async function handleSalvarEntrada() {
    if (!user || !novaEntrada) return
    const valor = parseBRL(novaEntrada.valor)
    if (!novaEntrada.descricao.trim()) {
      toast.error("Informe uma descrição")
      return
    }
    if (valor <= 0) {
      toast.error("Informe um valor válido")
      return
    }
    setSaving(true)
    try {
      const saved = await upsertReceitaRecorrente(
        user.id,
        { descricao: novaEntrada.descricao, valor, dia_do_mes: novaEntrada.dia_do_mes, categoria_id: null },
        novaEntrada.id
      )
      setEntradas((prev) => {
        const idx = prev.findIndex((e) => e.id === saved.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved].sort((a, b) => a.dia_do_mes - b.dia_do_mes)
      })
      setNovaEntrada(null)
      toast.success("Receita recorrente salva!")
      onSuccess?.()
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try {
      await toggleReceitaRecorrente(id, !ativo)
      setEntradas((prev) => prev.map((e) => e.id === id ? { ...e, ativo: !ativo } : e))
    } catch {
      toast.error("Erro ao alterar status.")
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteReceitaRecorrente(id)
      setEntradas((prev) => prev.filter((e) => e.id !== id))
      toast.success("Removida.")
    } catch {
      toast.error("Erro ao remover.")
    }
  }

  const totalMensal = entradas.filter((e) => e.ativo).reduce((sum, e) => sum + e.valor, 0)

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6,
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) setNovaEntrada(null); onOpenChange(v) }}>
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
            maxWidth: 500,
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
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                <Repeat size={20} />
                Receitas recorrentes
              </h2>
              <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 4 }}>
                Salário e outras receitas que repetem todo mês
              </p>
            </div>
            <DialogPrimitive.Close
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--of-text-muted)", transition: "all 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = "var(--of-text)"; e.currentTarget.style.background = "var(--of-hover)" }}
              onMouseOut={(e) => { e.currentTarget.style.color = "var(--of-text-muted)"; e.currentTarget.style.background = "none" }}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <div style={{ width: 24, height: 24, border: "2.5px solid #16A34A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Lista de entradas */}
              {entradas.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {entradas.map((entrada) => (
                    <div key={entrada.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--of-border)",
                      backgroundColor: entrada.ativo ? "var(--of-surface)" : "var(--of-hover)",
                      opacity: entrada.ativo ? 1 : 0.65,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)", marginBottom: 2 }}>
                          {entrada.descricao}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--of-text-muted)" }}>
                          Todo dia {entrada.dia_do_mes} · R$ {formatBRL(entrada.valor)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle(entrada.id, entrada.ativo)}
                        title={entrada.ativo ? "Desativar" : "Ativar"}
                        style={{ background: "none", border: "none", cursor: "pointer", color: entrada.ativo ? "#16A34A" : "#A3A3A3", padding: 4, flexShrink: 0 }}
                      >
                        {entrada.ativo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entrada.id)}
                        title="Remover"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--of-text-muted)", padding: 4, flexShrink: 0, transition: "color 0.15s" }}
                        onMouseOver={(e) => { e.currentTarget.style.color = "#EF4444" }}
                        onMouseOut={(e) => { e.currentTarget.style.color = "var(--of-text-muted)" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {entradas.length === 0 && !novaEntrada && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--of-text-muted)", fontSize: 13 }}>
                  Nenhuma receita recorrente configurada ainda.
                </div>
              )}

              {/* Formulário nova entrada */}
              {novaEntrada ? (
                <div style={{
                  padding: 16, borderRadius: 12,
                  border: "1px solid #BBF7D0",
                  backgroundColor: "#F0FDF4",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Nova receita recorrente
                  </p>

                  <div>
                    <label style={{ ...labelStyle, color: "#15803D" }}>Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex: Salário, Freelance mensal..."
                      value={novaEntrada.descricao}
                      onChange={(e) => setNovaEntrada((p) => p ? { ...p, descricao: e.target.value } : p)}
                      autoFocus
                      style={{
                        width: "100%", border: "1px solid #BBF7D0", borderRadius: 8,
                        padding: "9px 12px", fontSize: 14, color: "#0A0A0A",
                        outline: "none", backgroundColor: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#16A34A" }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#BBF7D0" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ ...labelStyle, color: "#15803D" }}>Valor (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={novaEntrada.valor}
                        onChange={(e) => setNovaEntrada((p) => p ? { ...p, valor: e.target.value } : p)}
                        style={{
                          width: "100%", border: "1px solid #BBF7D0", borderRadius: 8,
                          padding: "9px 12px", fontSize: 14, color: "#0A0A0A",
                          outline: "none", backgroundColor: "#FFFFFF",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#16A34A" }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#BBF7D0" }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#15803D" }}>Dia do mês</label>
                      <select
                        value={novaEntrada.dia_do_mes}
                        onChange={(e) => setNovaEntrada((p) => p ? { ...p, dia_do_mes: parseInt(e.target.value) } : p)}
                        style={{
                          width: "100%", border: "1px solid #BBF7D0", borderRadius: 8,
                          padding: "9px 12px", fontSize: 14, color: "#0A0A0A",
                          outline: "none", backgroundColor: "#FFFFFF",
                          boxSizing: "border-box",
                        }}
                      >
                        {DIAS.map((d) => (
                          <option key={d} value={d}>Dia {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setNovaEntrada(null)}
                      style={{
                        flex: 1, padding: "9px 0", border: "1px solid #BBF7D0",
                        borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#15803D",
                        background: "#FFFFFF", cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarEntrada}
                      disabled={saving}
                      style={{
                        flex: 1, padding: "9px 0", border: "none",
                        borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#FFFFFF",
                        background: saving ? "#A3A3A3" : "#16A34A",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      {saving ? <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> Salvando...</> : "Salvar"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startNovaEntrada}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "10px 0", border: "1px dashed var(--of-border)", borderRadius: 10,
                    background: "var(--of-surface)", cursor: "pointer", fontSize: 13, fontWeight: 500,
                    color: "var(--of-text-secondary)", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "#16A34A"; e.currentTarget.style.color = "#16A34A" }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--of-border)"; e.currentTarget.style.color = "var(--of-text-secondary)" }}
                >
                  <Plus size={14} />
                  Adicionar receita recorrente
                </button>
              )}

              {/* Total ativo */}
              {entradas.length > 0 && (
                <div style={{
                  padding: "14px 18px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 12,
                }}>
                  <p style={{ fontSize: 12, color: "#15803D", fontWeight: 500 }}>Total ativo por mês</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: "#15803D", letterSpacing: "-0.03em", marginTop: 2 }}>
                    R$ {formatBRL(totalMensal)}
                  </p>
                  <p style={{ fontSize: 11, color: "#86EFAC", marginTop: 2 }}>
                    Transações criadas automaticamente no dia configurado
                  </p>
                </div>
              )}

              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  style={{
                    width: "100%", padding: "12px 0",
                    border: "1px solid var(--of-border)", borderRadius: 10,
                    fontSize: 14, fontWeight: 600, color: "var(--of-text-secondary)",
                    background: "var(--of-surface)", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "var(--of-hover)" }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "var(--of-surface)" }}
                >
                  Fechar
                </button>
              </DialogPrimitive.Close>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
