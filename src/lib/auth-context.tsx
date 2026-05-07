import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      prevUserIdRef.current = data.session?.user?.id ?? null;
      setLoading(false);
    }).catch(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newUser = newSession?.user ?? null;

      if (event === "INITIAL_SESSION") {
        setSession(newSession);
        setUser(newUser);
        prevUserIdRef.current = newUser?.id ?? null;
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && newUser && prevUserIdRef.current !== newUser.id) {
        supabase.from("audit_logs").insert({
          user_id: newUser.id,
          acao: "login",
          detalhes: {},
        }).catch(() => {});
      }

      if (event === "SIGNED_OUT" && prevUserIdRef.current) {
        supabase.from("audit_logs").insert({
          user_id: prevUserIdRef.current,
          acao: "logout",
          detalhes: {},
        }).catch(() => {});
      }

      prevUserIdRef.current = newUser?.id ?? null;
      setSession(newSession);
      setUser(newUser);
    });

    // Re-verifica sessão quando usuário retorna à aba (cross-tab sync)
    const handleFocus = () => {
      supabase.auth.getSession().then(({ data }) => {
        const newUser = data.session?.user ?? null;
        if (newUser?.id !== prevUserIdRef.current) {
          setSession(data.session);
          setUser(newUser);
          prevUserIdRef.current = newUser?.id ?? null;
        }
      }).catch(() => {});
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
