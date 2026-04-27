import { createBrowserRouter } from "react-router"
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
import Login from "./pages/login"
import Cadastro from "./pages/Cadastro"
import LandingPage from "./pages/LandingPage"
import Privacidade from "./pages/Privacidade"
import Termos from "./pages/Termos"
import Callback from "./pages/Callback"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
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
    path: "/app",
    Component: ProtectedRoute,
    children: [
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
          { path: "perfil", Component: Profile },
        ],
      },
    ],
  },
])
