import { createBrowserRouter } from "react-router"
import { Layout } from "./components/Layout"
import { ProtectedRoute } from "./components/ProtectedRoute"
import Dashboard from "./pages/Dashboard"
import AddExpense from "./pages/AddExpense"
import Insights from "./pages/Insights"
import Planejamento from "./pages/Planejamento"
import InvestimentosPanel from "./pages/InvestimentosPanel"
import InvestimentosGerenciar from "./pages/InvestimentosGerenciar"
import ProfilePanel from "./pages/ProfilePanel"
import Cartoes from "./pages/Cartoes"
import Importacao from "./pages/Importacao"
import Transacoes from "./pages/Transacoes"
import Notificacoes from "./pages/Notificacoes"
import Ciclos from "./pages/Ciclos"
import Onboarding from "./pages/Onboarding"
import AceiteTermos from "./pages/AceiteTermos"
import Score from "./pages/Score"
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
          { index: true, Component: Dashboard },
          { path: "aceite-termos", Component: AceiteTermos },
          { path: "adicionar", Component: AddExpense },
          { path: "score", Component: Score },
          { path: "insights", Component: Insights },
          { path: "planejamento", Component: Planejamento },
          { path: "cartoes", Component: Cartoes },
          { path: "importacao", Component: Importacao },
          { path: "transacoes", Component: Transacoes },
          { path: "notificacoes", Component: Notificacoes },
          { path: "ciclos", Component: Ciclos },
          { path: "investimentos", Component: InvestimentosPanel },
          { path: "investimentos/gerenciar", Component: InvestimentosGerenciar },
          { path: "perfil", Component: ProfilePanel },
        ],
      },
    ],
  },
])
