import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import { useLanguage } from "../../../lib/language-context"
import { type ThemePreference, useTheme } from "../../../lib/theme-context"
import { useUserSettings } from "../../../lib/user-settings-context"
import { formatCurrency } from "../../../lib/format"
import { deleteAllTransacoes, getProfile, upsertProfile } from "../../../lib/queries"
import { defaultFinancialSettings, getUserFinancialSettings, upsertUserFinancialSettings } from "../../../lib/queries/financial-settings"
import { logAudit } from "../../../lib/audit"
import { exportUserDataToJson, requestUserDataOperation } from "../../../lib/user-data"
import { supabase } from "../../../lib/supabase"
import type { Profile } from "../../../lib/types"
import { PanelLoader } from "../../components/PanelLoader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../app/components/ui/alert-dialog"

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

function clampDay(day: number) {
  return Math.max(1, Math.min(31, Math.trunc(day || 1)))
}

function getInitials(nameOrEmail: string): string {
  const s = (nameOrEmail || "").trim()
  if (!s) return "U"
  const parts = s.split(/[\s@]+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const CARD: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--bd)",
  background: "var(--bg-c)",
  padding: "24px",
}

const INNER: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--bd)",
  background: "var(--bg-i)",
  padding: "14px 16px",
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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 999,
        border: "none",
        background: on ? "var(--green)" : "var(--bd)",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  )
}

export default function ProfilePanel() {
  const { user } = useAuth()
  const { lang, setLang } = useLanguage()
  const { theme, themePreference, setThemePreference } = useTheme()
  const { currency, dateLocale, setCurrency, setDateLocale } = useUserSettings()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Perfil
  const [nome, setNome] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Ciclo financeiro
  const [rendaRaw, setRendaRaw] = useState("")
  const [paydayDay, setPaydayDay] = useState(5)
  const [savingFinanceiro, setSavingFinanceiro] = useState(false)

  // Segurança - trocar senha
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Preferências
  const [notifications, setNotifications] = useState(true)

  // Dados
  const [exporting, setExporting] = useState(false)
  const [requestingDelete, setRequestingDelete] = useState(false)
  const [deletingTransacoes, setDeletingTransacoes] = useState(false)
  const [confirmDeleteTransacoesText, setConfirmDeleteTransacoesText] = useState("")

  useEffect(() => {
    if (!user) return
    const userId = user.id
    setLoading(true)
    Promise.all([
      getProfile(userId),
      getUserFinancialSettings(userId).catch(() => defaultFinancialSettings(userId)),
    ])
      .then(([p, s]) => {
        setProfile(p)
        setNome(p?.nome ?? "")
        setRendaRaw(
          p?.renda_mensal
            ? p.renda_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "",
        )
        setPaydayDay(Number(s.payday_day) || 5)
        setNotifications(p?.notificacoes ?? true)

        const pref = (p as any)?.theme_preference as string | undefined
        if (pref === "light" || pref === "dark" || pref === "system") setThemePreference(pref)

        const cur = (p as any)?.currency_preference as string | undefined
        if (cur) setCurrency(cur)

        const datePref = (p as any)?.date_format_preference as string | undefined
        if (datePref) setDateLocale(datePref)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  async function cycleThemePreference() {
    if (!user) return
    const next: ThemePreference = themePreference === "dark" ? "light" : themePreference === "light" ? "system" : "dark"
    setThemePreference(next)
    try {
      await upsertProfile(user.id, user.email!, { theme_preference: next } as any)
    } catch {
      setThemePreference(themePreference)
      toast.error("Não foi possível salvar o tema.")
    }
  }

  async function setLanguageAndPersist(nextLang: typeof lang) {
    if (!user) return
    setLang(nextLang)
    try {
      await upsertProfile(user.id, user.email!, { idioma: nextLang } as any)
    } catch {
      toast.error("Não foi possível salvar o idioma.")
    }
  }

  async function setCurrencyAndPersist(nextCurrency: string) {
    if (!user) return
    setCurrency(nextCurrency)
    try {
      await upsertProfile(user.id, user.email!, { currency_preference: nextCurrency } as any)
    } catch {
      toast.error("Não foi possível salvar a moeda.")
    }
  }

  async function setDateLocaleAndPersist(nextLocale: string) {
    if (!user) return
    setDateLocale(nextLocale)
    try {
      await upsertProfile(user.id, user.email!, { date_format_preference: nextLocale } as any)
    } catch {
      toast.error("Não foi possível salvar o formato de data.")
    }
  }

  const fmt = (v: number) => formatCurrency(v, lang)
  const rendaParsed = useMemo(() => parseBRLInput(rendaRaw), [rendaRaw])

  async function saveProfile() {
    if (!user) return
    setSaveError(null)
    setSaving(true)
    try {
      const updated = await upsertProfile(user.id, user.email!, {
        nome: nome.trim() || undefined,
        idioma: lang,
      })
      setProfile(updated)
      toast.success("Perfil atualizado.")
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function saveFinanceiro() {
    if (!user) return
    setSavingFinanceiro(true)
    try {
      const current = await getUserFinancialSettings(user.id).catch(() => defaultFinancialSettings(user.id))
      await Promise.all([
        upsertProfile(user.id, user.email!, {
          renda_mensal: rendaParsed > 0 ? rendaParsed : undefined,
        }),
        upsertUserFinancialSettings(user.id, {
          payday_day: clampDay(paydayDay),
          reset_day: current.reset_day,
          recurring_post_day: current.recurring_post_day,
          cycle_start_day: clampDay(paydayDay),
          timezone: current.timezone || "America/Sao_Paulo",
        }),
      ])
      toast.success("Ciclo financeiro atualizado.")
    } catch {
      toast.error("Erro ao salvar ciclo financeiro.")
    } finally {
      setSavingFinanceiro(false)
    }
  }

  async function handlePasswordChange() {
    if (newPassword.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.")
      return
    }
    setPasswordError(null)
    setPasswordSuccess(false)
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Senha alterada com sucesso.")
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao alterar senha.")
    } finally {
      setChangingPassword(false)
    }
  }

  async function toggleNotifications() {
    if (!user) return
    const next = !notifications
    setNotifications(next)
    try {
      await upsertProfile(user.id, user.email!, { notificacoes: next })
    } catch {
      setNotifications(!next)
    }
  }

  async function handleExport() {
    if (!user || exporting) return
    setExporting(true)
    try {
      await requestUserDataOperation(user.id, "export").catch(() => null)
      await logAudit(user.id, "lgpd_export_requested", { channel: "in_app" }).catch(() => {})
      await exportUserDataToJson(user.id, { includeAuditLogs: false })
      toast.success("Exportação gerada. Confira seu download.")
    } catch {
      toast.error("Não foi possível exportar agora. Tente novamente.")
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteRequest() {
    if (!user || requestingDelete) return
    setRequestingDelete(true)
    try {
      await requestUserDataOperation(user.id, "delete")
      await logAudit(user.id, "lgpd_delete_requested", { channel: "in_app" }).catch(() => {})
      toast.success("Pedido de exclusão registrado.")
    } catch {
      toast.error("Não foi possível registrar o pedido agora. Tente novamente.")
    } finally {
      setRequestingDelete(false)
    }
  }

  async function handleDeleteAllTransacoes() {
    if (!user || deletingTransacoes) return
    setDeletingTransacoes(true)
    try {
      const count = await deleteAllTransacoes(user.id)
      await logAudit(user.id, "transacoes_delete_all", { count }).catch(() => {})
      toast.success(count > 0 ? `${count} transações apagadas.` : "Transações apagadas.")
    } catch {
      toast.error("Não foi possível apagar suas transações agora.")
    } finally {
      setDeletingTransacoes(false)
      setConfirmDeleteTransacoesText("")
    }
  }

  if (!user) return null
  if (loading) return <PanelLoader />

  const userEmail = user.email ?? ""
  const plano = profile?.plano ?? "free"
  const displayName = nome || userEmail.split("@")[0] || "Você"

  return (
    <div className="ofx-settings">
      <div className="page">
        {/* ── Page header ── */}
        <div className="page-header">
          <div className="page-title">Configurações</div>
          <div className="page-sub">Gerencie seu perfil, preferências e privacidade.</div>
        </div>

        <div className="layout">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN                                                 */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <section className="space-y-5 min-w-0">

            {/* ── Perfil ── */}
            <div style={CARD}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>Perfil</h2>
              <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>
                Seu nome é usado nas análises e no Score.
              </p>

              {/* Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "#16A34A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      style={{ width: "100%", height: "100%", borderRadius: 14, objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "var(--fd)",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {getInitials(displayName)}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>{displayName}</div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 11,
                      color: "var(--t3)",
                      padding: "3px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--bd)",
                      background: "var(--bg-i)",
                    }}
                  >
                    Foto de perfil · Em breve
                  </span>
                </div>
              </div>

              {/* Nome */}
              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  style={INPUT}
                />
              </div>

              {/* Email (read-only) */}
              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}>Email</label>
                <div
                  style={{
                    ...INPUT,
                    marginTop: 8,
                    color: "var(--t3)",
                    cursor: "default",
                    userSelect: "all" as const,
                  }}
                >
                  {userEmail}
                </div>
              </div>

              {saveError && (
                <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{saveError}</div>
              )}

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "12px 16px",
                  background: "var(--green)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  border: "none",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Salvando..." : "Salvar perfil"}
              </button>
            </div>

            {/* ── Segurança ── */}
            <div style={CARD}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>Segurança</h2>
              <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>
                Defina uma nova senha de acesso.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false) }}
                  placeholder="Mínimo 6 caracteres"
                  style={INPUT}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}>Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSuccess(false) }}
                  placeholder="Repita a nova senha"
                  style={INPUT}
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{passwordError}</div>
              )}
              {passwordSuccess && (
                <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 12 }}>
                  Senha alterada com sucesso.
                </div>
              )}

              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={changingPassword || !newPassword}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "12px 16px",
                  border: "1px solid var(--bd)",
                  background: "var(--bg-i)",
                  color: "var(--t1)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: changingPassword || !newPassword ? "default" : "pointer",
                  opacity: changingPassword || !newPassword ? 0.5 : 1,
                }}
              >
                {changingPassword ? "Alterando..." : "Alterar senha"}
              </button>
            </div>

            {/* ── Ciclo financeiro ── */}
            <div style={CARD}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>
                Ciclo financeiro
              </h2>
              <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>
                Usado para calcular análises de gastos e Score com precisão.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>Renda mensal</label>
                <div
                  style={{
                    ...INPUT,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t3)", flexShrink: 0 }}>R$</span>
                  <input
                    value={rendaRaw}
                    onChange={(e) => setRendaRaw(formatBRLInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--t1)",
                      height: 44,
                    }}
                  />
                </div>
                {rendaParsed > 0 && (
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                    Atual: {fmt(rendaParsed)}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}>Dia de recebimento</label>
                <input
                  value={paydayDay}
                  onChange={(e) => setPaydayDay(clampDay(Number.parseInt(e.target.value || "5", 10) || 5))}
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={31}
                  style={INPUT}
                />
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                  Define o início do ciclo mensal de análise.
                </div>
              </div>

              <button
                type="button"
                onClick={saveFinanceiro}
                disabled={savingFinanceiro}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "12px 16px",
                  background: "var(--green)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  border: "none",
                  cursor: savingFinanceiro ? "default" : "pointer",
                  opacity: savingFinanceiro ? 0.7 : 1,
                }}
              >
                {savingFinanceiro ? "Salvando..." : "Salvar ciclo"}
              </button>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN (aside)                                        */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <aside className="space-y-5 min-w-0">

            {/* ── Preferências ── */}
            <div style={CARD}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t1)", marginBottom: 16 }}>
                Preferências
              </div>

              {/* Tema */}
              <div
                style={{
                  ...INNER,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)" }}>Tema</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                    {themePreference === "system" ? `Sistema (${theme === "dark" ? "escuro" : "claro"})` : themePreference === "dark" ? "Modo escuro" : "Modo claro"}
                  </div>
                </div>
                <Toggle on={theme === "dark"} onToggle={cycleThemePreference} />
              </div>

              {/* Idioma */}
              <div style={{ ...INNER, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 10 }}>Idioma</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["pt", "en", "es"] as const).map((l) => {
                    const active = l === lang
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => void setLanguageAndPersist(l)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: 8,
                          border: active ? "1px solid var(--green)" : "1px solid var(--bd)",
                          background: active ? "rgba(22,163,74,0.14)" : "transparent",
                          color: active ? "var(--green-b, var(--green))" : "var(--t2)",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {l.toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Moeda */}
              <div style={{ ...INNER, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 10 }}>Moeda</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["BRL", "USD"] as const).map((c) => {
                    const active = String(currency || "BRL").toUpperCase() === c
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => void setCurrencyAndPersist(c)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: 8,
                          border: active ? "1px solid var(--green)" : "1px solid var(--bd)",
                          background: active ? "rgba(22,163,74,0.14)" : "transparent",
                          color: active ? "var(--green-b, var(--green))" : "var(--t2)",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Formato de data */}
              <div style={{ ...INNER, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 10 }}>Formato de data</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["pt-BR", "en-US"] as const).map((c) => {
                    const active = String(dateLocale || "pt-BR") === c
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => void setDateLocaleAndPersist(c)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: 8,
                          border: active ? "1px solid var(--green)" : "1px solid var(--bd)",
                          background: active ? "rgba(22,163,74,0.14)" : "transparent",
                          color: active ? "var(--green-b, var(--green))" : "var(--t2)",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notificações */}
              <div
                style={{
                  ...INNER,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)" }}>Notificações</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                    {notifications ? "Ativas" : "Desativadas"}
                  </div>
                </div>
                <Toggle on={notifications} onToggle={toggleNotifications} />
              </div>
            </div>

            {/* ── Conta ── */}
            <div style={CARD}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t1)", marginBottom: 14 }}>Conta</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={INNER}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Plano
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginTop: 4, textTransform: "capitalize" }}>
                    {plano}
                  </div>
                </div>
                <div style={INNER}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Email
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--t2)",
                      marginTop: 4,
                      wordBreak: "break-all" as const,
                    }}
                  >
                    {userEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Dados & Privacidade ── */}
            <div style={CARD}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t1)", marginBottom: 6 }}>
                Dados & Privacidade
              </div>
              <p style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.6, marginBottom: 14 }}>
                A Openfy nunca solicita sua senha bancária. Seus dados ficam protegidos e você tem controle total.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 14 }}>
                <Link
                  to="/privacidade"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t2)",
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid var(--bd)",
                    background: "var(--bg-i)",
                    textDecoration: "none",
                  }}
                >
                  Privacidade
                </Link>
                <Link
                  to="/termos"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t2)",
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid var(--bd)",
                    background: "var(--bg-i)",
                    textDecoration: "none",
                  }}
                >
                  Termos de Uso
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Export */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "11px 16px",
                    border: "1px solid var(--bd)",
                    background: "var(--bg-i)",
                    color: "var(--t1)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: exporting ? "default" : "pointer",
                    opacity: exporting ? 0.6 : 1,
                    textAlign: "left" as const,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {exporting ? "Gerando exportação..." : "Exportar meus dados (JSON)"}
                </button>

                {/* Delete transactions */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteTransacoesText("")}
                      disabled={deletingTransacoes}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        padding: "11px 16px",
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.07)",
                        color: "#EF4444",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: deletingTransacoes ? "default" : "pointer",
                        opacity: deletingTransacoes ? 0.6 : 1,
                        textAlign: "left" as const,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                      {deletingTransacoes ? "Apagando..." : "Apagar todas as transações"}
                    </button>
                  </AlertDialogTrigger>

                  <AlertDialogContent
                    className="border"
                    style={{ background: "var(--bg-c)", borderColor: "var(--bd)", color: "var(--t1)" }}
                  >
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar transações</AlertDialogTitle>
                      <AlertDialogDescription style={{ color: "var(--t3)" }}>
                        Isso apaga <b>todas</b> as suas transações (incluindo importações). Não é possível desfazer.
                        Para confirmar, digite <b>APAGAR</b> abaixo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                      <input
                        value={confirmDeleteTransacoesText}
                        onChange={(e) => setConfirmDeleteTransacoesText(e.target.value)}
                        placeholder="Digite APAGAR"
                        style={{ ...INPUT, marginTop: 8 }}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        className="border"
                        style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="border"
                        disabled={confirmDeleteTransacoesText.trim().toUpperCase() !== "APAGAR" || deletingTransacoes}
                        style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
                        onClick={() => handleDeleteAllTransacoes()}
                      >
                        Apagar agora
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete account */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={requestingDelete}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        padding: "11px 16px",
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.07)",
                        color: "#EF4444",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: requestingDelete ? "default" : "pointer",
                        opacity: requestingDelete ? 0.6 : 1,
                        textAlign: "left" as const,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      {requestingDelete ? "Registrando..." : "Solicitar exclusão da conta"}
                    </button>
                  </AlertDialogTrigger>

                  <AlertDialogContent
                    className="border"
                    style={{ background: "var(--bg-c)", borderColor: "var(--bd)", color: "var(--t1)" }}
                  >
                    <AlertDialogHeader>
                      <AlertDialogTitle>Solicitar exclusão</AlertDialogTitle>
                      <AlertDialogDescription style={{ color: "var(--t3)" }}>
                        Isso registra um pedido de exclusão definitiva. A remoção completa da sua conta e dados
                        acontecerá em até 30 dias.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        className="border"
                        style={{ borderColor: "var(--bd)", background: "var(--bg-i)", color: "var(--t1)" }}
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="border"
                        style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
                        onClick={() => handleDeleteRequest()}
                      >
                        Confirmar solicitação
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
