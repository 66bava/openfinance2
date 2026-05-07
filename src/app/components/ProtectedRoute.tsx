import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) { setReady(true); return; }

    // user é null mas o onAuthStateChange pode ainda não ter propagado
    // (race condition após login). Verifica a sessão real antes de redirecionar.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Sem sessão válida — pode redirecionar para login
        setReady(true);
      }
      // Se sessão existe, aguarda onAuthStateChange atualizar o contexto.
      // O effect re-executa quando `user` mudar e então setReady(true).
    });
  }, [user, loading]);

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
