import { useEffect } from "react"
import { useNavigate } from "react-router"
import { supabase } from "../../lib/supabase"

export default function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const type = params.get("type")

    // Password recovery redirect via PKCE flow
    if (type === "recovery" && code) {
      navigate(`/reset-password?code=${code}`, { replace: true })
      return
    }

    // Standard auth callback (email confirmation, magic link, etc.)
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? "/login" : "/app", { replace: true })
      })
      return
    }

    // Hash-based implicit flow fallback (recovery token in hash)
    const hash = new URLSearchParams(window.location.hash.replace("#", ""))
    if (hash.get("type") === "recovery") {
      navigate("/reset-password", { replace: true })
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      navigate(data.session ? "/app" : "/login", { replace: true })
    })
  }, [navigate])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F0" }}>
      <div style={{
        width: 24, height: 24,
        border: "2.5px solid #16A34A",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  )
}
