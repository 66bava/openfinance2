import { useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Calendar, X, Save } from "lucide-react"
import { toast } from "sonner"
import { getUserFinancialSettings, upsertUserFinancialSettings, type UserFinancialSettings } from "../../../lib/queries/financial-settings"

interface FinancialCycleSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSuccess?: (settings: UserFinancialSettings) => void
}

function clampDay(v: number) {
  return Math.max(1, Math.min(31, v))
}

export function FinancialCycleSettingsModal({ open, onOpenChange, userId, onSuccess }: FinancialCycleSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Omit<UserFinancialSettings, "user_id" | "created_at" | "updated_at">>({
    payday_day: 5,
    reset_day: 1,
    recurring_post_day: 1,
    cycle_start_day: 1,
    timezone: "America/Sao_Paulo",
  })

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getUserFinancialSettings(userId)
      .then((s) => {
        setForm({
          payday_day: s.payday_day,
          reset_day: s.reset_day,
          recurring_post_day: s.recurring_post_day,
          cycle_start_day: s.cycle_start_day,
          timezone: s.timezone,
        })
      })
      .finally(() => setLoading(false))
  }, [open, userId])

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await upsertUserFinancialSettings(userId, {
        payday_day: clampDay(form.payday_day),
        reset_day: clampDay(form.reset_day),
        recurring_post_day: clampDay(form.recurring_post_day),
        cycle_start_day: clampDay(form.cycle_start_day),
        timezone: form.timezone || "America/Sao_Paulo",
      })
      toast.success("Ciclo financeiro atualizado!")
      onSuccess?.(saved)
      onOpenChange(false)
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, color: "var(--of-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    display: "block", marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: "1px solid var(--of-border)", borderRadius: 10,
    background: "transparent", color: "var(--of-text)",
    fontSize: 14, outline: "none", boxSizing: "border-box",
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
            maxWidth: 520,
            maxHeight: "90vh",
            overflowY: "auto",
            backgroundColor: "var(--of-surface)",
            borderRadius: 16,
            border: "1px solid var(--of-border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            padding: "22px 22px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--of-text)", letterSpacing: "-0.02em" }}>
                Ciclo financeiro
              </h2>
              <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                Ajuste o seu “mês financeiro” para bater com o dia que você recebe e com o reset do seu controle.
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

          {loading ? (
            <div style={{ padding: "18px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 22, height: 22, border: "2px solid var(--of-border)", borderTopColor: "#16A34A", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Dia de pagamento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.payday_day}
                    onChange={(e) => setForm((p) => ({ ...p, payday_day: clampDay(Number.parseInt(e.target.value || "1", 10) || 1) }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Reset das despesas</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.reset_day}
                    onChange={(e) => setForm((p) => ({ ...p, reset_day: clampDay(Number.parseInt(e.target.value || "1", 10) || 1) }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <label style={labelStyle}>Entrada de recorrentes</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.recurring_post_day}
                    onChange={(e) => setForm((p) => ({ ...p, recurring_post_day: clampDay(Number.parseInt(e.target.value || "1", 10) || 1) }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Início do ciclo</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.cycle_start_day}
                    onChange={(e) => setForm((p) => ({ ...p, cycle_start_day: clampDay(Number.parseInt(e.target.value || "1", 10) || 1) }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--of-border)",
                background: "var(--of-page-bg)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}>
                <Calendar size={16} style={{ color: "var(--of-text-muted)", marginTop: 2 }} />
                <p style={{ fontSize: 12, color: "var(--of-text-muted)", lineHeight: 1.6 }}>
                  Exemplo: se você recebe dia <strong style={{ color: "var(--of-text)" }}>{form.payday_day}</strong>, pode definir o ciclo iniciando no dia <strong style={{ color: "var(--of-text)" }}>{form.cycle_start_day}</strong> e terminando no dia anterior do mês seguinte.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 12,
                      border: "1px solid var(--of-border)",
                      background: "var(--of-surface)",
                      color: "var(--of-text)",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "none",
                    background: saving ? "var(--of-border)" : "#16A34A",
                    color: saving ? "var(--of-text-muted)" : "#fff",
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Save size={16} />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

