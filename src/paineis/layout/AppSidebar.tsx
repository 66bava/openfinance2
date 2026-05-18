import { NavLink, useNavigate } from "react-router"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import type { Profile } from "../../lib/types"
import { supabase } from "../../lib/supabase"

type NavItem = {
  path: string
  label: string
  tip: string
  badge?: string
  icon: React.ReactNode
  end?: boolean
}

const NAV_PRINCIPAL: NavItem[] = [
  {
    path: "/app",
    end: true,
    label: "Dashboard",
    tip: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: "/app/transacoes",
    label: "Transações",
    tip: "Transações",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    path: "/app/importacao",
    label: "Importação",
    tip: "Importação",
    badge: "CSV",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12" />
        <polyline points="7 10 12 15 17 10" />
        <path d="M21 21H3" />
      </svg>
    ),
  },
  {
    path: "/app/adicionar",
    label: "Registro Rápido",
    tip: "Registro Rápido",
    badge: "IA",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    path: "/app/score",
    label: "Score",
    tip: "Score",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    path: "/app/insights",
    label: "Insights IA",
    tip: "Insights IA",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
]

const NAV_FINANCAS: NavItem[] = [
  {
    path: "/app/planejamento",
    label: "Planejamento",
    tip: "Planejamento",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    path: "/app/ciclos",
    label: "Ciclos",
    tip: "Ciclos recentes",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    path: "/app/investimentos",
    label: "Investimentos",
    tip: "Investimentos",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    path: "/app/cartoes",
    label: "Pagamentos",
    tip: "Pagamentos",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
]

const CONFIG_ITEM: NavItem = {
  path: "/app/perfil",
  label: "Configurações",
  tip: "Configurações",
  icon: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
}

function initialsFromName(fullName: string) {
  const s = (fullName || "").trim()
  if (!s) return "U"
  const parts = s.split(/\s+/g).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AppSidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("of-sidebar-collapsed")
    if (stored === "1") setCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem("of-sidebar-collapsed", collapsed ? "1" : "0")
  }, [collapsed])

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(setProfile).catch(() => {})
  }, [user?.id])

  const displayName = useMemo(() => {
    if (profile?.nome) return profile.nome
    const email = user?.email ?? ""
    const meta = (user as any)?.user_metadata?.full_name as string | undefined
    return (meta || email.split("@")[0] || "Você").trim()
  }, [profile?.nome, user])

  const avatar = useMemo(() => initialsFromName(displayName), [displayName])

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate("/login", { replace: true })
      setSigningOut(false)
    }
  }

  return (
    <aside className={["sidebar", collapsed ? "collapsed" : ""].filter(Boolean).join(" ")} id="sidebar">
      <button type="button" className="collapse-btn" onClick={() => setCollapsed((v) => !v)} aria-label="Alternar sidebar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="sidebar-logo">
        <div className="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
            <rect x="0" y="9" width="4" height="5" rx="1" fill="#fff" />
            <rect x="5" y="6" width="4" height="8" rx="1" fill="#fff" />
            <rect x="10" y="2" width="4" height="12" rx="1" fill="#fff" />
            <path
              d="M12 10V5m0 0 1.4 1.4M12 5 10.6 6.4"
              stroke="var(--green)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="logo-text">Openfy</span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação">
        <div className="nav-group">
          <div className="nav-group-label">Principal</div>
          {NAV_PRINCIPAL.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              data-tip={item.tip}
              className={({ isActive }) => ["nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}
            >
              <div className="nav-icon">{item.icon}</div>
              <span className="nav-label">{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </NavLink>
          ))}
        </div>

        <div className="nav-group">
          <div className="nav-group-label">Finanças</div>
          {NAV_FINANCAS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-tip={item.tip}
              className={({ isActive }) => ["nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}
            >
              <div className="nav-icon">{item.icon}</div>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to={CONFIG_ITEM.path}
          data-tip={CONFIG_ITEM.tip}
          className={({ isActive }) => ["nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")}
        >
          <div className="nav-icon">{CONFIG_ITEM.icon}</div>
          <span className="nav-label">{CONFIG_ITEM.label}</span>
        </NavLink>

        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="nav-item"
          data-tip="Sair"
          style={{ width: "100%", background: "transparent", border: "none", textAlign: "left" }}
        >
          <div className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <span className="nav-label">{signingOut ? "Saindo…" : "Sair"}</span>
        </button>

        <div className="user-card" role="button" tabIndex={0} onClick={() => navigate("/app/perfil")}>
          <div className="user-avatar">{avatar}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-plan">
              {profile?.plano ? `Plano ${profile.plano} · Beta` : "Plano · Beta"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
