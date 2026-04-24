import { NavLink, Outlet, useLocation } from "react-router";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart2,
  FileText,
  User,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { OFLogo } from "./OFLogo";
import { Toaster } from "sonner";
import { useAuth } from "../../lib/auth-context";
import { getProfile } from "../../lib/queries";
import type { Profile } from "../../lib/types";

const navItems = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/adicionar", label: "Adicionar", icon: PlusCircle },
  { path: "/app/analise", label: "Análise", icon: BarChart2 },
  { path: "/app/relatorios", label: "Relatórios", icon: FileText },
  { path: "/app/perfil", label: "Perfil", icon: User },
];

const pageTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/adicionar": "Adicionar Gasto",
  "/app/analise": "Análise de Gastos",
  "/app/relatorios": "Relatório Mensal",
  "/app/perfil": "Meu Perfil",
};

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = pageTitles[location.pathname] ?? "Open Finance";
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      getProfile(user.id).then(setProfile);
    }
  }, [user]);

  const userEmail = user?.email ?? "";
  const displayName =
    profile?.nome ||
    user?.user_metadata?.full_name ||
    userEmail.split("@")[0] ||
    "Usuário";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const plano = profile?.plano ?? "free";

  return (
    <div
      className="min-h-screen bg-[#F5F5F5] flex"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-[#E0E0E0] fixed h-full z-30">
        <div className="p-5 border-b border-[#E0E0E0]">
          <OFLogo size="sm" />
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/app"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-black text-white"
                    : "text-[#333333] hover:bg-[#F5F5F5]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Perfil sidebar */}
        <div className="p-4 border-t border-[#E0E0E0]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-semibold flex-shrink-0"
              style={{ fontSize: 14 }}>
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p
                style={{ fontSize: 12, fontWeight: 600 }}
                className="text-black truncate"
              >
                {displayName}
              </p>
              <p
                style={{ fontSize: 10 }}
                className="text-[#777777] truncate"
              >
                {userEmail}
              </p>
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full"
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  backgroundColor: plano === "pro" ? "#111111" : "#F0F0F0",
                  color: plano === "pro" ? "#FFFFFF" : "#555555",
                }}
              >
                {plano === "pro" ? "Plano Pro" : "Plano Free"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 shadow-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-[#E0E0E0] flex items-center justify-between">
          <OFLogo size="sm" />
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-[#777777]">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/app"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-black text-white"
                    : "text-[#333333] hover:bg-[#F5F5F5]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Perfil mobile drawer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E0E0E0]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-semibold flex-shrink-0"
              style={{ fontSize: 14 }}>
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 13, fontWeight: 600 }} className="text-black truncate">
                {displayName}
              </p>
              <p style={{ fontSize: 11 }} className="text-[#777777] truncate">
                {userEmail}
              </p>
              <span
                className="inline-block mt-0.5 px-2 py-0.5 rounded-full"
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  backgroundColor: plano === "pro" ? "#111111" : "#F0F0F0",
                  color: plano === "pro" ? "#FFFFFF" : "#555555",
                }}
              >
                {plano === "pro" ? "Plano Pro" : "Plano Free"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-56">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#E0E0E0] px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 text-[#333333]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 600 }} className="text-black">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-[#333333] hover:text-black transition-colors">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold cursor-pointer">
              {avatarLetter}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E0] z-20 px-2">
          <div className="flex items-center justify-around">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/app"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2 px-3 ${
                    isActive ? "text-black" : "text-[#999999]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { fontFamily: "'Inter', sans-serif", fontSize: 14 },
        }}
      />
    </div>
  );
}
