# Workflow de Git (Finance App)

## Branches

- `main`: produção estável (deploy).
- `develop`: integração geral (pré-produção).
- `feature/<slug>`: novas funcionalidades (curtas e focadas).

### Fluxo recomendado

1. Criar feature a partir de `develop`
2. Commits pequenos e frequentes (Conventional Commits)
3. Abrir PR para `develop`
4. Após validação, promover `develop` → `main`

## Padrão de commits (Conventional Commits)

Tipos aceitos neste projeto:

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `refactor:` refatoração sem mudar comportamento
- `backend:` mudanças em API/serviços/server
- `ai:` mudanças de prompts/rotas IA/contratos
- `ui:` mudanças de UI/componentes
- `chore:` manutenção (deps, tooling, configs)

### Exemplos

- `feat: add onboarding step for payday`
- `backend: add mock open-finance transaction provider`
- `ai: add weekly insight task routing`
- `refactor: move score calculation into score-engine`

