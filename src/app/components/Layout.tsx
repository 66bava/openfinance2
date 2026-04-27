import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { useState, useEffect, useRef } from "react"
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
  Settings,
  ChevronDown,
  CreditCard,
  Tag,
} from "lucide-react"
import { OFLogo } from "./OFLogo"
import { Toaster } from "sonner"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import { supabase } from "../../lib/supabase"
import type { Profile } from "../../lib/types"

function UserMenu({
  displayName, userEmail, plano, avatarLetter, signOut,
}: {
  displayName: string; userEmail: string; plano: string; avatarLetter: string; signOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
          background: "none", border: "1px solid #E5E5E3",
          borderRadius: 10, padding: "5px 8px 5px 5px",
          cursor: "pointer", transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F0" }}
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
          <p style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A", lineHeight: 1.2 }}>
            {displayName.length > 16 ? displayName.slice(0, 16) + "…" : displayName}
          </p>
          <p style={{ fontSize: 10, color: "#A3A3A3" }}>
            Plano {plano === "free" ? "Free" : plano === "pro" ? "Pro" : "Família"}
          </p>
        </div>
        <ChevronDown size={13} style={{ color: "#A3A3A3", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
          background: "#FFFFFF", border: "1px solid #E5E5E3", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #F5F5F0" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{displayName}</p>
            <p style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>{userEmail}</p>
          </div>

          {[
            { icon: User, label: "Perfil", action: () => { navigate("/app/perfil"); setOpen(false) } },
          ].map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: "#0A0A0A", transition: "background 0.1s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F0" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
            >
              <Icon size={14} style={{ color: "#525252" }} /> {label}
            </button>
          ))}

          <div style={{ borderTop: "1px solid #F5F5F0" }}>
            <button
              onClick={() => { signOut(); setOpen(false) }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: "#DC2626", transition: "background 0.1s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
            >
              <LogOut size={14} /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const navItems = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/adicionar", label: "Adicionar", icon: PlusCircle },
  { path: "/app/analise", label: "Análise", icon: BarChart2 },
  { path: "/app/relatorios", label: "Relatórios", icon: FileText },
  { path: "/app/cartoes", label: "Cartões", icon: CreditCard },
  { path: "/app/categorias", label: "Categorias", icon: Tag },
  { path: "/app/perfil", label: "Perfil", icon: User },
]

const pageTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/adicionar": "Adicionar Transação",
  "/app/analise": "Análise de Gastos",
  "/app/relatorios": "Relatório Mensal",
  "/app/cartoes": "Meus Cartões",
  "/app/categorias": "Categorias",
  "/app/perfil": "Meu Perfil",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/app/cartoes") && pathname.includes("/fatura/")) return "Detalhes da Fatura"
  if (pathname.startsWith("/app/cartoes")) return "Meus Cartões"
  return "Openfy"
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
  const pageTitle = getPageTitle(location.pathname)
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
