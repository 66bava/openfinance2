# Estrutura do projeto (alvo)

O redesign visual e os novos painéis ficam em `paineis/` (fora do build do Vite).
O app em produção fica em `src/`.

## Diretórios (src/)

- `src/features/`: lógica por domínio (dashboard, onboarding, investimentos, etc.)
- `src/services/`: integrações e regras (Supabase, Open Finance mock, categorização, etc.)
- `src/ai/`: geração de insights (não-chatbot), contratos e helpers
- `src/score-engine/`: engine de score (0–1000) e explicações/micro-insights
- `src/prompts/`: prompts e templates usados por `src/ai/`
- `src/types/`: tipos compartilhados do app (re-export/organização)

## Observações

- Migrações ficam em `supabase/migrations/` e devem ser incrementais.
- Evitar mover arquivos grandes sem necessidade; preferir criar módulos novos e migrar importações aos poucos.

