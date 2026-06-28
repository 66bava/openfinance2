import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Eye, EyeOff, CheckCircle } from "lucide-react"
import { supabase } from "../../lib/supabase"

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError("Link inválido ou expirado. Solicite um novo link.")
        else setReady(true)
      })
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
        else setError("Link inválido ou expirado. Solicite um novo link.")
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError("A senha precisa ter ao menos 8 caracteres."); return }
    if (password !== confirm) { setError("As senhas não coincidem."); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => navigate("/app", { replace: true }), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #E0E0E0", borderRadius: 8,
    padding: "11px 12px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#F5F5F5" }}>
      <div style={{ width: "100%", maxWidth: 360, background: "#FFFFFF", borderRadius: 12, border: "1px solid #E0E0E0", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", padding: "32px 32px 28px" }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "#0A0A0A", marginBottom: 4 }}>Finance App</h1>
          <p style={{ fontSize: 13, color: "#777777" }}>
            {done ? "Senha alterada!" : "Crie uma nova senha"}
          </p>
        </div>

        {done && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle size={48} style={{ color: "#16A34A", marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>Senha alterada com sucesso.</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Redirecionando para o app...</p>
          </div>
        )}

        {!done && !ready && !error && (
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
            <div style={{ width: 24, height: 24, border: "2.5px solid #16A34A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        )}

        {!done && error && (
          <div style={{ padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
            <a href="/login" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "underline", marginTop: 8, display: "block" }}>
              Voltar para o login
            </a>
          </div>
        )}

        {!done && ready && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>Nova senha *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#16A34A")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E0E0E0")}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>Confirmar nova senha *</label>
              <input
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#16A34A")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E0E0E0")}
                autoComplete="new-password"
              />
            </div>

            {error && <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px 0", background: "#0A0A0A", color: "#FFFFFF",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1, marginTop: 4,
              }}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        {!done && (
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#9CA3AF" }}>
            <a href="/login" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>← Voltar ao login</a>
          </p>
        )}
      </div>
    </div>
  )
}
