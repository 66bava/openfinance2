# Open Finance - Integração Supabase

## Arquivos Incluídos

- **lib/** - Pasta com arquivos de conexão com Supabase
  - `supabase.ts` - Configuração do Supabase
  - `types.ts` - Tipos TypeScript
  - `queries.ts` - Funções para buscar dados

- **DashboardWithSupabase.tsx** - Dashboard com dados reais do Supabase
- **routes.tsx** - Rotas atualizadas
- **.env.local** - Variáveis de ambiente (Supabase)
- **package.json** - Dependências (adicione o script "dev")

## Como Instalar no Seu PC

### Passo 1: Copiar Arquivos

1. Abra seu projeto no VS Code
2. Copie a pasta `lib` para `src/lib`
3. Copie `DashboardWithSupabase.tsx` para `src/app/pages/`
4. Copie `routes.tsx` para `src/app/` (substitua o arquivo existente)
5. Copie `.env.local` para a raiz do projeto

### Passo 2: Atualizar package.json

Abra `package.json` e procure por:

```json
"scripts": {
  "build": "vite build"
}
```

Substitua por:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build"
}
```

### Passo 3: Instalar Dependências

Abra o terminal (Ctrl + `) e execute:

```bash
npm install @supabase/supabase-js
```

### Passo 4: Rodar o Projeto

Execute:

```bash
npm run dev
```

Seu app vai rodar em: `http://localhost:5173`

## Pronto!

Seu dashboard agora está conectado com Supabase e mostrando dados reais! 🚀
