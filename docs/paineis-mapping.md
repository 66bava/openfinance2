# Mapeamento dos painéis (`paineis/`) → app (React)

Este documento lista quais arquivos HTML da pasta `paineis/` foram usados como referência visual para substituir as telas principais do app.

## Telas principais

### Dashboard (`/app`)
- Referência principal: `paineis/Produto/Dashboard _ Vis_o geral.html`
- Auxiliar (extração do body para facilitar leitura): `paineis/.extracted-dashboard-body.pretty.html`
- Implementação (React): `src/paineis/pages/dashboard/DashboardPage.tsx`

### Score (`/app/score`)
- Referência principal: `paineis/Produto/Score _ p_gina dedicada.html`
- Implementação (React): `src/paineis/pages/score/ScorePage.tsx`

### Insights IA (`/app/insights`)
- Referência principal: `paineis/Produto/Insights da IA.html`
- Implementação (React): `src/paineis/pages/insights/InsightsPage.tsx`

### Planejamento (`/app/planejamento`)
- Painel dedicado não encontrado em `paineis/Produto/` até o momento.
- Base visual reaproveitada: padrões de cards/typography/spacing do painel de Dashboard.
- Implementação (React): `src/paineis/pages/planejamento/PlanejamentoPage.tsx`

### Investimentos (`/app/investimentos`)
- Painel dedicado não encontrado em `paineis/Produto/` até o momento.
- Base visual reaproveitada: padrões de cards/typography/spacing do painel de Dashboard.
- Implementação (React): `src/paineis/pages/investimentos/InvestimentosPage.tsx`

### Perfil (`/app/perfil`)
- Painel dedicado não encontrado em `paineis/Produto/` até o momento.
- Base visual reaproveitada: padrões de cards/typography/spacing do painel de Dashboard.
- Implementação (React): `src/paineis/pages/perfil/PerfilPage.tsx`

## Sistema (estrutura)

### Sidebar / Topbar
- Referência principal: `paineis/Sistema/Sidebar _ spec.html`
- Implementação (React):
  - `src/paineis/layout/AppSidebar.tsx`
  - `src/paineis/layout/AppTopbar.tsx`
  - Integração no app: `src/app/components/Layout.tsx`

## Onboarding (novo)
- Referências principais:
  - `paineis/Onboarding/01 _ Welcome.html`
  - `paineis/Onboarding/02 _ Conex_o autom_tica.html`
- Implementação (React): `src/paineis/pages/onboarding/OnboardingPage.tsx`

## Landing (fora do escopo do app logado)
- Referência principal: `paineis/LP/Hero _ piloto autom_tico.html`
- Observação: este painel é usado como referência para a LP, não para as telas principais do app em `/app/*`.

