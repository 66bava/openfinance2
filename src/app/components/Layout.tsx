import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { useState, useEffect, useRef } from "react"
import {
  LayoutDashboard,
  PlusCircle,
  BarChart2,
  FileText,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
  CreditCard,
  Tag,
  Sun,
  Moon,
  TrendingUp,
} from "lucide-react"
import { OFLogo } from "./OFLogo"
import { Toaster } from "sonner"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import { supabase } from "../../lib/supabase"
import type { Profile } from "../../lib/types"
import { useTheme } from "../../lib/theme-context"
import { useLanguage } from "../../lib/language-context"
import type { Lang } from "../../lib/i18n"

const LANGS: { code: Lang; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
]

function AppLangSwitcher() {
  const { lang, setLang } = useLanguage()
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 1,
      background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
      borderRadius: 20, padding: "3px 4px",
    }}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          style={{
            fontSize: 10, fontWeight: lang === code ? 700 : 500,
            color: lang === code ? "var(--of-text)" : "var(--of-text-muted)",
            background: lang === code ? "var(--of-surface)" : "transparent",
            border: "none", borderRadius: 14, padding: "3px 8px",
            cursor: "pointer", letterSpacing: "0.04em",
            boxShadow: lang === code ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function UserMenu({
  displayName, userEmail, plano, avatarLetter, signOut,
}: {
  displayName: string; userEmail: string; plano: string; avatarLetter: string; signOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "1px solid var(--of-border)",
          borderRadius: 10, padding: "5px 8px 5px 5px",
          cursor: "pointer", transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--of-hover)" }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "#0A0A0A", color: "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {avatarLetter}
        </div>
        <div className="hidden md:block" style={{ textAlign: "left" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)", lineHeight: 1.2 }}>
            {displayName.length > 16 ? displayName.slice(0, 16) + "…" : displayName}
          </p>
          <p style={{ fontSize: 10, color: "var(--of-text-muted)" }}>
            Plano {plano === "free" ? "Free" : plano === "pro" ? "Pro" : "Família"}
          </p>
        </div>
        <ChevronDown size={13} style={{ color: "var(--of-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
          background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)", minWidth: 200, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--of-border-light)" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{displayName}</p>
            <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 1 }}>{userEmail}</p>
          </div>

          {[
            { icon: User, label: t("appProfileLabel"), action: () => { navigate("/app/perfil"); setOpen(false) } },
          ].map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: "var(--of-text)", transition: "background 0.1s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--of-hover)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
            >
              <Icon size={14} style={{ color: "var(--of-text-secondary)" }} /> {label}
            </button>
          ))}

          <div style={{ borderTop: "1px solid var(--of-border-light)" }}>
            <button
              onClick={() => { signOut(); setOpen(false) }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: "#DC2626", transition: "background 0.1s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--of-hover-danger)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
            >
              <LogOut size={14} /> {t("appSignOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const NAV_PATHS = [
  { path: "/app", labelKey: "appDashboard" as const, icon: LayoutDashboard },
  { path: "/app/adicionar", labelKey: "appAdicionar" as const, icon: PlusCircle },
  { path: "/app/futuro", labelKey: "appFuturo" as const, icon: TrendingUp },
  { path: "/app/analise", labelKey: "appAnalise" as const, icon: BarChart2 },
  { path: "/app/relatorios", labelKey: "appRelatorios" as const, icon: FileText },
  { path: "/app/cartoes", labelKey: "appCartoes" as const, icon: CreditCard },
  { path: "/app/categorias", labelKey: "appCategorias" as const, icon: Tag },
  { path: "/app/perfil", labelKey: "appPerfil" as const, icon: User },
]

function SidebarContent({
  displayName,
  userEmail,
  plano,
  avatarLetter,
  onClose,
  signOut,
}: {
  displayName: string
  userEmail: string
  plano: string
  avatarLetter: string
  onClose?: () => void
  signOut: () => void
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "18px 18px 14px", borderBottom: "1px solid var(--of-border-light)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <OFLogo size="sm" />
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--of-text-muted)" }}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_PATHS.map(({ path, labelKey, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/app"}
            onClick={onClose}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, textDecoration: "none",
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--of-nav-active-text)" : "var(--of-text-secondary)",
              backgroundColor: isActive ? "var(--of-nav-active-bg)" : "transparent",
              borderLeft: isActive ? "3px solid var(--of-nav-active-border)" : "3px solid transparent",
              transition: "all 0.15s",
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                {t(labelKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {plano === "free" && (
        <div style={{ padding: "0 10px 10px" }}>
          <div style={{
            background: "var(--of-upgrade-bg)", border: "1px solid var(--of-upgrade-border)",
            borderRadius: 10, padding: "12px 14px",
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--of-upgrade-title)", marginBottom: 4 }}>{t("appUpgradeTitle")}</p>
            <p style={{ fontSize: 11, color: "var(--of-upgrade-desc)", marginBottom: 10, lineHeight: 1.5 }}>
              {t("appUpgradeDesc")}
            </p>
            <a href="/#precos" style={{
              display: "block", textAlign: "center", fontSize: 12, fontWeight: 700,
              color: "#FFFFFF", background: "#16A34A", borderRadius: 6, padding: "7px", textDecoration: "none",
            }}>
              {t("appUpgradeCTA")}
            </a>
          </div>
        </div>
      )}

      <div style={{
        padding: "12px 14px", borderTop: "1px solid var(--of-border-light)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "#0A0A0A", color: "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {avatarLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </p>
          <span style={{
            display: "inline-block", marginTop: 2,
            fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
            padding: "2px 7px", borderRadius: 10,
            backgroundColor: plano === "pro" ? "var(--of-text)" : "var(--of-badge-free-bg)",
            color: plano === "pro" ? "var(--of-surface)" : "var(--of-badge-free-text)",
          }}>
            {plano === "pro" ? t("planProLabel") : t("planFreeLabel")}
          </span>
        </div>
        <button onClick={signOut} title={t("appSignOut")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--of-text-muted)", borderRadius: 6, transition: "color 0.15s" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "var(--of-text)")}
          onMouseOut={(e) => (e.currentTarget.style.color = "var(--of-text-muted)")}
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  )
}

export function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const signOut = () => supabase.auth.signOut()
  const [profile, setProfile] = useState<Profile | null>(null)

  function getPageTitle(pathname: string): string {
    const titleMap: Record<string, string> = {
      "/app": t("appTitleDashboard"),
      "/app/adicionar": t("appTitleAdicionar"),
      "/app/analise": t("appTitleAnalise"),
      "/app/relatorios": t("appTitleRelatorios"),
      "/app/cartoes": t("appTitleCartoes"),
      "/app/categorias": t("appTitleCategorias"),
      "/app/futuro": t("appTitleFuturo"),
      "/app/perfil": t("appTitlePerfil"),
    }
    if (titleMap[pathname]) return titleMap[pathname]
    if (pathname.startsWith("/app/cartoes") && pathname.includes("/fatura/")) return t("appTitleFatura")
    if (pathname.startsWith("/app/cartoes")) return t("appTitleCartoes")
    return "Openfy"
  }

  useEffect(() => {
    if (user) getProfile(user.id).then(setProfile)
  }, [user])

  const pageTitle = getPageTitle(location.pathname)
  const userEmail = user?.email ?? ""
  const displayName = profile?.nome || user?.user_metadata?.full_name || userEmail.split("@")[0] || "Usuário"
  const avatarLetter = displayName.charAt(0).toUpperCase()
  const plano = profile?.plano ?? "free"
  const sidebarProps = { displayName, userEmail, plano, avatarLetter, signOut }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--of-page-bg)", display: "flex", fontFamily: "var(--font-body)" }}>

      <aside className="hidden lg:flex flex-col" style={{
        width: 224, backgroundColor: "var(--of-surface)", borderRight: "1px solid var(--of-border)",
        position: "fixed", height: "100%", zIndex: 30,
      }}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden" onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 40,
          backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
        }} />
      )}

      <aside className="lg:hidden" style={{
        position: "fixed", left: 0, top: 0, height: "100%", width: 240,
        backgroundColor: "var(--of-surface)", zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
      }}>
        <SidebarContent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="lg:ml-56" style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        <header style={{
          position: "sticky", top: 0, zIndex: 20,
          backgroundColor: "var(--of-surface)", borderBottom: "1px solid var(--of-border)",
          height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--of-text-secondary)" }}>
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--of-text)" }}>{pageTitle}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? t("darkModeOff") : t("darkModeOn")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: "50%",
                background: "var(--of-btn-bg)", color: "var(--of-btn-text)",
                border: "none", cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)"
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.28)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.18)"
              }}
            >
              {theme === "dark" ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
            </button>
            <AppLangSwitcher />
            <UserMenu
              displayName={displayName}
              userEmail={userEmail}
              plano={plano}
              avatarLetter={avatarLetter}
              signOut={signOut}
            />
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }} className="lg:pb-6">
          <Outlet />
        </main>

        <nav className="lg:hidden" style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "var(--of-surface)", borderTop: "1px solid var(--of-border)",
          zIndex: 20, display: "flex", alignItems: "center", padding: "0 4px",
        }}>
          {NAV_PATHS.map(({ path, labelKey, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/app"}
              style={({ isActive }) => ({
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3, padding: "10px 4px",
                textDecoration: "none",
                color: isActive ? "var(--of-nav-active-border)" : "var(--of-text-muted)",
                fontSize: 10, fontWeight: isActive ? 600 : 400,
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                  {t(labelKey)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <Toaster position="bottom-right" theme={theme} toastOptions={{ style: { fontFamily: "var(--font-body)", fontSize: 14 } }} />
    </div>
  )
}
