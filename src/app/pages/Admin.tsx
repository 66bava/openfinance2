import { useState, useEffect, useCallback } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"
import {
  Users, Settings, BarChart3, Search, Crown, Check, X,
  RefreshCw, Shield, ToggleLeft, ToggleRight, Save, ChevronRight,
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

export default function Admin() {
  const { user, loading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<"painel" | "usuarios" | "configuracoes">("painel")

  // Stats
  const [totalUsers, setTotalUsers] = useState(0)
  const [proUsers, setProUsers] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)

  // Usuários
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null)
  const [searching, setSearching] = useState(false)
  const [activating, setActivating] = useState(false)
  const [activationLogs, setActivationLogs] = useState<ActivationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

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
      const [totalRes, proRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plano", "pro"),
      ])
      setTotalUsers(totalRes.count ?? 0)
      setProUsers(proRes.count ?? 0)
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadActivationLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("acao", "ativacao_pro_manual")
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
    if (activeTab === "usuarios") loadActivationLogs()
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
        .select("id, email, nome, plano, avatar_url")
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

  const handleActivatePro = async (targetUserId: string, targetEmail: string) => {
    setActivating(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ plano: "pro" })
        .eq("id", targetUserId)
      if (error) throw error

      await logAudit(user.id, "ativacao_pro_manual", { target_user_id: targetUserId, target_email: targetEmail })

      setSearchResult((prev) => prev ? { ...prev, plano: "pro" } : prev)
      setTotalUsers((n) => n) // refresh display
      setProUsers((n) => n + 1)
      toast.success(`Plano Pro ativado para ${targetEmail}!`)
      loadActivationLogs()
    } catch {
      toast.error("Erro ao ativar plano. Verifique se a migration de admin foi aplicada.")
    } finally {
      setActivating(false)
    }
  }

  const handleDeactivatePro = async (targetUserId: string, targetEmail: string) => {
    setActivating(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ plano: "free" })
        .eq("id", targetUserId)
      if (error) throw error

      await logAudit(user.id, "desativacao_pro_manual", { target_user_id: targetUserId, target_email: targetEmail })
      setSearchResult((prev) => prev ? { ...prev, plano: "free" } : prev)
      setProUsers((n) => Math.max(0, n - 1))
      toast.success(`Plano revertido para Free: ${targetEmail}`)
    } catch {
      toast.error("Erro ao reverter plano.")
    } finally {
      setActivating(false)
    }
  }

  const handleSaveConfig = async (chave: string, valor: string) => {
    setSavingConfig(chave)
    try {
      await supabase
        .from("app_config")
        .upsert({ chave, valor }, { onConflict: "chave" })
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

  const TABS = [
    { key: "painel", label: "Painel", icon: BarChart3 },
    { key: "usuarios", label: "Usuários", icon: Users },
    { key: "configuracoes", label: "Config", icon: Settings },
  ] as const

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#111827", padding: "0 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={18} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>Openfy Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF" }}>
                {(user.email ?? "A").charAt(0).toUpperCase()}
              </span>
            </div>
            <a href="/app" style={{ fontSize: 12, color: "#9CA3AF", textDecoration: "none" }}>← App</a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", padding: "0 16px" }}>
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

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* TAB: Painel */}
        {activeTab === "painel" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 6, letterSpacing: "-0.01em" }}>
              Painel do Founder
            </h1>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>
              Visão geral da plataforma Openfy
            </p>

            {/* Stats cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total de usuários", value: statsLoading ? "—" : totalUsers, color: "#111827", bg: "#F9FAFB" },
                { label: "Usuários Pro", value: statsLoading ? "—" : proUsers, color: "#16A34A", bg: "#F0FDF4" },
                { label: "Usuários Free", value: statsLoading ? "—" : totalUsers - proUsers, color: "#2563EB", bg: "#EFF6FF" },
                { label: "Taxa Pro", value: statsLoading || totalUsers === 0 ? "—" : `${Math.round((proUsers / totalUsers) * 100)}%`, color: "#7C3AED", bg: "#F5F3FF" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: "18px 20px", border: "1px solid #E5E7EB" }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={loadStats}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", border: "1px solid #E5E7EB",
                borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: "#374151", background: "#FFFFFF", cursor: "pointer",
                marginBottom: 24,
              }}
            >
              <RefreshCw size={13} /> Atualizar estatísticas
            </button>

            {/* Quick actions */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Ações rápidas</h3>
              </div>
              {[
                { label: "Ativar Pro para usuário", sub: "Buscar por email e ativar plano", action: () => setActiveTab("usuarios") },
                { label: "Gerenciar configurações do site", sub: "Beta, WhatsApp, links de pagamento", action: () => setActiveTab("configuracoes") },
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

        {/* TAB: Usuários */}
        {activeTab === "usuarios" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Gerenciar Usuários</h2>

            {/* Busca */}
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

                {/* Resultado */}
                {searchResult && (
                  <div style={{ marginTop: 16, background: "#F9FAFB", borderRadius: 10, padding: "16px 20px", border: "1px solid #E5E7EB" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{searchResult.nome || "—"}</p>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 10,
                            background: searchResult.plano === "pro" ? "#F0FDF4" : "#F3F4F6",
                            color: searchResult.plano === "pro" ? "#16A34A" : "#6B7280",
                            border: searchResult.plano === "pro" ? "1px solid #BBF7D0" : "1px solid #E5E7EB",
                          }}>
                            {searchResult.plano.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "#6B7280" }}>{searchResult.email}</p>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {searchResult.plano !== "pro" ? (
                          <button
                            onClick={() => handleActivatePro(searchResult.id, searchResult.email)}
                            disabled={activating}
                            style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
                              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                              color: "#FFFFFF", background: "#16A34A", cursor: activating ? "not-allowed" : "pointer",
                              opacity: activating ? 0.7 : 1,
                            }}
                          >
                            {activating
                              ? <span style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#FFF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                              : <Crown size={13} />
                            }
                            Ativar Pro
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeactivatePro(searchResult.id, searchResult.email)}
                            disabled={activating}
                            style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
                              border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontWeight: 600,
                              color: "#6B7280", background: "#FFFFFF", cursor: activating ? "not-allowed" : "pointer",
                            }}
                          >
                            <X size={13} /> Reverter para Free
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de ativações */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Histórico de ativações Pro</h3>
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
                  <p style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhuma ativação registrada ainda.</p>
                </div>
              ) : (
                <div>
                  {activationLogs.map((log, idx) => (
                    <div key={log.id} style={{
                      padding: "12px 20px",
                      borderBottom: idx < activationLogs.length - 1 ? "1px solid #F3F4F6" : "none",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={13} style={{ color: "#16A34A" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(log.detalhes as any)?.target_email ?? log.user_id}
                        </p>
                        <p style={{ fontSize: 11, color: "#9CA3AF" }}>
                          {new Date(log.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
                        PRO
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB: Configurações */}
        {activeTab === "configuracoes" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Configurações do Site</h2>

            {configLoading ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <span style={{ width: 24, height: 24, border: "2px solid #E5E7EB", borderTopColor: "#111827", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              </div>
            ) : (
              <>
                {/* Beta */}
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
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Número que aparece nos botões de upgrade Pro (formato: 5511999999999)</p>
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
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                        border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        color: "#FFFFFF", background: "#111827", cursor: "pointer", flexShrink: 0,
                        opacity: savingConfig === "whatsapp_numero" ? 0.7 : 1,
                      }}
                    >
                      <Save size={13} /> Salvar
                    </button>
                  </div>
                </div>

                {/* Link de pagamento */}
                <div style={cardStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Link de Pagamento</h3>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>URL do Hotmart, Mercado Pago ou similar (ex: /obrigado?plano=pro)</p>
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
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                        border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        color: "#FFFFFF", background: "#111827", cursor: "pointer", flexShrink: 0,
                        opacity: savingConfig === "payment_link" ? 0.7 : 1,
                      }}
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
