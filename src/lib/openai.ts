import { supabase } from "./supabase"

async function aiRequest(prompt: string, maxTokens = 400): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error("Faça login para usar o Conselheiro IA.")

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ prompt, maxTokens }),
  })

  const payload = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(payload?.error?.message ?? `Erro ${res.status} na API`)

  const content = payload?.content
  return typeof content === "string" && content.trim() ? content : "Não foi possível gerar a análise."
}

export interface ScoreContext {
  score: number
  scoreLabel: string
  totalGastos: number
  totalRenda: number
  percentualEconomia: number
  categorias: Array<{ name: string; percent: number }>
}

export async function analisarScore(ctx: ScoreContext): Promise<string> {
  const catStr = ctx.categorias
    .slice(0, 5)
    .map((c) => `${c.name} (${c.percent}%)`)
    .join(", ")

  const prompt = `Você é um consultor financeiro pessoal brasileiro, amigável e direto.

Score de Saúde Financeira do usuário: ${ctx.score}/1000 (${ctx.scoreLabel})
Renda mensal: R$ ${ctx.totalRenda.toFixed(2)}
Gastos mensais: R$ ${ctx.totalGastos.toFixed(2)}
Taxa de economia: ${ctx.percentualEconomia.toFixed(1)}%
Maiores categorias de gastos: ${catStr || "sem dados ainda"}

Em 2-3 frases, explique de forma empática por que o score está nesse nível.
Depois, dê exatamente 3 ações práticas e específicas para melhorar o score.
Use português brasileiro simples. Formate assim:

**Por que seu score está assim:**
[explicação]

**3 ações para melhorar:**
1. [ação concreta]
2. [ação concreta]
3. [ação concreta]`

  return aiRequest(prompt, 400)
}

export interface CategoriaContext {
  categoria: string
  valor: number
  percentualDoTotal: number
  totalGastos: number
  numTransacoes: number
  periodo: string
  topDescricoes: string[]
}

export async function analisarCategoria(ctx: CategoriaContext): Promise<string> {
  const tops = ctx.topDescricoes.length > 0 ? ctx.topDescricoes.slice(0, 4).join(", ") : "variadas"

  const prompt = `Você é um consultor financeiro pessoal brasileiro, direto e prático.

O usuário gastou R$ ${ctx.valor.toFixed(2)} em "${ctx.categoria}" ${ctx.periodo}.
Isso representa ${ctx.percentualDoTotal.toFixed(1)}% do total de gastos (R$ ${ctx.totalGastos.toFixed(2)}).
Número de transações nessa categoria: ${ctx.numTransacoes}.
Principais gastos: ${tops}.

Responda em 3 partes curtas:

**Avaliação:**
[1-2 frases: esse valor é alto, normal ou baixo? compare com referências reais do Brasil]

**Por que isso acontece:**
[1-2 frases: identifique o padrão de comportamento]

**2 ações concretas para reduzir:**
1. [ação específica com número ou meta]
2. [ação específica com número ou meta]`

  return aiRequest(prompt, 350)
}

