import { useState, FormEvent } from "react"
import { useNavigate, Navigate } from "react-router"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { emailSchema, senhaSchema, nomeSchema, telefoneSchema } from "../../lib/validations"

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

    const errs = validateFields()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
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
        }, { onConflict: "id" })
      }

      setSuccessMessage("Conta criada! Verifique seu e-mail para confirmar o cadastro.")
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setServerError(signInError.message)
      setLoading(false)
      return
    }

    navigate("/app")
  }

  const inputClass = "w-full bg-white text-black outline-none transition-colors px-3 py-2.5"
  const inputBaseStyle: React.CSSProperties = { fontSize: 14, borderRadius: 8, border: "1px solid #E0E0E0" }
  const inputErrorStyle: React.CSSProperties = { ...inputBaseStyle, border: "1px solid #D32F2F" }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (!e.currentTarget.style.borderColor.includes("D32F2F")) {
      e.currentTarget.style.borderColor = "#111111"
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
        <div className="mb-7 text-center">
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }} className="text-black">
            Open Finance
          </h1>
          <p style={{ fontSize: 13 }} className="text-[#777777] mt-1">
            {isSignUp ? "Crie sua conta gratuitamente" : "Entre na sua conta"}
          </p>
        </div>

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
            <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500 }} className="text-[#333333]">
              Senha *
            </label>
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
            style={{ fontSize: 14, borderRadius: 8, padding: "10px 0", backgroundColor: "#111111" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#333333" }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#111111" }}
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
            className="text-black font-semibold underline-offset-2 hover:underline"
            style={{ fontSize: 13 }}
          >
            {isSignUp ? "Entre" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  )
}
