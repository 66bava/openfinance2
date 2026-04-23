1. VISÃO GERAL

Criar um UI/UX moderno, minimalista e profissional para o aplicativo Open Finance. O design deve transmitir confiança, sofisticação e clareza sem ser visualmente pesado. Paleta: preto e branco com acentos sutis.




2. IDENTIDADE VISUAL

Logo

•
Nome: OF (Open Finance)

•
Estilo: Tipografia moderna, letras "O" e "F" mescladas

•
Cores: Preto e branco

•
Descrição: Logo minimalista onde as letras se integram de forma elegante. O "O" pode envolver parcialmente o "F", criando um símbolo único. Fundo branco, letras preto.

•
Variações: Logo horizontal, vertical, ícone isolado (apenas "OF")

Paleta de Cores

•
Primária: Preto (#000000)

•
Secundária: Branco (#FFFFFF)

•
Acentos: Cinza claro (#F5F5F5), Cinza médio (#E0E0E0), Cinza escuro (#333333)

•
Destaque (CTA): Preto com hover em cinza escuro

•
Erro/Alerta: Vermelho suave (#D32F2F)

•
Sucesso: Verde suave (#388E3C)

Tipografia

•
Fonte Principal: Inter ou Poppins (moderna, limpa, sem serifas)

•
Tamanhos:

•
Títulos principais: 32px, peso 700

•
Títulos secundários: 24px, peso 600

•
Corpo de texto: 14px-16px, peso 400

•
Labels: 12px, peso 500

•
Botões: 14px, peso 600



Estilo Visual

•
Minimalista e limpo

•
Sem muitos elementos decorativos

•
Espaçamento generoso (breathing room)

•
Bordas suaves (border-radius: 8px)

•
Sombras sutis (não pesadas)

•
Ícones simples e monocromáticos




3. ESTRUTURA DO APLICATIVO

3.1 Dashboard Principal (Home)

Objetivo: Visão geral das finanças do usuário

Elementos:

•
Header com logo "OF" e nome do usuário

•
Saudação: "Olá, [Nome]"

•
Card de resumo do mês:

•
Total de gastos (grande, destaque)

•
Total de renda (grande, destaque)

•
Saldo disponível

•
Percentual de economia



•
Gráfico de gastos por categoria (pizza ou barras, minimalista)

•
Últimas transações (lista simples)

•
Botão flutuante: "+ Adicionar Gasto"

Layout: 1 coluna em mobile, 2 colunas em desktop




3.2 Adicionar Gasto

Objetivo: Interface simples para registrar gastos

Elementos:

•
Campo de entrada: Valor (grande, fácil de digitar)

•
Campo de entrada: Descrição (opcional)

•
Seletor de categoria (dropdown ou botões com ícones):

•
Alimentação

•
Transporte

•
Saúde

•
Educação

•
Entretenimento

•
Outros



•
Seletor de data (padrão: hoje)

•
Botão: "Registrar Gasto"

•
Botão: "Cancelar"

Design:

•
Formulário limpo, sem distrações

•
Campos com borda sutil

•
Labels acima dos campos

•
Feedback visual ao clicar (mudança de cor)




3.3 Análise de Gastos

Objetivo: Visualizar padrão de gastos

Elementos:

•
Filtro por período (semana, mês, ano)

•
Gráfico principal (barras ou pizza)

•
Tabela de gastos por categoria:

•
Categoria | Valor | Percentual



•
Média de gastos por categoria

•
Comparação com mês anterior (↑ ou ↓)

Design:

•
Gráficos minimalistas

•
Cores diferentes para cada categoria (variações de cinza + preto)

•
Tabela com linhas alternadas (branco e cinza claro)




3.4 Recomendações de Investimento

Objetivo: Sugerir ações baseado em padrão de gasto

Elementos:

•
Card de recomendação:

•
Ícone da empresa/ação

•
Nome da ação (ex: "BRF")

•
Seu padrão de gasto (ex: "Você gasta R$ 200/mês com comida")

•
Por quê investir (explicação clara)

•
Retorno esperado (ex: "5% ao ano")

•
Botão: "Investir Agora"



•
Lista de recomendações anteriores

Design:

•
Cards com borda sutil e sombra leve

•
Ícones monocromáticos

•
Texto explicativo em cinza médio

•
Botão em preto com hover em cinza escuro




3.5 Relatório Mensal (Download)

Objetivo: Gerar PDF/XLSX com resumo do mês

Elementos:

•
Resumo executivo:

•
Total de gastos

•
Total de renda

•
Saldo

•
Economia



•
Gráficos (gastos por categoria)

•
Tabela detalhada de transações

•
Recomendações de investimento

•
Rodapé com logo "OF"

Design:

•
Layout profissional

•
Cores preto e branco

•
Fontes legíveis em impressão

•
Espaçamento adequado

Formatos:

•
PDF (padrão)

•
XLSX (planilha Excel)




3.6 Perfil do Usuário

Objetivo: Gerenciar dados pessoais

Elementos:

•
Avatar (inicial do nome)

•
Nome completo

•
Email

•
Telefone

•
Data de cadastro

•
Botão: "Editar Perfil"

•
Botão: "Logout"

•
Configurações:

•
Moeda (padrão: R$)

•
Idioma (padrão: Português)

•
Notificações (ativar/desativar)



Design:

•
Formulário simples

•
Campos editáveis

•
Confirmação antes de logout




4. COMPONENTES REUTILIZÁVEIS

Botões

•
Primário: Preto, texto branco, hover em cinza escuro

•
Secundário: Borda preta, fundo branco, hover em cinza claro

•
Desabilitado: Cinza claro, texto cinza médio

Cards

•
Fundo branco

•
Borda sutil (1px cinza claro)

•
Sombra leve (0 2px 8px rgba(0,0,0,0.1))

•
Padding: 16px

Inputs

•
Borda: 1px cinza claro

•
Focus: Borda preta

•
Placeholder: Cinza médio

•
Padding: 12px

Ícones

•
Tamanho: 24px (padrão)

•
Cor: Preto

•
Estilo: Minimalista, sem preenchimento excessivo

Badges/Tags

•
Fundo cinza claro

•
Texto preto

•
Padding: 4px 8px

•
Border-radius: 4px




5. FLUXOS PRINCIPAIS

Fluxo 1: Registrar Gasto

1.
Usuário clica em "+ Adicionar Gasto"

2.
Modal/página abre com formulário

3.
Usuário preenche valor, categoria, descrição

4.
Clica "Registrar"

5.
Confirmação visual (toast/snackbar)

6.
Volta ao dashboard

Fluxo 2: Visualizar Recomendações

1.
Usuário acessa aba "Investimentos"

2.
IA analisa padrão de gasto

3.
Recomendações aparecem em cards

4.
Usuário clica "Investir Agora"

5.
Redirecionado para corretora (link externo)

Fluxo 3: Baixar Relatório

1.
Usuário acessa "Relatório Mensal"

2.
Seleciona período (mês, ano)

3.
Seleciona formato (PDF ou XLSX)

4.
Clica "Baixar"

5.
Arquivo é gerado e baixado




6. RESPONSIVIDADE

Mobile (< 768px)

•
Layout em 1 coluna

•
Botões flutuantes para ações principais

•
Menu inferior com navegação

•
Fontes ligeiramente menores

•
Padding reduzido

Tablet (768px - 1024px)

•
Layout em 2 colunas

•
Sidebar colapsável

•
Gráficos responsivos

Desktop (> 1024px)

•
Layout em 2-3 colunas

•
Sidebar permanente

•
Gráficos maiores

•
Mais espaço para conteúdo




7. NAVEGAÇÃO

Menu Principal (Sidebar/Bottom Nav)

•
Dashboard (Home)

•
Adicionar Gasto

•
Análise

•
Investimentos

•
Relatórios

•
Perfil

Header

•
Logo "OF" (clicável, volta ao dashboard)

•
Título da página atual

•
Ícone de notificações (opcional)

•
Avatar do usuário




8. ESTADOS E FEEDBACK

Estados de Carregamento

•
Skeleton loaders (versão cinzenta dos elementos)

•
Spinner minimalista (círculo preto com animação)

Estados Vazios

•
Ícone ilustrativo

•
Mensagem: "Nenhum gasto registrado"

•
CTA: "Adicionar primeiro gasto"

Notificações

•
Toast (canto inferior direito)

•
Cores: Verde (sucesso), Vermelho (erro), Cinza (info)

•
Duração: 3-4 segundos

Validação

•
Campos obrigatórios marcados com "*"

•
Mensagens de erro em vermelho

•
Feedback em tempo real (ex: "Valor inválido")




9. ESPECIFICAÇÕES TÉCNICAS

Espaçamento (Padding/Margin)

•
XS: 4px

•
S: 8px

•
M: 16px

•
L: 24px

•
XL: 32px

Border Radius

•
Botões: 8px

•
Cards: 8px

•
Inputs: 4px

•
Ícones: 0px (quadrado) ou 50% (circular)

Sombras

•
Leve: 0 2px 8px rgba(0,0,0,0.1)

•
Média: 0 4px 16px rgba(0,0,0,0.15)

•
Pesada: 0 8px 24px rgba(0,0,0,0.2)

Transições

•
Duração padrão: 200ms

•
Easing: ease-in-out

•
Propriedades: color, background-color, border-color, box-shadow




10. ACESSIBILIDADE

•
Contraste mínimo 4.5:1 (WCAG AA)

•
Ícones acompanhados de texto ou aria-labels

•
Navegação por teclado (Tab, Enter, Escape)

•
Foco visível (outline preto)

•
Formulários com labels associados

•
Mensagens de erro claras




11. EXEMPLO DE LAYOUT (Desktop)

Plain Text


┌─────────────────────────────────────────────────────────┐
│  OF  │ Dashboard                              🔔  👤     │
├──────┼─────────────────────────────────────────────────┤
│      │ Olá, Pedro                                      │
│ Home │                                                 │
│      │ ┌─────────────────────┐  ┌──────────────────┐  │
│ Add  │ │ Total de Gastos     │  │ Gráfico Mensal   │  │
│      │ │ R$ 1.500            │  │ [Gráfico Pizza]  │  │
│ Análise│ └─────────────────────┘  └──────────────────┘  │
│      │                                                 │
│ Inv. │ ┌──────────────────────────────────────────┐   │
│      │ │ Últimas Transações                       │   │
│ Rel. │ │ Comida      -R$ 50     Hoje              │   │
│      │ │ Transporte  -R$ 30     Ontem             │   │
│ Perf.│ │ Saúde       -R$ 100    Há 2 dias         │   │
│      │ └──────────────────────────────────────────┘   │
│      │                                                 │
└──────┴─────────────────────────────────────────────────┘






12. CHECKLIST DE ENTREGA




Logo "OF" (versões: horizontal, vertical, ícone)




Paleta de cores definida




Tipografia escolhida e aplicada




Dashboard principal (mockup)




Tela de adicionar gasto (mockup)




Tela de análise (mockup)




Tela de recomendações (mockup)




Tela de relatório (mockup)




Tela de perfil (mockup)




Componentes reutilizáveis (buttons, cards, inputs)




Design system completo (spacing, colors, typography)




Protótipo interativo (fluxos principais)




Versões mobile, tablet, desktop




Documentação de componentes




Arquivo Figma organizado (frames, componentes, estilos)




13. NOTAS IMPORTANTES

•
Manter design minimalista e profissional

•
Não adicionar elementos decorativos desnecessários

•
Priorizar clareza e usabilidade

•
Testar contraste de cores (acessibilidade)

•
Garantir consistência em todo o design

•
Usar espaçamento generoso para respirar

•
Manter foco na funcionalidade

