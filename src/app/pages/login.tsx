import { useState, useEffect, FormEvent } from "react"
import { useNavigate, Navigate, Link } from "react-router"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { emailSchema, senhaSchema, nomeSchema, telefoneSchema } from "../../lib/validations"
import { CURRENT_TERMS_VERSION } from "../../lib/terms"
import { Lock } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [betaFechado, setBetaFechado] = useState(false)
  const [termosAceitos, setTermosAceitos] = useState(false)
  const [termosErro, setTermosErro] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F5F5" }}>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />

  function toggleMode() {
    setIsSignUp((prev) => !prev)
    setServerError(null)
    setSuccessMessage(null)
    setFieldErrors({})
    setTermosAceitos(false)
    setTermosErro(false)
    setShowForgot(false)
    setForgotSent(false)
    setForgotError(null)
  }

  async function handleForgotPassword() {
    setForgotError(null)
    if (!forgotEmail.trim()) { setForgotError("Informe seu e-mail."); return }
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotLoading(false)
    if (error) { setForgotError(error.message); return }
    setForgotSent(true)
  }

  function validateFields() {
    const errs: Record<string, string> = {}

    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) errs.email = emailResult.error.issues[0].message

    const senhaResult = senhaSchema.safeParse(password)
    if (!senhaResult.success) errs.password = senhaResult.error.issues[0].message

    if (isSignUp) {
      const nomeResult = nomeSchema.safeParse(nome)
      if (!nomeResult.success) errs.nome = nomeResult.error.issues[0].message

      if (telefone) {
        const telResult = telefoneSchema.safeParse(telefone)
        if (!telResult.success) errs.telefone = telResult.error.issues[0].message
      }
    }

    return errs
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    setSuccessMessage(null)

    if (isSignUp && !termosAceitos) {
      setTermosErro(true)
      return
    }
    setTermosErro(false)

    const errs = validateFields()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)

    if (isSignUp) {
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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: nome,
            phone: telefone,
            birth_date: dataNascimento,
          },
        },
      })

      if (signUpError) {
        setServerError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          nome,
          telefone: telefone || null,
          data_nascimento: dataNascimento || null,
          plano: "free",
          renda_mensal: 0,
          meta_economia: 0,
          consentimento_politica: true,
          data_consentimento: new Date().toISOString(),
          versao_politica: CURRENT_TERMS_VERSION,
          versao_termos_aceita: CURRENT_TERMS_VERSION,
          data_aceite_termos: new Date().toISOString(),
        }, { onConflict: "id" })

        if (betaFechado) {
          await supabase.rpc("mark_beta_email_used", { p_email: email.toLowerCase().trim() })
        }
      }

      setSuccessMessage("Conta criada! Verifique seu e-mail para confirmar o cadastro.")
      setLoading(false)
      return
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setServerError(signInError.message)
      setLoading(false)
      return
    }

    navigate("/app", { replace: true })
  }

  const inputClass = "w-full bg-white text-black outline-none transition-colors px-3 py-2.5"
  const inputBaseStyle: React.CSSProperties = { fontSize: 14, borderRadius: 8, border: "1px solid #E0E0E0" }
  const inputErrorStyle: React.CSSProperties = { ...inputBaseStyle, border: "1px solid #D32F2F" }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (!e.currentTarget.style.borderColor.includes("D32F2F")) {
      e.currentTarget.style.borderColor = "#16A34A"
    }
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
    e.currentTarget.style.borderColor = hasError ? "#D32F2F" : "#E0E0E0"
  }

  function clearError(field: string) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F5F5F5" }}>
      <div
        className="w-full bg-white p-8"
        style={{ maxWidth: isSignUp ? 400 : 360, borderRadius: 12, border: "1px solid #E0E0E0", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
      >
        {/* ── Esqueceu a senha ── */}
        {showForgot && (
          <>
            <div className="mb-7 text-center">
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }} className="text-black">Openfy</h1>
              <p style={{ fontSize: 13 }} className="text-[#777777] mt-1">Recuperar senha</p>
            </div>

            {forgotSent ? (
              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>✉️</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 6 }}>E-mail enviado!</p>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5 }}>
                  Verifique sua caixa de entrada e clique no link para criar uma nova senha.
                </p>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false) }}
                  style={{ marginTop: 20, fontSize: 13, color: "#16A34A", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  ← Voltar ao login
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.55 }}>
                  Digite seu e-mail e enviaremos um link para você criar uma nova senha.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>E-mail *</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleForgotPassword() }}
                    placeholder="seu@email.com"
                    style={{ width: "100%", border: "1px solid #E0E0E0", borderRadius: 8, padding: "11px 12px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#16A34A")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#E0E0E0")}
                  />
                </div>
                {forgotError && <p style={{ fontSize: 13, color: "#D32F2F" }}>{forgotError}</p>}
                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  style={{ width: "100%", padding: "11px 0", background: "#0A0A0A", color: "#FFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: forgotLoading ? "not-allowed" : "pointer", opacity: forgotLoading ? 0.6 : 1 }}
                >
                  {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                </button>
                <button
                  onClick={() => { setShowForgot(false); setForgotError(null) }}
                  style={{ fontSize: 13, color: "#777", background: "none", border: "none", cursor: "pointer", textAlign: "center" }}
                >
                  ← Voltar ao login
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Formulário principal ── */}
        {!showForgot && (<>
        <div className="mb-7 text-center">
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }} className="text-black">
            Openfy
          </h1>
          <p style={{ fontSize: 13 }} className="text-[#777777] mt-1">
            {isSignUp ? (betaFechado ? "Acesso exclusivo para convidados" : "Crie sua conta gratuitamente") : "Entre na sua conta"}
          </p>
        </div>

        {isSignUp && betaFechado && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "10px 12px", marginBottom: 16,
            background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8,
          }}>
            <Lock size={14} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", marginBottom: 2 }}>Beta fechado</p>
              <p style={{ fontSize: 11, color: "#B45309", lineHeight: 1.4 }}>
                Apenas e-mails convidados.{" "}
                <Link to="/" style={{ color: "#92400E", fontWeight: 600, textDecoration: "underline" }}>
                  Lista de espera
                </Link>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {isSignUp && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nome" style={{ fontSize: 13, fontWeight: 500 }} className="text-[#333333]">
                  Nome Completo *
                </label>
                <input
                  id="nome"
                  type="text"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); clearError("nome") }}
                  placeholder="Seu nome completo"
                  className={inputClass}
                  style={fieldErrors.nome ? inputErrorStyle : inputBaseStyle}
                  onFocus={onFocus}
                  onBlur={(e) => onBlur(e, !!fieldErrors.nome)}
                />
                {fieldErrors.nome && (
                  <p style={{ fontSize: 12 }} className="text-[#D32F2F]">{fieldErrors.nome}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="telefone" style={{ fontSize: 13, fontWeight: 500 }} className="text-[#333333]">
                  Telefone
                </label>
                <input
                  id="telefone"
                  type="tel"
                  autoComplete="tel"
                  value={telefone}
                  onChange={(e) => { setTelefone(e.target.value); clearError("telefone") }}
                  placeholder="(11) 99999-0000"
                  className={inputClass}
                  style={fieldErrors.telefone ? inputErrorStyle : inputBaseStyle}
                  onFocus={onFocus}
                  onBlur={(e) => onBlur(e, !!fieldErrors.telefone)}
                />
                {fieldErrors.telefone && (
                  <p style={{ fontSize: 12 }} className="text-[#D32F2F]">{fieldErrors.telefone}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="dataNascimento" style={{ fontSize: 13, fontWeight: 500 }} className="text-[#333333]">
                  Data de Nascimento
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className={inputClass}
                  style={inputBaseStyle}
                  onFocus={onFocus}
                  onBlur={(e) => onBlur(e, false)}
                />
              </div>

              <div className="border-t border-[#F0F0F0] mt-1" />
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500 }} className="text-[#333333]">
              E-mail *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError("email") }}
              placeholder="seu@email.com"
              className={inputClass}
              style={fieldErrors.email ? inputErrorStyle : inputBaseStyle}
              onFocus={onFocus}
              onBlur={(e) => onBlur(e, !!fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p style={{ fontSize: 12 }} className="text-[#D32F2F]">{fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500 }} className="text-[#333333]">
                Senha *
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{ fontSize: 12, color: "#16A34A", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password") }}
              placeholder="••••••••"
              className={inputClass}
              style={fieldErrors.password ? inputErrorStyle : inputBaseStyle}
              onFocus={onFocus}
              onBlur={(e) => onBlur(e, !!fieldErrors.password)}
            />
            {fieldErrors.password && (
              <p style={{ fontSize: 12 }} className="text-[#D32F2F]">{fieldErrors.password}</p>
            )}
            {isSignUp && !fieldErrors.password && (
              <p style={{ fontSize: 11 }} className="text-[#999999]">
                Mínimo 8 caracteres, uma maiúscula e um número
              </p>
            )}
          </div>

          {isSignUp && (
            <div style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: termosErro ? "1px solid #D32F2F" : "1px solid #E0E0E0",
              background: termosErro ? "#FEF2F2" : "#FAFAFA",
              transition: "border-color 0.15s, background 0.15s",
            }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={termosAceitos}
                  onChange={(e) => {
                    setTermosAceitos(e.target.checked)
                    if (e.target.checked) setTermosErro(false)
                  }}
                  style={{ marginTop: 2, width: 15, height: 15, cursor: "pointer", accentColor: "#16A34A", flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: termosErro ? "#D32F2F" : "#555555", lineHeight: 1.55 }}>
                  Li e aceito os{" "}
                  <a href="/termos" target="_blank" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "underline" }}>
                    Termos de Uso
                  </a>{" "}
                  e a{" "}
                  <a href="/privacidade" target="_blank" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "underline" }}>
                    Política de Privacidade
                  </a>{" "}
                  do Openfy. *
                </span>
              </label>
              {termosErro && (
                <p style={{ fontSize: 11, color: "#D32F2F", marginTop: 6, marginLeft: 25 }}>
                  Você precisa aceitar os termos para continuar.
                </p>
              )}
            </div>
          )}

          {serverError && (
            <p style={{ fontSize: 13 }} className="text-[#D32F2F]">{serverError}</p>
          )}
          {successMessage && (
            <p style={{ fontSize: 13 }} className="text-[#388E3C]">{successMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            style={{ fontSize: 14, borderRadius: 8, padding: "11px 0", backgroundColor: isSignUp ? "#16A34A" : "#0A0A0A" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = isSignUp ? "#15803D" : "#262626" }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = isSignUp ? "#16A34A" : "#0A0A0A" }}
          >
            {loading
              ? (isSignUp ? "Criando conta..." : "Entrando...")
              : (isSignUp ? "Criar conta" : "Entrar")}
          </button>
        </form>

        <p className="text-center mt-5" style={{ fontSize: 13, color: "#777777" }}>
          {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            style={{ fontSize: 13, color: "#16A34A", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {isSignUp ? "Fazer login" : "Cadastre-se grátis"}
          </button>
        </p>
        </>)}
      </div>
    </div>
  )
}
