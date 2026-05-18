import { useState, useEffect, type FormEvent } from "react"
import { Navigate, Link } from "react-router"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { emailSchema, senhaSchema, nomeSchema } from "../../lib/validations"
import { CURRENT_TERMS_VERSION } from "../../lib/terms"
import { Eye, EyeOff, Check, ArrowRight, TrendingUp, Shield, Zap, Lock } from "lucide-react"

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Score de Saúde Financeira",
    desc: "Descubra em segundos como está sua vida financeira com nosso score exclusivo.",
  },
  {
    icon: Shield,
    title: "Privacidade garantida",
    desc: "Seus dados são seus. Criptografados e protegidos seguindo as regras da LGPD.",
  },
  {
    icon: Zap,
    title: "Análises com IA",
    desc: "Relatórios inteligentes que identificam oportunidades de economia no seu dia a dia.",
  },
]

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "#E5E5E3" }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score, label: "Fraca", color: "#EF4444" }
  if (score === 2) return { score, label: "Regular", color: "#F59E0B" }
  if (score === 3) return { score, label: "Boa", color: "#84CC16" }
  return { score, label: "Forte", color: "#16A34A" }
}

export default function Cadastro() {
  const { user, loading: authLoading } = useAuth()

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [betaFechado, setBetaFechado] = useState(false)
  const [consentimentoPolitica, setConsentimentoPolitica] = useState(false)
  const [consentimentoMarketing, setConsentimentoMarketing] = useState(false)

  const pwdStrength = getPasswordStrength(password)

  useEffect(() => {
    supabase
      .from("app_config")
      .select("valor")
      .eq("chave", "beta_fechado")
      .single()
      .then(({ data }) => {
        if (data?.valor === "true") setBetaFechado(true)
      })
  }, [])

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F0" }}>
        <div style={{ width: 24, height: 24, border: "2.5px solid #16A34A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />

  function validate() {
    const errs: Record<string, string> = {}

    const nomeR = nomeSchema.safeParse(nome)
    if (!nomeR.success) errs.nome = nomeR.error.issues[0].message

    const emailR = emailSchema.safeParse(email)
    if (!emailR.success) errs.email = emailR.error.issues[0].message

    const senhaR = senhaSchema.safeParse(password)
    if (!senhaR.success) errs.password = senhaR.error.issues[0].message

    if (password && confirmPassword && password !== confirmPassword) {
      errs.confirmPassword = "As senhas não coincidem"
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Confirme sua senha"
    }

    if (!consentimentoPolitica) {
      errs.consentimentoPolitica = "Você precisa aceitar a Política de Privacidade para continuar"
    }

    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)

    // Verificar whitelist se beta fechado
    if (betaFechado) {
      const { data: betaCheck, error: betaErr } = await supabase
        .rpc("check_beta_access", { p_email: email.toLowerCase().trim() })

      if (betaErr || !betaCheck?.allowed) {
        setServerError("Cadastros estão fechados. Entre na lista de espera para receber um convite.")
        setLoading(false)
        return
      }

      if (betaCheck.already_used) {
        setServerError("Este convite já foi utilizado. Faça login normalmente.")
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: nome },
      },
    })

    if (error) {
      const msg = error.message.includes("already registered")
        ? "Este e-mail já está em uso. Tente fazer login."
        : error.message
      setServerError(msg)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        nome,
        plano: "free",
        renda_mensal: 0,
        meta_economia: 0,
          consentimento_politica: consentimentoPolitica,
          consentimento_marketing: consentimentoMarketing,
          data_consentimento: new Date().toISOString(),
          versao_politica: CURRENT_TERMS_VERSION,
          versao_termos_aceita: CURRENT_TERMS_VERSION,
          data_aceite_termos: new Date().toISOString(),
        }, { onConflict: "id" })

      await supabase.from("audit_logs").insert({
        user_id: data.user.id,
        acao: "cadastro",
        detalhes: {
            email,
            consentimento_politica: consentimentoPolitica,
            consentimento_marketing: consentimentoMarketing,
            versao_politica: CURRENT_TERMS_VERSION,
            versao_termos_aceita: CURRENT_TERMS_VERSION,
          },
        })

      if (betaFechado) {
        await supabase.rpc("mark_beta_email_used", { p_email: email.toLowerCase().trim() })
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  function clearError(field: string) {
    if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: "" }))
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    border: `1px solid ${fieldErrors[field] ? "#EF4444" : "#E5E5E3"}`,
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 15,
    color: "#0A0A0A",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    background: "#FFFFFF",
    boxSizing: "border-box",
  })

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F0", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#DCFCE7", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Check size={28} style={{ color: "#16A34A" }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0A0A0A", marginBottom: 8 }}>
            Conta criada!
          </h1>
          <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.6, marginBottom: 24 }}>
            Enviamos um link de confirmação para <strong>{email}</strong>. Verifique sua caixa de entrada para ativar sua conta.
          </p>
          <Link
            to="/login"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", background: "#0A0A0A", color: "#FFFFFF",
              borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none",
            }}
          >
            Ir para o login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left panel — Branding */}
      <div
        className="hidden lg:flex"
        style={{
          width: "45%",
          background: "#0A0A0A",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: "#16A34A",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 800 }}>O</span>
          </div>
          <span style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Openfy</span>
        </div>

        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#16A34A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
            Score de Saúde Financeira
          </p>
          <h1 style={{
            fontSize: 40, fontWeight: 800, color: "#FFFFFF",
            lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 20,
          }}>
            Controle total da sua vida financeira.
          </h1>
          <p style={{ fontSize: 16, color: "#A3A3A3", lineHeight: 1.7, marginBottom: 40, maxWidth: 380 }}>
            Descubra para onde vai cada real. Metas, score, análises e relatórios — tudo em um só lugar, grátis para começar.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: "rgba(22,163,74,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} style={{ color: "#16A34A" }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 3 }}>{title}</p>
                  <p style={{ fontSize: 12, color: "#A3A3A3", lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex" }}>
            {["P", "A", "R", "M"].map((l, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: "50%",
                background: ["#16A34A", "#525252", "#A3A3A3", "#0A0A0A"][i],
                border: "2px solid #0A0A0A",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginLeft: i > 0 ? -8 : 0,
                fontSize: 11, fontWeight: 700, color: "#FFFFFF",
              }}>
                {l}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#A3A3A3" }}>
            <strong style={{ color: "#FFFFFF" }}>+2.400 pessoas</strong> já controlam suas finanças
          </p>
        </div>
      </div>

      {/* Right panel — Form */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 24px",
        background: "#FAFAFA",
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, background: "#0A0A0A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 800 }}>O</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0A0A0A" }}>Openfy</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 6 }}>
              Crie sua conta
            </h2>
            <p style={{ fontSize: 14, color: "#525252" }}>
              {betaFechado ? "Acesso exclusivo para convidados." : "Comece gratuitamente. Sem cartão de crédito."}
            </p>
          </div>

          {/* Beta fechado — aviso */}
          {betaFechado && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px", marginBottom: 20,
              background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10,
            }}>
              <Lock size={16} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#92400E", marginBottom: 2 }}>Beta fechado</p>
                <p style={{ fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
                  Apenas e-mails convidados podem criar conta.{" "}
                  <Link to="/" style={{ color: "#92400E", fontWeight: 600, textDecoration: "underline" }}>
                    Entrar na lista de espera
                  </Link>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Nome */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", display: "block", marginBottom: 6 }}>
                Nome completo
              </label>
              <input
                type="text"
                autoComplete="name"
                value={nome}
                onChange={(e) => { setNome(e.target.value); clearError("nome") }}
                placeholder="Pedro Henrique"
                style={inputStyle("nome")}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
              {fieldErrors.nome && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{fieldErrors.nome}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", display: "block", marginBottom: 6 }}>
                E-mail {betaFechado && <span style={{ fontSize: 11, color: "#D97706", fontWeight: 400 }}>(deve ser convidado)</span>}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError("email") }}
                placeholder="seu@email.com"
                style={inputStyle("email")}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
              {fieldErrors.email && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{fieldErrors.email}</p>}
            </div>

            {/* Senha */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", display: "block", marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password") }}
                  placeholder="Mínimo 8 caracteres"
                  style={{ ...inputStyle("password"), paddingRight: 44 }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)")}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#A3A3A3", display: "flex", alignItems: "center",
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{fieldErrors.password}</p>}

              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: pwdStrength.score >= n ? pwdStrength.color : "#E5E5E3",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 11, color: pwdStrength.color, fontWeight: 500 }}>
                      {pwdStrength.label}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { ok: password.length >= 8, label: "8+ chars" },
                        { ok: /[A-Z]/.test(password), label: "A-Z" },
                        { ok: /[0-9]/.test(password), label: "0-9" },
                      ].map(({ ok, label }) => (
                        <span key={label} style={{ fontSize: 10, color: ok ? "#16A34A" : "#A3A3A3", fontWeight: 500 }}>
                          {ok ? "✓" : "·"} {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", display: "block", marginBottom: 6 }}>
                Confirmar senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword") }}
                  placeholder="••••••••"
                  style={{ ...inputStyle("confirmPassword"), paddingRight: 44 }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)")}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#A3A3A3", display: "flex", alignItems: "center",
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{fieldErrors.confirmPassword}</p>
              )}
              {!fieldErrors.confirmPassword && confirmPassword && password === confirmPassword && (
                <p style={{ fontSize: 12, color: "#16A34A", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} /> Senhas coincidem
                </p>
              )}
            </div>

            {/* Consentimentos LGPD */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
              {/* Política — obrigatório */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                padding: "12px 14px",
                background: fieldErrors.consentimentoPolitica ? "#FEF2F2" : "#F5F5F0",
                border: `1px solid ${fieldErrors.consentimentoPolitica ? "#FCA5A5" : "#E5E5E3"}`,
                borderRadius: 10,
              }}>
                <input
                  type="checkbox"
                  checked={consentimentoPolitica}
                  onChange={(e) => {
                    setConsentimentoPolitica(e.target.checked)
                    clearError("consentimentoPolitica")
                  }}
                  style={{ marginTop: 2, accentColor: "#16A34A", width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: "#525252", lineHeight: 1.5 }}>
                  Li e aceito a{" "}
                  <Link to="/privacidade" target="_blank" style={{ color: "#0A0A0A", fontWeight: 600, textDecoration: "underline" }}>
                    Política de Privacidade
                  </Link>
                  {" "}e os{" "}
                  <Link to="/termos" target="_blank" style={{ color: "#0A0A0A", fontWeight: 600, textDecoration: "underline" }}>
                    Termos de Uso
                  </Link>
                  . <span style={{ color: "#EF4444", fontWeight: 600 }}>*</span>
                </span>
              </label>
              {fieldErrors.consentimentoPolitica && (
                <p style={{ fontSize: 12, color: "#EF4444", marginTop: -8 }}>{fieldErrors.consentimentoPolitica}</p>
              )}

              {/* Marketing — opcional */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                padding: "12px 14px",
                background: "#F5F5F0",
                border: "1px solid #E5E5E3",
                borderRadius: 10,
              }}>
                <input
                  type="checkbox"
                  checked={consentimentoMarketing}
                  onChange={(e) => setConsentimentoMarketing(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "#16A34A", width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: "#525252", lineHeight: 1.5 }}>
                  Aceito receber dicas financeiras e novidades do Openfy por e-mail.{" "}
                  <span style={{ color: "#A3A3A3" }}>(opcional)</span>
                </span>
              </label>
            </div>

            {serverError && (
              <div style={{
                padding: "12px 14px", background: "#FEF2F2",
                border: "1px solid #FCA5A5", borderRadius: 8,
              }}>
                <p style={{ fontSize: 13, color: "#DC2626" }}>{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0",
                border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, color: "#FFFFFF",
                backgroundColor: loading ? "#A3A3A3" : "#0A0A0A",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
                marginTop: 4,
              }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#262626" }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#0A0A0A" }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#FFF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  Verificando...
                </>
              ) : (
                <>Criar conta {betaFechado ? "com convite" : "grátis"} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#A3A3A3" }}>
            Já tem uma conta?{" "}
            <Link
              to="/login"
              style={{ color: "#0A0A0A", fontWeight: 600, textDecoration: "none" }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
