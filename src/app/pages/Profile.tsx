import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  Edit3, LogOut, Bell, Globe, DollarSign, Shield,
  ChevronRight, Check, X, Camera, TrendingUp, Download, Trash2,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { getProfile, upsertProfile } from "../../lib/queries"
import { logAudit } from "../../lib/audit"
import { nomeSchema, telefoneSchema } from "../../lib/validations"
import type { Profile as ProfileType } from "../../lib/types"
import { ConfigureIncomeModal } from "../components/dashboard/ConfigureIncomeModal"

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export default function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const userEmail = user?.email ?? ""

  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [currency, setCurrency] = useState("BRL")
  const [language, setLanguage] = useState("Português")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"dados" | "plano" | "preferencias" | "seguranca" | "privacidade">("dados")

  const [form, setForm] = useState({ nome: "", telefone: "", data_nascimento: "" })
  const [tempForm, setTempForm] = useState(form)
  const [metaEconomia, setMetaEconomia] = useState("")

  const [exportando, setExportando] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [deletando, setDeletando] = useState(false)
  const [marketingToggle, setMarketingToggle] = useState(false)

  useEffect(() => {
    getProfile(userId).then((p) => {
      if (p) {
        setProfile(p)
        const f = {
          nome: p.nome || user?.user_metadata?.full_name || userEmail.split("@")[0] || "",
          telefone: p.telefone || "",
          data_nascimento: p.data_nascimento || "",
        }
        setForm(f)
        setTempForm(f)
        setMetaEconomia(
          p.meta_economia
            ? p.meta_economia.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
            : ""
        )
        setMarketingToggle(p.consentimento_marketing ?? false)
      } else {
        const f = {
          nome: user?.user_metadata?.full_name || userEmail.split("@")[0] || "",
          telefone: user?.user_metadata?.phone || "",
          data_nascimento: user?.user_metadata?.birth_date || "",
        }
        setForm(f)
        setTempForm(f)
      }
    })
  }, [userId])

  function validateForm() {
    const errs: Record<string, string> = {}
    const nomeResult = nomeSchema.safeParse(tempForm.nome)
    if (!nomeResult.success) errs.nome = nomeResult.error.issues[0].message
    if (tempForm.telefone) {
      const telResult = telefoneSchema.safeParse(tempForm.telefone)
      if (!telResult.success) errs.telefone = telResult.error.issues[0].message
    }
    return errs
  }

  const handleSave = async () => {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})
    setSaving(true)
    try {
      const updated = await upsertProfile(userId, userEmail, {
        nome: tempForm.nome,
        telefone: tempForm.telefone || undefined,
        data_nascimento: tempForm.data_nascimento || null,
        plano: profile?.plano ?? "free",
        renda_mensal: profile?.renda_mensal ?? 0,
        meta_economia: profile?.meta_economia ?? 0,
      })
      setProfile(updated)
      setForm(tempForm)
      setEditing(false)
      await logAudit(userId, "alteracao_dados", { campos: Object.keys(tempForm) })
      toast.success("Perfil atualizado!", { duration: 3000 })
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async () => {
    const valor = parseFloat(metaEconomia.replace(/\./g, "").replace(",", ".")) || 0
    try {
      const updated = await upsertProfile(userId, userEmail, {
        nome: form.nome,
        telefone: form.telefone || undefined,
        data_nascimento: form.data_nascimento || null,
        plano: profile?.plano ?? "free",
        renda_mensal: profile?.renda_mensal ?? 0,
        meta_economia: valor,
      })
      setProfile(updated)
      toast.success("Meta atualizada!", { duration: 2500 })
    } catch {
      toast.error("Erro ao salvar meta.")
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logAudit(userId, "logout", { email: userEmail })
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  const handleExportData = async () => {
    setExportando(true)
    try {
      const [profileRes, transacoesRes, metasRes, auditRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("transacoes").select("*, categorias(*)").eq("user_id", userId),
        supabase.from("metas").select("*").eq("user_id", userId),
        supabase.from("audit_logs").select("acao, detalhes, criado_em").eq("user_id", userId).order("criado_em", { ascending: false }).limit(100),
      ])

      const exportData = {
        exportado_em: new Date().toISOString(),
        versao: "1.0",
        perfil: profileRes.data,
        transacoes: transacoesRes.data ?? [],
        metas: metasRes.data ?? [],
        historico_acoes: auditRes.data ?? [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `openfy-dados-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      await logAudit(userId, "exportacao_dados", { email: userEmail })
      toast.success("Dados exportados com sucesso!")
    } catch {
      toast.error("Erro ao exportar dados.")
    } finally {
      setExportando(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== "EXCLUIR") return
    setDeletando(true)
    try {
      await logAudit(userId, "exclusao_conta", { email: userEmail })
      await supabase.from("transacoes").delete().eq("user_id", userId)
      await supabase.from("metas").delete().eq("user_id", userId)
      await supabase.from("profiles").delete().eq("id", userId)
      const { error } = await supabase.rpc("delete_user")
      if (error) throw error
      await supabase.auth.signOut()
      navigate("/", { replace: true })
    } catch {
      toast.error("Erro ao excluir conta. Entre em contato: suporte@openfy.app")
      setDeletando(false)
    }
  }

  const handleMarketingToggle = async (value: boolean) => {
    setMarketingToggle(value)
    try {
      await supabase
        .from("profiles")
        .update({ consentimento_marketing: value })
        .eq("id", userId)
      await logAudit(userId, "alteracao_consentimento_marketing", { consentimento_marketing: value })
      toast.success(value ? "E-mails de marketing ativados" : "E-mails de marketing desativados", { duration: 2000 })
    } catch {
      setMarketingToggle(!value)
      toast.error("Erro ao atualizar preferência.")
    }
  }

  const displayName = form.nome || userEmail.split("@")[0] || "Usuário"
  const avatarLetter = displayName.charAt(0).toUpperCase()
  const plano = profile?.plano ?? "free"
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : ""
  const rendaMensal = profile?.renda_mensal ?? 0

  const TABS = [
    { key: "dados", label: "Dados" },
    { key: "plano", label: "Plano" },
    { key: "preferencias", label: "Preferências" },
    { key: "seguranca", label: "Segurança" },
    { key: "privacidade", label: "Privacidade" },
  ] as const

  const cardStyle: React.CSSProperties = {
    background: "var(--of-surface)",
    borderRadius: 16,
    border: "1px solid var(--of-border)",
    marginBottom: 16,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #E0E0E0",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "var(--of-text)",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  }

  return (
    <>
      <div style={{ padding: "20px", maxWidth: 680, margin: "0 auto" }} className="lg:p-6">

        {/* Profile card */}
        <div style={{ ...cardStyle, padding: "24px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--of-btn-bg)", color: "var(--of-btn-text)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 700, margin: "0 auto",
            }}>
              {avatarLetter}
            </div>
            <button style={{
              position: "absolute", bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: "50%",
              background: "var(--of-surface)", border: "1px solid var(--of-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            }}>
              <Camera size={12} style={{ color: "var(--of-text-secondary)" }} />
            </button>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text)" }}>{displayName}</h2>
          <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>{userEmail}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
            {memberSince && (
              <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>Membro desde {memberSince}</p>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              padding: "2px 8px", borderRadius: 10,
              backgroundColor: plano === "pro" ? "var(--of-btn-bg)" : "var(--of-badge-free-bg)",
              color: plano === "pro" ? "var(--of-btn-text)" : "var(--of-badge-free-text)",
            }}>
              {plano === "pro" ? "PRO" : "FREE"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          background: "var(--of-page-bg)",
          borderRadius: 10,
          padding: 4,
          marginBottom: 20,
          gap: 4,
          overflowX: "auto",
        }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, padding: "8px 4px", border: "none",
                borderRadius: 7, cursor: "pointer",
                fontSize: 12, fontWeight: activeTab === key ? 600 : 400,
                transition: "all 0.15s",
                backgroundColor: activeTab === key ? "var(--of-surface)" : "transparent",
                color: activeTab === key ? "var(--of-text)" : "var(--of-text-secondary)",
                boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB: Dados pessoais */}
        {activeTab === "dados" && (
          <>
            <div style={cardStyle}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)",
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>Dados Pessoais</h3>
                {!editing ? (
                  <button
                    onClick={() => { setTempForm(form); setEditing(true) }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 500, color: "var(--of-text-secondary)", transition: "color 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--of-text)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--of-text-secondary)")}
                  >
                    <Edit3 size={13} />
                    Editar
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setTempForm(form); setEditing(false); setFieldErrors({}) }}
                      disabled={saving}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "5px 12px", border: "1px solid var(--of-border)",
                        borderRadius: 7, fontSize: 12, fontWeight: 500,
                        color: "var(--of-text-secondary)", background: "var(--of-surface)", cursor: "pointer",
                      }}
                    >
                      <X size={12} /> Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "5px 12px", border: "none",
                        borderRadius: 7, fontSize: 12, fontWeight: 600,
                        color: "var(--of-btn-text)", background: "var(--of-btn-bg)", cursor: "pointer",
                      }}
                    >
                      {saving
                        ? <span style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#FFF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                        : <Check size={12} />
                      }
                      Salvar
                    </button>
                  </div>
                )}
              </div>

              <div>
                {[
                  { label: "Nome Completo", field: "nome", type: "text", placeholder: "Seu nome" },
                  { label: "Telefone", field: "telefone", type: "tel", placeholder: "(11) 99999-0000" },
                  { label: "Data de Nascimento", field: "data_nascimento", type: "date", placeholder: "" },
                ].map(({ label, field, type, placeholder }, idx, arr) => (
                  <div key={field} style={{
                    padding: "14px 20px",
                    borderBottom: idx < arr.length - 1 ? "1px solid var(--of-border-light)" : "none",
                  }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      {label}
                    </label>
                    {editing ? (
                      <>
                        <input
                          type={type}
                          value={(tempForm as Record<string, string>)[field]}
                          onChange={(e) => {
                            setTempForm({ ...tempForm, [field]: e.target.value })
                            if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: "" }))
                          }}
                          placeholder={placeholder}
                          style={{
                            ...inputStyle,
                            borderColor: fieldErrors[field] ? "#EF4444" : "#E0E0E0",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = fieldErrors[field] ? "#EF4444" : "var(--of-text)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors[field] ? "#EF4444" : "#E0E0E0")}
                        />
                        {fieldErrors[field] && (
                          <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{fieldErrors[field]}</p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--of-text)" }}>
                        {field === "data_nascimento"
                          ? form.data_nascimento
                            ? new Date(form.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"
                          : (form as Record<string, string>)[field] || "—"
                        }
                      </p>
                    )}
                  </div>
                ))}
                <div style={{ padding: "14px 20px", borderTop: "1px solid var(--of-border-light)" }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Email
                  </label>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--of-text)" }}>{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Renda mensal */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>Renda Mensal</h3>
                <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
                  Configure para análises e score mais precisos
                </p>
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px", background: "#F0FDF4",
                  border: "1px solid #BBF7D0", borderRadius: 12, marginBottom: 16,
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <TrendingUp size={14} style={{ color: "#15803D" }} />
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#15803D" }}>Renda mensal configurada</p>
                    </div>
                    <p style={{ fontSize: 26, fontWeight: 800, color: "#15803D", letterSpacing: "-0.02em" }}>
                      {rendaMensal > 0 ? fmt(rendaMensal) : "Não configurada"}
                    </p>
                  </div>
                  <button
                    onClick={() => setIncomeModalOpen(true)}
                    style={{
                      padding: "8px 16px", border: "none", borderRadius: 8,
                      fontSize: 13, fontWeight: 600, color: "#FFFFFF",
                      background: "#16A34A", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#15803D")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#16A34A")}
                  >
                    {rendaMensal > 0 ? "Editar" : "Configurar"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB: Plano */}
        {activeTab === "plano" && (
          <div style={cardStyle}>
            <div style={{ padding: "20px" }}>
              {plano === "pro" ? (
                <div style={{ padding: "20px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text)" }}>Openfy Pro</h3>
                      <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>R$ 19,90/mês</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                      padding: "3px 10px", borderRadius: 10,
                      backgroundColor: "#16A34A", color: "#FFFFFF",
                    }}>
                      ATIVO
                    </span>
                  </div>
                  {[
                    "Transações ilimitadas",
                    "Score de Saúde completo com 5 pilares",
                    "Relatórios PDF e Excel",
                    "Análise detalhada de gastos",
                  ].map((feature) => (
                    <div key={feature} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Check size={14} style={{ color: "#16A34A", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--of-text-secondary)" }}>{feature}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", background: "var(--of-page-bg)", borderRadius: 12, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--of-text)", marginBottom: 4 }}>Plano Free</h3>
                  <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginBottom: 16 }}>Você está usando o plano gratuito</p>
                  <div style={{ padding: "16px", background: "var(--of-btn-bg)", borderRadius: 10, color: "var(--of-btn-text)" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Upgrade para Pro</p>
                    <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginBottom: 12 }}>
                      IA + Score completo + relatórios ilimitados
                    </p>
                    <a
                      href="/#precos"
                      style={{
                        display: "inline-block", padding: "9px 20px",
                        background: "#16A34A", color: "#FFFFFF",
                        borderRadius: 8, fontSize: 13, fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Ver planos →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Preferências */}
        {activeTab === "preferencias" && (
          <>
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>Meta de Economia</h3>
                <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>Meta mensal de economia (R$)</p>
              </div>
              <div style={{ padding: "20px", display: "flex", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--of-border)", borderRadius: 10, padding: "10px 14px", flex: 1, transition: "border-color 0.15s" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text-muted)", marginRight: 8 }}>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={metaEconomia}
                    onChange={(e) => setMetaEconomia(e.target.value)}
                    placeholder="0,00"
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 18, fontWeight: 700, color: "var(--of-text)", background: "transparent" }}
                    onFocus={(e) => { e.currentTarget.parentElement!.style.borderColor = "var(--of-text)" }}
                    onBlur={(e) => { e.currentTarget.parentElement!.style.borderColor = "var(--of-border)" }}
                  />
                </div>
                <button
                  onClick={handleSaveMeta}
                  style={{
                    padding: "0 20px", border: "none", borderRadius: 10,
                    fontSize: 13, fontWeight: 600, color: "var(--of-btn-text)",
                    background: "var(--of-btn-bg)", cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#262626")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "var(--of-btn-bg)")}
                >
                  Salvar
                </button>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>Configurações</h3>
              </div>

              {[
                {
                  icon: Bell, label: "Notificações", sub: "Alertas de gastos e limites",
                  control: (
                    <button
                      onClick={() => {
                        setNotifications(!notifications)
                        toast.success(notifications ? "Notificações desativadas" : "Notificações ativadas", { duration: 2000 })
                      }}
                      style={{
                        position: "relative", width: 44, height: 24, borderRadius: 12,
                        border: "none", cursor: "pointer", transition: "background 0.2s",
                        backgroundColor: notifications ? "var(--of-btn-bg)" : "var(--of-border)",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 2, left: 2,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "var(--of-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "transform 0.2s",
                        transform: notifications ? "translateX(20px)" : "translateX(0)",
                      }} />
                    </button>
                  ),
                },
                {
                  icon: DollarSign, label: "Moeda", sub: "Moeda padrão para exibição",
                  control: (
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{ border: "1px solid var(--of-border)", borderRadius: 7, padding: "5px 8px", fontSize: 12, color: "var(--of-text)", outline: "none" }}
                    >
                      <option value="BRL">R$ BRL</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  ),
                },
                {
                  icon: Globe, label: "Idioma", sub: "Idioma da interface",
                  control: (
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{ border: "1px solid var(--of-border)", borderRadius: 7, padding: "5px 8px", fontSize: 12, color: "var(--of-text)", outline: "none" }}
                    >
                      <option>Português</option>
                      <option>English</option>
                      <option>Español</option>
                    </select>
                  ),
                },
              ].map(({ icon: Icon, label, sub, control }, idx, arr) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: idx < arr.length - 1 ? "1px solid var(--of-border-light)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: "var(--of-page-bg)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} style={{ color: "var(--of-text-secondary)" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text)" }}>{label}</p>
                      <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{sub}</p>
                    </div>
                  </div>
                  {control}
                </div>
              ))}

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: "var(--of-page-bg)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield size={15} style={{ color: "var(--of-text-secondary)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--of-text)" }}>Segurança</p>
                    <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>Autenticação e privacidade</p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--of-text-muted)" }} />
              </div>
            </div>
          </>
        )}

        {/* TAB: Segurança */}
        {activeTab === "seguranca" && (
          <>
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>Alterar Senha</h3>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {["Senha atual", "Nova senha", "Confirmar nova senha"].map((label) => (
                  <div key={label}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--of-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      {label}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--of-text)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--of-border)")}
                    />
                  </div>
                ))}
                <button
                  style={{
                    alignSelf: "flex-start", padding: "10px 24px",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    color: "var(--of-btn-text)", background: "var(--of-btn-bg)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#262626")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "var(--of-btn-bg)")}
                >
                  Atualizar senha
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB: Privacidade */}
        {activeTab === "privacidade" && (
          <>
            {/* Consentimentos */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--of-border-light)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>Consentimentos LGPD</h3>
                <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginTop: 2 }}>
                  Gerencie suas preferências de privacidade
                </p>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Política — informativo */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10,
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>Política de Privacidade e Termos</p>
                    <p style={{ fontSize: 11, color: "var(--of-text-secondary)", marginTop: 2 }}>
                      Aceito em: {profile?.data_consentimento
                        ? new Date(profile.data_consentimento).toLocaleDateString("pt-BR")
                        : "—"} · v{profile?.versao_politica ?? "1.0"}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#DCFCE7", padding: "3px 10px", borderRadius: 20 }}>
                    Aceito
                  </span>
                </div>

                {/* Marketing toggle */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", background: "var(--of-page-bg)", border: "1px solid var(--of-border)", borderRadius: 10,
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>E-mails de marketing</p>
                    <p style={{ fontSize: 11, color: "var(--of-text-secondary)", marginTop: 2 }}>
                      Dicas financeiras e novidades do Openfy
                    </p>
                  </div>
                  <button
                    onClick={() => handleMarketingToggle(!marketingToggle)}
                    aria-label={marketingToggle ? "Desativar e-mails de marketing" : "Ativar e-mails de marketing"}
                    style={{
                      position: "relative", width: 44, height: 24, borderRadius: 12,
                      border: "none", cursor: "pointer", transition: "background 0.2s",
                      backgroundColor: marketingToggle ? "var(--of-btn-bg)" : "var(--of-border)",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 2, left: 2,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "var(--of-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "transform 0.2s",
                      transform: marketingToggle ? "translateX(20px)" : "translateX(0)",
                    }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Exportar e Excluir */}
            <div style={{ ...cardStyle, border: "1px solid #FCA5A5" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #FCA5A5" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#DC2626" }}>Seus dados (LGPD)</h3>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Exportar */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Download size={14} style={{ color: "var(--of-text-secondary)" }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>Exportar meus dados</p>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginBottom: 12 }}>
                    Baixe todos os seus dados (perfil, transações, metas) em formato JSON — direito garantido pela LGPD.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={exportando}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 20px", border: "1px solid var(--of-border)",
                      borderRadius: 8, fontSize: 13, fontWeight: 500,
                      color: exportando ? "var(--of-text-muted)" : "var(--of-text-secondary)",
                      background: "var(--of-surface)", cursor: exportando ? "not-allowed" : "pointer",
                    }}
                  >
                    {exportando
                      ? <span style={{ width: 14, height: 14, border: "1.5px solid var(--of-text-muted)", borderTopColor: "var(--of-text-secondary)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      : <Download size={14} />
                    }
                    {exportando ? "Exportando..." : "Exportar meus dados"}
                  </button>
                </div>

                {/* Excluir conta */}
                <div style={{ borderTop: "1px solid #FEE2E2", paddingTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Trash2 size={14} style={{ color: "#DC2626" }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#DC2626" }}>Excluir minha conta</p>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginBottom: 12 }}>
                    Esta ação é <strong>irreversível</strong>. Todos os seus dados serão excluídos permanentemente dos nossos servidores.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        padding: "9px 20px", border: "none",
                        borderRadius: 8, fontSize: 13, fontWeight: 600,
                        color: "#FFFFFF", background: "#DC2626", cursor: "pointer",
                      }}
                    >
                      Excluir minha conta
                    </button>
                  ) : (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", marginBottom: 8 }}>
                        Confirmação necessária
                      </p>
                      <p style={{ fontSize: 12, color: "var(--of-text-secondary)", marginBottom: 12 }}>
                        Digite <strong>EXCLUIR</strong> para confirmar a exclusão permanente da sua conta.
                      </p>
                      <input
                        type="text"
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder="EXCLUIR"
                        style={{
                          width: "100%", border: "1px solid #FCA5A5", borderRadius: 8,
                          padding: "10px 12px", fontSize: 14, color: "#DC2626",
                          outline: "none", boxSizing: "border-box", marginBottom: 12,
                          fontWeight: 700, letterSpacing: "0.05em",
                        }}
                      />
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteInput("") }}
                          disabled={deletando}
                          style={{
                            flex: 1, padding: "10px 0", border: "1px solid var(--of-border)",
                            borderRadius: 8, fontSize: 13, fontWeight: 500,
                            color: "var(--of-text-secondary)", background: "var(--of-surface)", cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteInput !== "EXCLUIR" || deletando}
                          style={{
                            flex: 1, padding: "10px 0", border: "none",
                            borderRadius: 8, fontSize: 13, fontWeight: 600,
                            color: "var(--of-btn-text)",
                            background: deleteInput === "EXCLUIR" ? "#DC2626" : "var(--of-border)",
                            cursor: deleteInput === "EXCLUIR" ? "pointer" : "not-allowed",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          }}
                        >
                          {deletando
                            ? <span style={{ width: 14, height: 14, border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#FFF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                            : <Trash2 size={13} />
                          }
                          {deletando ? "Excluindo..." : "Confirmar exclusão"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Logout */}
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: "100%", padding: "12px 0",
              border: "1px solid var(--of-border)", borderRadius: 12,
              fontSize: 14, fontWeight: 600, color: "#DC2626",
              background: "var(--of-surface)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.borderColor = "#DC2626" }}
            onMouseOut={(e) => { e.currentTarget.style.background = "var(--of-surface)"; e.currentTarget.style.borderColor = "var(--of-border)" }}
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        ) : (
          <div style={{ ...cardStyle, padding: "20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)", marginBottom: 4 }}>Confirmar saída?</p>
            <p style={{ fontSize: 13, color: "var(--of-text-muted)", marginBottom: 16 }}>
              Você será desconectado da sua conta.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                style={{
                  flex: 1, padding: "11px 0",
                  border: "1px solid var(--of-border)", borderRadius: 8,
                  fontSize: 14, fontWeight: 500, color: "var(--of-text-secondary)",
                  background: "var(--of-surface)", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  flex: 1, padding: "11px 0",
                  border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 600, color: "#FFFFFF",
                  background: "#DC2626", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loggingOut
                  ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#FFF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  : <LogOut size={14} />
                }
                {loggingOut ? "Saindo..." : "Confirmar saída"}
              </button>
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, textAlign: "center", color: "var(--of-text-muted)", marginTop: 20 }}>
          Openfy v1.0.0 · © {new Date().getFullYear()}
        </p>
      </div>

      <ConfigureIncomeModal
        open={incomeModalOpen}
        onOpenChange={setIncomeModalOpen}
        onSuccess={(total) => {
          setProfile((prev) => prev ? { ...prev, renda_mensal: total } : prev)
        }}
      />
    </>
  )
}
