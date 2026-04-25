import { NavLink, Outlet, useLocation } from "react-router"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  PlusCircle,
  BarChart2,
  FileText,
  User,
  Bell,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import { OFLogo } from "./OFLogo"
import { Toaster } from "sonner"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import { supabase } from "../../lib/supabase"
import type { Profile } from "../../lib/types"

const navItems = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/adicionar", label: "Adicionar", icon: PlusCircle },
  { path: "/app/analise", label: "Análise", icon: BarChart2 },
  { path: "/app/relatorios", label: "Relatórios", icon: FileText },
  { path: "/app/perfil", label: "Perfil", icon: User },
]

const pageTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/adicionar": "Adicionar Transação",
  "/app/analise": "Análise de Gastos",
  "/app/relatorios": "Relatório Mensal",
  "/app/perfil": "Meu Perfil",
}

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
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "18px 18px 14px",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <OFLogo size="sm" />
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#A3A3A3" }}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/app"}
            onClick={onClose}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#15803D" : "#525252",
              backgroundColor: isActive ? "#DCFCE7" : "transparent",
              borderLeft: isActive ? "3px solid #16A34A" : "3px solid transparent",
              transition: "all 0.15s",
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {plano === "free" && (
        <div style={{ padding: "0 10px 10px" }}>
          <div style={{
            background: "#DCFCE7",
            border: "1px solid #BBF7D0",
            borderRadius: 10,
            padding: "12px 14px",
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#15803D", marginBottom: 4 }}>Upgrade para Pro</p>
            <p style={{ fontSize: 11, color: "#16A34A", marginBottom: 10, lineHeight: 1.5 }}>
              IA + Score completo + histórico ilimitado
            </p>
            <a href="/#precos" style={{
              display: "block",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#16A34A",
              borderRadius: 6,
              padding: "7px",
              textDecoration: "none",
            }}>
              Ver planos →
            </a>
          </div>
        </div>
      )}

      <div style={{
        padding: "12px 14px",
        borderTop: "1px solid #F0F0F0",
        display: "flex",
        alignItems: "center",
        gap: 10,
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
          <p style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </p>
          <span style={{
            display: "inline-block", marginTop: 2,
            fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
            padding: "2px 7px", borderRadius: 10,
            backgroundColor: plano === "pro" ? "#0A0A0A" : "#F5F5F0",
            color: plano === "pro" ? "#FFFFFF" : "#525252",
          }}>
            {plano === "pro" ? "PRO" : "FREE"}
          </span>
        </div>
        <button onClick={signOut} title="Sair"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#A3A3A3", borderRadius: 6, transition: "color 0.15s" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#0A0A0A")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#A3A3A3")}
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
  const pageTitle = pageTitles[location.pathname] ?? "Openfy"
  const { user } = useAuth()
  const signOut = () => supabase.auth.signOut()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (user) getProfile(user.id).then(setProfile)
  }, [user])

  const userEmail = user?.email ?? ""
  const displayName = profile?.nome || user?.user_metadata?.full_name || userEmail.split("@")[0] || "Usuário"
  const avatarLetter = displayName.charAt(0).toUpperCase()
  const plano = profile?.plano ?? "free"
  const sidebarProps = { displayName, userEmail, plano, avatarLetter, signOut }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F0", display: "flex", fontFamily: "var(--font-body)" }}>

      <aside className="hidden lg:flex flex-col" style={{
        width: 224, backgroundColor: "#FFFFFF", borderRight: "1px solid #E5E5E3",
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
        backgroundColor: "#FFFFFF", zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
      }}>
        <SidebarContent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="lg:ml-56" style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        <header style={{
          position: "sticky", top: 0, zIndex: 20,
          backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E5E3",
          height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#525252" }}>
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "#0A0A0A" }}>{pageTitle}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#525252", borderRadius: 8, transition: "color 0.15s, background 0.15s" }}
              onMouseOver={(e) => { e.currentTarget.style.color = "#0A0A0A"; e.currentTarget.style.background = "#F5F5F0" }}
              onMouseOut={(e) => { e.currentTarget.style.color = "#525252"; e.currentTarget.style.background = "none" }}>
              <Bell size={19} />
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#0A0A0A", color: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              {avatarLetter}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }} className="lg:pb-6">
          <Outlet />
        </main>

        <nav className="lg:hidden" style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "#FFFFFF", borderTop: "1px solid #E5E5E3",
          zIndex: 20, display: "flex", alignItems: "center", padding: "0 4px",
        }}>
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/app"}
              style={({ isActive }) => ({
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3, padding: "10px 4px",
                textDecoration: "none",
                color: isActive ? "#16A34A" : "#A3A3A3",
                fontSize: 10, fontWeight: isActive ? 600 : 400,
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "var(--font-body)", fontSize: 14 } }} />
    </div>
  )
}
