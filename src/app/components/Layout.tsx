import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { useEffect, useMemo, useState } from "react"
import { Toaster } from "sonner"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import type { Profile } from "../../lib/types"
import { needsTermsAcceptance } from "../../lib/terms"
import { AppSidebar } from "../../paineis/layout/AppSidebar"
import { AppTopbar } from "../../paineis/layout/AppTopbar"
import { getUnreadNotificationsCount } from "../../lib/queries"
import { useLanguage } from "../../lib/language-context"
import { useTheme } from "../../lib/theme-context"
import { useUserSettings } from "../../lib/user-settings-context"

export type AppOutletContext = {
  syncNonce: number
  requestSync: () => void
  search: string
}

function titleForPath(pathname: string) {
  if (pathname === "/app") return "Dashboard"
  if (pathname.startsWith("/app/adicionar")) return "Registro Rápido"
  if (pathname.startsWith("/app/score")) return "Score"
  if (pathname.startsWith("/app/insights")) return "Insights IA"
  if (pathname.startsWith("/app/planejamento")) return "Planejamento"
  if (pathname.startsWith("/app/investimentos")) return "Investimentos"
  if (pathname.startsWith("/app/cartoes")) return "Pagamentos"
  if (pathname.startsWith("/app/transacoes")) return "Transações"
  if (pathname.startsWith("/app/ciclos")) return "Ciclos"
  if (pathname.startsWith("/app/perfil")) return "Configurações"
  return "Finance App"
}

function initialsFromProfile(p: Profile | null, email?: string | null) {
  const name = (p?.nome || "").trim()
  const base = name || (email || "").split("@")[0] || "U"
  const parts = base.split(/\s+/g).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setLang } = useLanguage()
  const { setThemePreference } = useTheme()
  const { setCurrency, setDateLocale } = useUserSettings()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [syncNonce, setSyncNonce] = useState(0)
  const [search, setSearch] = useState("")
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  const title = useMemo(() => titleForPath(location.pathname), [location.pathname])

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then((p) => {
      setProfile(p)

      const idioma = (p as any)?.idioma as string | undefined
      if (idioma === "pt" || idioma === "en" || idioma === "es") setLang(idioma)

      const themePref = (p as any)?.theme_preference as string | undefined
      if (themePref === "light" || themePref === "dark" || themePref === "system") setThemePreference(themePref)

      const currencyPref = (p as any)?.currency_preference as string | undefined
      if (currencyPref) setCurrency(currencyPref)

      const datePref = (p as any)?.date_format_preference as string | undefined
      if (datePref) setDateLocale(datePref)

      if (p && needsTermsAcceptance(p)) {
        if (location.pathname !== "/app/aceite-termos") navigate("/app/aceite-termos", { replace: true })
        return
      }
      if (p && p.onboarding_completo !== true) {
        navigate("/app/onboarding", { replace: true })
      }
    })
  }, [user, location.pathname, navigate])

  useEffect(() => {
    if (!user) return
    let ignore = false
    getUnreadNotificationsCount(user.id)
      .then((n) => {
        if (ignore) return
        setUnreadNotifs(n)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [user?.id, syncNonce])

  return (
    <div className="ofx">
      <Toaster position="top-right" />

      <div className="app">
        <AppSidebar />

        <div className="main">
          <AppTopbar
            title={title}
            avatarText={initialsFromProfile(profile, user?.email ?? null)}
            showNotifDot={unreadNotifs > 0}
            onSync={() => setSyncNonce((n) => n + 1)}
            onNotificationsClick={() => navigate("/app/notificacoes")}
            onSearchChange={setSearch}
          />

          <div className="page-content">
            <Outlet context={{ syncNonce, requestSync: () => setSyncNonce((n) => n + 1), search } satisfies AppOutletContext} />
          </div>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Navegação mobile">
        <NavLink to="/app" end className={({ isActive }) => ["mobile-nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Início</span>
        </NavLink>

        <NavLink to="/app/adicionar" className={({ isActive }) => ["mobile-nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Registrar</span>
        </NavLink>

        <NavLink to="/app/score" className={({ isActive }) => ["mobile-nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          <span>Score</span>
        </NavLink>

        <NavLink to="/app/insights" className={({ isActive }) => ["mobile-nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>Insights</span>
        </NavLink>

        <NavLink to="/app/perfil" className={({ isActive }) => ["mobile-nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Config</span>
        </NavLink>
      </nav>
    </div>
  )
}
