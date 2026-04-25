import { useEffect } from "react"
import { useNavigate } from "react-router"
import { supabase } from "../../lib/supabase"

export default function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? "/login" : "/app", { replace: true })
      })
    } else {
      supabase.auth.getSession().then(({ data }) => {
        navigate(data.session ? "/app" : "/login", { replace: true })
      })
    }
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
