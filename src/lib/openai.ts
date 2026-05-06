const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

export interface ScoreContext {
  score: number
  scoreLabel: string
  totalGastos: number
  totalRenda: number
  percentualEconomia: number
  categorias: Array<{ name: string; percent: number }>
}

export async function analisarScore(ctx: ScoreContext): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error("Configure VITE_GEMINI_API_KEY no arquivo .env.local")

  const catStr = ctx.categorias.slice(0, 5).map((c) => `${c.name} (${c.percent}%)`).join(", ")

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

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `Erro ${res.status} na API`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Não foi possível gerar a análise."
}
