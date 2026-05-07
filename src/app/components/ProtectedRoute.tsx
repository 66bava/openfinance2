import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router"
import { useAuth } from "../../lib/auth-context"
import { supabase } from "../../lib/supabase"

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || user) return
    // user é null: verifica sessão real antes de redirecionar
    // (evita race condition logo após o login onde o contexto ainda não atualizou)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login", { replace: true })
      // se sessão existe, aguarda onAuthStateChange atualizar o user
    })
  }, [user, loading])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <Outlet />
}
