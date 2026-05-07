import { Navigate, createBrowserRouter } from "react-router"
import { Layout } from "./components/Layout"
import { ProtectedRoute } from "./components/ProtectedRoute"
import DashboardWithSupabase from "./pages/DashboardWithSupabase"
import AddExpense from "./pages/AddExpense"
import Analysis from "./pages/Analysis"
import Reports from "./pages/Reports"
import Profile from "./pages/Profile"
import Cartoes from "./pages/Cartoes"
import FaturaDetalhe from "./pages/FaturaDetalhe"
import Categorias from "./pages/Categorias"
import Futuro from "./pages/Futuro"
import Familia from "./pages/Familia"
import Onboarding from "./pages/Onboarding"
import Login from "./pages/login"
import Cadastro from "./pages/Cadastro"
import LandingPage from "./pages/LandingPage"
import Privacidade from "./pages/Privacidade"
import Termos from "./pages/Termos"
import Callback from "./pages/Callback"
import Obrigado from "./pages/Obrigado"
import Admin from "./pages/Admin"
import ResetPassword from "./pages/ResetPassword"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/dashboard",
    element: <Navigate to="/app" replace />,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/cadastro",
    Component: Cadastro,
  },
  {
    path: "/auth/callback",
    Component: Callback,
  },
  {
    path: "/privacidade",
    Component: Privacidade,
  },
  {
    path: "/termos",
    Component: Termos,
  },
  {
    path: "/obrigado",
    Component: Obrigado,
  },
  {
    path: "/admin",
    Component: Admin,
  },
  {
    path: "/reset-password",
    Component: ResetPassword,
  },
  {
    path: "/app",
    Component: ProtectedRoute,
    children: [
      { path: "onboarding", Component: Onboarding },
      {
        Component: Layout,
        children: [
          { index: true, Component: DashboardWithSupabase },
          { path: "adicionar", Component: AddExpense },
          { path: "analise", Component: Analysis },
          { path: "relatorios", Component: Reports },
          { path: "cartoes", Component: Cartoes },
          { path: "cartoes/:id/fatura/:mes/:ano", Component: FaturaDetalhe },
          { path: "categorias", Component: Categorias },
          { path: "futuro", Component: Futuro },
          { path: "familia", Component: Familia },
          { path: "perfil", Component: Profile },
        ],
      },
    ],
  },
])
