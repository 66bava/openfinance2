import { useState, useEffect, useCallback } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"
import {
  Users, Settings, BarChart3, Search, Crown, Check, X,
  RefreshCw, Shield, ToggleLeft, ToggleRight, Save, ChevronRight,
  Star, UserCheck, List,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { logAudit } from "../../lib/audit"

const ADMIN_EMAIL = "pedrinhotwich@gmail.com"

interface UserProfile {
  id: string
  email: string
  nome: string
  plano: string
  cargo?: string | null
  criado_em?: string
  avatar_url?: string
}

interface ActivationLog {
  id: string
  user_id: string
  acao: string
  detalhes: Record<string, unknown> | null
  criado_em: string
}

interface SiteConfig {
  beta_fechado: boolean
  whatsapp_numero: string
  payment_link: string
}

type PlanFilter = "todos" | "free" | "beta" | "pro"
type UsersView = "buscar" | "lista"

const PLAN_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  pro: { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  beta: { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
  free: { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
}

function PlanBadge({ plano }: { plano: string }) {
  const s = PLAN_STYLES[plano] ?? PLAN_STYLES.free
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 10,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {plano.toUpperCase()}
    </span>
  )
}

function CargoBadge({ cargo }: { cargo?: string | null }) {
  if (!cargo) return null
  const labels: Record<string, string> = { ceo: "CEO", beta_tester: "Beta Tester" }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 10,
      background: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A",
    }}>
      {labels[cargo] ?? cargo.toUpperCase()}
    </span>
  )
}

function Avatar({ nome, size = 32 }: { nome: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#374151", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontSize: size * 0.4, fontWeight: 700, color: "#FFFFFF",
    }}>
      {(nome || "?").charAt(0).toUpperCase()}
    </div>
  )
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"painel" | "usuarios" | "configuracoes">("painel")

  // Stats
  const [totalUsers, setTotalUsers] = useState(0)
  const [proUsers, setProUsers] = useState(0)
  const [betaUsers, setBetaUsers] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentSignups, setRecentSignups] = useState<UserProfile[]>([])

  // Usuários
  const [usersView, setUsersView] = useState<UsersView>("lista")
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null)
  const [searching, setSearching] = useState(false)
  const [activationLogs, setActivationLogs] = useState<ActivationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Lista de usuários
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [allUsersLoading, setAllUsersLoading] = useState(false)
  const [planFilter, setPlanFilter] = useState<PlanFilter>("todos")
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [changingCargo, setChangingCargo] = useState<string | null>(null)

  // Configurações
  const [config, setConfig] = useState<SiteConfig>({
    beta_fechado: false,
    whatsapp_numero: "5511999999999",
    payment_link: "/obrigado?plano=pro",
  })
  const [configLoading, setConfigLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const [totalRes, proRes, betaRes, recentRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plano", "pro"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plano", "beta"),
        supabase.from("profiles").select("id, email, nome, plano, cargo, criado_em").order("criado_em", { ascending: false }).limit(5),
      ])
      setTotalUsers(totalRes.count ?? 0)
      setProUsers(proRes.count ?? 0)
      setBetaUsers(betaRes.count ?? 0)
      setRecentSignups(recentRes.data ?? [])
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadAllUsers = useCallback(async () => {
    setAllUsersLoading(true)
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, nome, plano, cargo, criado_em, avatar_url")
        .order("criado_em", { ascending: false })
        .limit(200)
      setAllUsers(data ?? [])
    } finally {
      setAllUsersLoading(false)
    }
  }, [])

  const loadActivationLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .in("acao", ["ativacao_pro_manual", "set_plano_pro", "set_plano_beta", "set_plano_free", "desativacao_pro_manual"])
        .order("criado_em", { ascending: false })
        .limit(20)
      setActivationLogs(data ?? [])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const loadConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const { data } = await supabase
        .from("app_config")
        .select("chave, valor")
        .in("chave", ["beta_fechado", "whatsapp_numero", "payment_link"])
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((row) => { map[row.chave] = row.valor })
        setConfig({
          beta_fechado: map["beta_fechado"] === "true",
          whatsapp_numero: map["whatsapp_numero"] ?? "5511999999999",
          payment_link: map["payment_link"] ?? "/obrigado?plano=pro",
        })
      }
    } finally {
      setConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    loadStats()
    loadConfig()
  }, [user])

  useEffect(() => {
    if (activeTab === "usuarios") {
      loadActivationLogs()
      loadAllUsers()
    }
  }, [activeTab])

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F5" }}>
        <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/app" replace />
  }

  const handleSearch = async () => {
    if (!searchEmail.trim()) return
    setSearching(true)
    setSearchResult(null)
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, nome, plano, cargo, avatar_url")
        .ilike("email", searchEmail.trim())
        .maybeSingle()
      setSearchResult(data ?? null)
      if (!data) toast.error("Usuário não encontrado")
    } catch {
      toast.error("Erro ao buscar usuário")
    } finally {
      setSearching(false)
    }
  }

  const handleSetPlan = async (targetUserId: string, targetEmail: string, plano: string) => {
    setChangingPlan(targetUserId)
    try {
      const { error } = await supabase.from("profiles").update({ plano }).eq("id", targetUserId)
      if (error) throw error
      await logAudit(user.id, `set_plano_${plano}`, { target_user_id: targetUserId, target_email: targetEmail })
      setAllUsers((prev) => prev.map((u) => u.id === targetUserId ? { ...u, plano } : u))
      if (searchResult?.id === targetUserId) setSearchResult((prev) => prev ? { ...prev, plano } : prev)
      loadStats()
      loadActivationLogs()
      toast.success(`Plano ${plano.toUpperCase()} aplicado para ${targetEmail}`)
    } catch {
      toast.error("Erro ao atualizar plano.")
    } finally {
      setChangingPlan(null)
    }
  }

  const handleSetCargo = async (targetUserId: string, targetEmail: string, cargo: string | null) => {
    setChangingCargo(targetUserId)
    try {
      const { error } = await supabase.from("profiles").update({ cargo }).eq("id", targetUserId)
      if (error) throw error
      setAllUsers((prev) => prev.map((u) => u.id === targetUserId ? { ...u, cargo } : u))
      if (searchResult?.id === targetUserId) setSearchResult((prev) => prev ? { ...prev, cargo } : prev)
      toast.success(cargo ? `Cargo ${cargo.toUpperCase()} atribuído` : `Cargo removido de ${targetEmail}`)
    } catch {
      toast.error("Erro ao atribuir cargo.")
    } finally {
      setChangingCargo(null)
    }
  }

  const handleSaveConfig = async (chave: string, valor: string) => {
    setSavingConfig(chave)
    try {
      await supabase.from("app_config").upsert({ chave, valor }, { onConflict: "chave" })
      toast.success("Configuração salva!")
    } catch {
      toast.error("Erro ao salvar configuração.")
    } finally {
      setSavingConfig(null)
    }
  }

  const handleToggleBeta = async () => {
    const newVal = !config.beta_fechado
    setConfig((c) => ({ ...c, beta_fechado: newVal }))
    await handleSaveConfig("beta_fechado", String(newVal))
  }

  const filteredUsers = planFilter === "todos" ? allUsers : allUsers.filter((u) => u.plano === planFilter)

  const cardStyle: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    marginBottom: 16,
    overflow: "hidden",
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  }

  const btnSm = (bg: string, color = "#FFFFFF"): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "5px 10px", border: "none", borderRadius: 6,
    fontSize: 11, fontWeight: 700, cursor: "pointer",
    background: bg, color,
  })

  const TABS = [
    { key: "painel", label: "Painel", icon: BarChart3 },
    { key: "usuarios", label: "Usuários", icon: Users },
    { key: "configuracoes", label: "Config", icon: Settings },
  ] as const

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#111827", padding: "0 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={18} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>Openfy Admin</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 10, background: "#374151", color: "#9CA3AF" }}>
              CEO
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar nome={user.email ?? "A"} size={28} />
            <a href="/app" style={{ fontSize: 12, color: "#9CA3AF", textDecoration: "none" }}>← App</a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", padding: "0 16px" }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "14px 16px", border: "none", background: "none",
                fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
                color: activeTab === key ? "#111827" : "#6B7280",
                borderBottom: activeTab === key ? "2px solid #111827" : "2px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── TAB: Painel ── */}
        {activeTab === "painel" && (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>Painel do Founder</h1>
                <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Visão geral da plataforma Openfy</p>
              </div>
              <button
                onClick={loadStats}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "#374151", background: "#FFFFFF", cursor: "pointer" }}
              >
                <RefreshCw size={12} /> Atualizar
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total de usuários", value: statsLoading ? "—" : totalUsers, color: "#111827", bg: "#F9FAFB" },
                { label: "Plano Pro", value: statsLoading ? "—" : proUsers, color: "#16A34A", bg: "#F0FDF4" },
                { label: "Plano Beta", value: statsLoading ? "—" : betaUsers, color: "#4F46E5", bg: "#EEF2FF" },
                { label: "Plano Free", value: statsLoading ? "—" : totalUsers - proUsers - betaUsers, color: "#6B7280", bg: "#F3F4F6" },
                {
                  label: "Taxa pago",
                  value: statsLoading || totalUsers === 0 ? "—" : `${Math.round(((proUsers + betaUsers) / totalUsers) * 100)}%`,
                  color: "#7C3AED", bg: "#F5F3FF",
                },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: "16px 18px", border: "1px solid #E5E7EB" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{String(value)}</p>
                </div>
              ))}
            </div>

            {/* Últimos cadastros */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Últimos cadastros</h3>
                <button onClick={() => setActiveTab("usuarios")} style={{ fontSize: 12, fontWeight: 600, color: "#4F46E5", background: "none", border: "none", cursor: "pointer" }}>
                  Ver todos →
                </button>
              </div>
              {statsLoading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <span style={{ width: 18, height: 18, border: "2px solid #E5E7EB", borderTopColor: "#111", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                </div>
              ) : recentSignups.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhum cadastro ainda.</p>
                </div>
              ) : (
                recentSignups.map((u, idx) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: idx < recentSignups.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <Avatar nome={u.nome || u.email} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.nome || u.email}
                      </p>
                      <p style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                      </p>
                    </div>
                    <PlanBadge plano={u.plano} />
                    {u.cargo && <CargoBadge cargo={u.cargo} />}
                  </div>
                ))
              )}
            </div>

            {/* Ações rápidas */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Ações rápidas</h3>
              </div>
              {[
                { label: "Gerenciar usuários e planos", sub: "Lista completa, ativar Pro/Beta, atribuir CEO", action: () => setActiveTab("usuarios") },
                { label: "Configurações do site", sub: "Beta fechado, WhatsApp, links de pagamento", action: () => setActiveTab("configuracoes") },
              ].map(({ label, sub, action }) => (
                <button key={label} onClick={action} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", border: "none", background: "none", cursor: "pointer",
                  borderBottom: "1px solid #F3F4F6", textAlign: "left",
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{label}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{sub}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── TAB: Usuários ── */}
        {activeTab === "usuarios" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Gerenciar Usuários</h2>
              {/* View toggle */}
              <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
                {([
                  { key: "lista", label: "Lista", icon: List },
                  { key: "buscar", label: "Buscar", icon: Search },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setUsersView(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 12px", border: "none", borderRadius: 6,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: usersView === key ? "#FFFFFF" : "none",
                      color: usersView === key ? "#111827" : "#6B7280",
                      boxShadow: usersView === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── View: Lista de usuários ── */}
            {usersView === "lista" && (
              <>
                {/* Plan filter tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {(["todos", "free", "beta", "pro"] as PlanFilter[]).map((f) => {
                    const count = f === "todos" ? allUsers.length : allUsers.filter((u) => u.plano === f).length
                    return (
                      <button
                        key={f}
                        onClick={() => setPlanFilter(f)}
                        style={{
                          padding: "6px 14px", border: "1px solid", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          cursor: "pointer", transition: "all 0.15s",
                          background: planFilter === f ? "#111827" : "#FFFFFF",
                          color: planFilter === f ? "#FFFFFF" : "#6B7280",
                          borderColor: planFilter === f ? "#111827" : "#E5E7EB",
                        }}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)} {allUsersLoading ? "" : `(${count})`}
                      </button>
                    )
                  })}
                  <button
                    onClick={loadAllUsers}
                    style={{ padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "#FFFFFF", color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <RefreshCw size={11} /> Recarregar
                  </button>
                </div>

                <div style={cardStyle}>
                  {allUsersLoading ? (
                    <div style={{ padding: 40, textAlign: "center" }}>
                      <span style={{ width: 22, height: 22, border: "2px solid #E5E7EB", borderTopColor: "#111", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhum usuário neste filtro.</p>
                    </div>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <div key={u.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                        borderBottom: idx < filteredUsers.length - 1 ? "1px solid #F3F4F6" : "none",
                        flexWrap: "wrap",
                      }}>
                        <Avatar nome={u.nome || u.email} size={34} />

                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{u.nome || "—"}</span>
                            <PlanBadge plano={u.plano} />
                            {u.cargo && <CargoBadge cargo={u.cargo} />}
                          </div>
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{u.email}</span>
                          {u.criado_em && (
                            <span style={{ fontSize: 11, color: "#D1D5DB", marginLeft: 8 }}>
                              · {new Date(u.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>

                        {/* Plan actions */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {u.plano !== "pro" && (
                            <button
                              onClick={() => handleSetPlan(u.id, u.email, "pro")}
                              disabled={changingPlan === u.id}
                              style={{ ...btnSm("#16A34A"), opacity: changingPlan === u.id ? 0.6 : 1 }}
                            >
                              <Crown size={10} /> Pro
                            </button>
                          )}
                          {u.plano !== "beta" && (
                            <button
                              onClick={() => handleSetPlan(u.id, u.email, "beta")}
                              disabled={changingPlan === u.id}
                              style={{ ...btnSm("#4F46E5"), opacity: changingPlan === u.id ? 0.6 : 1 }}
                            >
                              <Star size={10} /> Beta
                            </button>
                          )}
                          {u.plano !== "free" && (
                            <button
                              onClick={() => handleSetPlan(u.id, u.email, "free")}
                              disabled={changingPlan === u.id}
                              style={{ ...btnSm("#F3F4F6", "#6B7280"), border: "1px solid #E5E7EB", opacity: changingPlan === u.id ? 0.6 : 1 }}
                            >
                              <X size={10} /> Free
                            </button>
                          )}
                          {/* Cargo CEO */}
                          {u.cargo !== "ceo" ? (
                            <button
                              onClick={() => handleSetCargo(u.id, u.email, "ceo")}
                              disabled={changingCargo === u.id}
                              style={{ ...btnSm("#FEF3C7", "#D97706"), border: "1px solid #FDE68A", opacity: changingCargo === u.id ? 0.6 : 1 }}
                            >
                              <UserCheck size={10} /> CEO
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetCargo(u.id, u.email, null)}
                              disabled={changingCargo === u.id}
                              style={{ ...btnSm("#FEF3C7", "#D97706"), border: "1px solid #FDE68A", opacity: changingCargo === u.id ? 0.6 : 1 }}
                            >
                              <X size={10} /> Rem. cargo
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── View: Buscar por email ── */}
            {usersView === "buscar" && (
              <>
                <div style={cardStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Buscar usuário por email</h3>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
                        placeholder="usuario@email.com"
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#111827")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searching}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          color: "#FFFFFF", background: "#111827", cursor: searching ? "not-allowed" : "pointer",
                          opacity: searching ? 0.7 : 1, flexShrink: 0,
                        }}
                      >
                        {searching
                          ? <span style={{ width: 14, height: 14, border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#FFF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                          : <Search size={14} />
                        }
                        Buscar
                      </button>
                    </div>

                    {searchResult && (
                      <div style={{ marginTop: 16, background: "#F9FAFB", borderRadius: 10, padding: "16px 20px", border: "1px solid #E5E7EB" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{searchResult.nome || "—"}</p>
                              <PlanBadge plano={searchResult.plano} />
                              {searchResult.cargo && <CargoBadge cargo={searchResult.cargo} />}
                            </div>
                            <p style={{ fontSize: 13, color: "#6B7280" }}>{searchResult.email}</p>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {searchResult.plano !== "pro" && (
                              <button onClick={() => handleSetPlan(searchResult.id, searchResult.email, "pro")} disabled={changingPlan === searchResult.id} style={{ ...btnSm("#16A34A"), padding: "8px 14px", fontSize: 13 }}>
                                <Crown size={12} /> Ativar Pro
                              </button>
                            )}
                            {searchResult.plano !== "beta" && (
                              <button onClick={() => handleSetPlan(searchResult.id, searchResult.email, "beta")} disabled={changingPlan === searchResult.id} style={{ ...btnSm("#4F46E5"), padding: "8px 14px", fontSize: 13 }}>
                                <Star size={12} /> Ativar Beta
                              </button>
                            )}
                            {searchResult.plano !== "free" && (
                              <button onClick={() => handleSetPlan(searchResult.id, searchResult.email, "free")} disabled={changingPlan === searchResult.id} style={{ ...btnSm("#F3F4F6", "#6B7280"), border: "1px solid #E5E7EB", padding: "8px 14px", fontSize: 13 }}>
                                <X size={12} /> Reverter Free
                              </button>
                            )}
                            {searchResult.cargo !== "ceo" ? (
                              <button onClick={() => handleSetCargo(searchResult.id, searchResult.email, "ceo")} disabled={changingCargo === searchResult.id} style={{ ...btnSm("#FEF3C7", "#D97706"), border: "1px solid #FDE68A", padding: "8px 14px", fontSize: 13 }}>
                                <UserCheck size={12} /> Tornar CEO
                              </button>
                            ) : (
                              <button onClick={() => handleSetCargo(searchResult.id, searchResult.email, null)} disabled={changingCargo === searchResult.id} style={{ ...btnSm("#FEF3C7", "#D97706"), border: "1px solid #FDE68A", padding: "8px 14px", fontSize: 13 }}>
                                <X size={12} /> Rem. cargo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Histórico */}
                <div style={cardStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Histórico de alterações de plano</h3>
                    <button onClick={loadActivationLogs} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}>
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  {logsLoading ? (
                    <div style={{ padding: 32, textAlign: "center" }}>
                      <span style={{ width: 20, height: 20, border: "2px solid #E5E7EB", borderTopColor: "#111827", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    </div>
                  ) : activationLogs.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhuma alteração registrada ainda.</p>
                    </div>
                  ) : (
                    activationLogs.map((log, idx) => {
                      const isPro = log.acao.includes("pro")
                      const isBeta = log.acao.includes("beta")
                      return (
                        <div key={log.id} style={{
                          padding: "12px 20px",
                          borderBottom: idx < activationLogs.length - 1 ? "1px solid #F3F4F6" : "none",
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPro ? "#F0FDF4" : isBeta ? "#EEF2FF" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isPro ? <Check size={13} style={{ color: "#16A34A" }} /> : isBeta ? <Star size={13} style={{ color: "#4F46E5" }} /> : <X size={13} style={{ color: "#6B7280" }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {(log.detalhes as any)?.target_email ?? log.user_id}
                            </p>
                            <p style={{ fontSize: 11, color: "#9CA3AF" }}>
                              {log.acao.replace("set_plano_", "→ ").replace("ativacao_pro_manual", "→ pro").replace("desativacao_pro_manual", "→ free")}
                              {" · "}
                              {new Date(log.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          {isPro && <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>PRO</span>}
                          {isBeta && <span style={{ fontSize: 10, fontWeight: 700, color: "#4F46E5", background: "#EEF2FF", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>BETA</span>}
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── TAB: Configurações ── */}
        {activeTab === "configuracoes" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Configurações do Site</h2>

            {configLoading ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <span style={{ width: 24, height: 24, border: "2px solid #E5E7EB", borderTopColor: "#111827", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              </div>
            ) : (
              <>
                {/* Beta fechado */}
                <div style={cardStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Acesso Beta</h3>
                  </div>
                  <div style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 2 }}>Beta fechado</p>
                      <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                        Quando ativo, apenas e-mails na whitelist podem criar conta.
                        <br />
                        <span style={{ color: config.beta_fechado ? "#DC2626" : "#16A34A", fontWeight: 600 }}>
                          {config.beta_fechado ? "⚠ Cadastros fechados" : "✓ Cadastros abertos"}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={handleToggleBeta}
                      disabled={savingConfig === "beta_fechado"}
                      style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, opacity: savingConfig === "beta_fechado" ? 0.5 : 1 }}
                    >
                      {config.beta_fechado
                        ? <ToggleRight size={40} style={{ color: "#DC2626" }} />
                        : <ToggleLeft size={40} style={{ color: "#D1D5DB" }} />
                      }
                    </button>
                  </div>
                </div>

                {/* WhatsApp */}
                <div style={cardStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Número WhatsApp</h3>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Formato: 5511999999999</p>
                  </div>
                  <div style={{ padding: "20px", display: "flex", gap: 10 }}>
                    <input
                      type="tel"
                      value={config.whatsapp_numero}
                      onChange={(e) => setConfig((c) => ({ ...c, whatsapp_numero: e.target.value }))}
                      placeholder="5511999999999"
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#111827")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                    <button
                      onClick={() => handleSaveConfig("whatsapp_numero", config.whatsapp_numero)}
                      disabled={savingConfig === "whatsapp_numero"}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#FFFFFF", background: "#111827", cursor: "pointer", flexShrink: 0, opacity: savingConfig === "whatsapp_numero" ? 0.7 : 1 }}
                    >
                      <Save size={13} /> Salvar
                    </button>
                  </div>
                </div>

                {/* Link de pagamento */}
                <div style={cardStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Link de Pagamento</h3>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>URL do Hotmart, Mercado Pago ou similar</p>
                  </div>
                  <div style={{ padding: "20px", display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      value={config.payment_link}
                      onChange={(e) => setConfig((c) => ({ ...c, payment_link: e.target.value }))}
                      placeholder="https://pay.hotmart.com/..."
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#111827")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                    <button
                      onClick={() => handleSaveConfig("payment_link", config.payment_link)}
                      disabled={savingConfig === "payment_link"}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#FFFFFF", background: "#111827", cursor: "pointer", flexShrink: 0, opacity: savingConfig === "payment_link" ? 0.7 : 1 }}
                    >
                      <Save size={13} /> Salvar
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
