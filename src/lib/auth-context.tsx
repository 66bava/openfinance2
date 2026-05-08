import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newUser = newSession?.user ?? null;
      const prevUserId = prevUserIdRef.current;

      prevUserIdRef.current = newUser?.id ?? null;

      // flushSync força o React a aplicar o estado IMEDIATAMENTE e de forma síncrona.
      // Sem isso, o React 18 batcheia a atualização, então quando signInWithPassword
      // resolve e navigate("/app") é chamado, user ainda seria null no contexto.
      flushSync(() => {
        setSession(newSession);
        setUser(newUser);
        setLoading(false);
      });

      // IMPORTANTE: evitar chamadas Supabase dentro do callback do onAuthStateChange,
      // pois isso pode causar deadlock no client. Agende para depois do callback.
      // (audit logs: fire-and-forget)
      if (event === "SIGNED_IN" && newUser && prevUserId !== newUser.id) {
        const userId = newUser.id;
        setTimeout(() => {
          supabase.from("audit_logs").insert({ user_id: userId, acao: "login", detalhes: {} }).catch(() => {});
        }, 0);
      }
      if (event === "SIGNED_OUT" && prevUserId) {
        const userId = prevUserId;
        setTimeout(() => {
          supabase.from("audit_logs").insert({ user_id: userId, acao: "logout", detalhes: {} }).catch(() => {});
        }, 0);
      }
    });

    // Sync cross-tab: re-verifica sessão quando usuário retorna à aba
    const handleFocus = () => {
      supabase.auth.getSession().then(({ data }) => {
        const newUser = data.session?.user ?? null;
        if (newUser?.id !== prevUserIdRef.current) {
          prevUserIdRef.current = newUser?.id ?? null;
          flushSync(() => {
            setSession(data.session);
            setUser(newUser);
          });
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
