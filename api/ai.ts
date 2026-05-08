const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function readEnv(name: string): string | undefined {
  const value = process.env[name] ?? process.env[`VITE_${name}`];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function normalizeTask(task: unknown): string {
  const t = typeof task === "string" ? task.trim().toLowerCase() : "";
  return t;
}

function baseSystemPrompt(task: string): string {
  const rules = [
    "Você é um consultor financeiro pessoal brasileiro, direto, gentil e prático.",
    "Confiabilidade é prioridade: use APENAS dados fornecidos no CONTEXTO/DADOS ou no pedido do usuário.",
    "Não invente números, percentuais, leis, médias do Brasil ou estatísticas. Se precisar de referência geral, rotule como estimativa e explique a suposição.",
    "Se algum dado essencial estiver ausente ou incoerente, diga claramente 'Dados insuficientes' e faça perguntas objetivas.",
    "Sempre que citar um número, ele deve existir no CONTEXTO/DADOS (ou ser uma conta explícita a partir deles).",
    "Responda em português do Brasil, com formatação Markdown simples.",
  ];

  if (task === "score") {
    return [
      ...rules,
      "",
      "Tarefa: analisar score e sugerir melhorias.",
      "Formato obrigatório:",
      "**Dados considerados:** (liste os números usados)",
      "**Por que seu score está assim:** (2-3 frases)",
      "**3 ações para melhorar:** (exatamente 3 itens numerados, específicos e mensuráveis)",
    ].join("\n");
  }

  if (task === "categoria") {
    return [
      ...rules,
      "",
      "Tarefa: analisar uma categoria de gastos dentro de um período e sugerir redução.",
      "Formato obrigatório:",
      "**Dados considerados:** (liste os números usados)",
      "**Avaliação:** (1-2 frases)",
      "**Por que isso acontece:** (1-2 frases)",
      "**2 ações concretas para reduzir:** (exatamente 2 itens numerados, com meta/numero)",
    ].join("\n");
  }

  if (task === "report") {
    return [
      ...rules,
      "",
      "Tarefa: analisar o período inteiro (receitas, despesas, categorias e padrões) e entregar um plano de ação robusto.",
      "Regras extras:",
      "- Não cite 'médias do Brasil' nem comparações externas; trabalhe apenas com o histórico fornecido.",
      "- Quando afirmar 'aumentou/diminuiu', mostre o número (antes/depois) se estiver no CONTEXTO; senão, não afirme.",
      "- O plano deve ter metas com números e prazo (7/30/90 dias).",
      "Formato obrigatório:",
      "**Resumo do período:** (3-5 bullets)",
      "**Por que está assim (causas prováveis):** (3-6 bullets com evidências do CONTEXTO)",
      "**Plano de ação (7 dias):** (3-5 itens)",
      "**Plano de ação (30 dias):** (5-8 itens)",
      "**Plano de ação (90 dias):** (5-8 itens)",
      "**Metas sugeridas:** (3-6 metas com número e prazo)",
      "**Perguntas (se faltar dado):** (até 5 perguntas objetivas)",
    ].join("\n");
  }

  return rules.join("\n");
}

function buildContextMessage(context: unknown): string {
  const json = safeJson(context);
  return `CONTEXTO (JSON):\n\`\`\`json\n${json}\n\`\`\``;
}

function coerceMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const out: ChatMessage[] = [];
  for (const m of input) {
    const role = (m as any)?.role;
    const content = (m as any)?.content;
    if (role !== "system" && role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    out.push({ role, content });
  }
  return out.length > 0 ? out : null;
}

async function requireSupabaseUser(accessToken: string): Promise<{ id: string } | null> {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseAnonKey = readEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Server is missing SUPABASE_URL/SUPABASE_ANON_KEY");

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as any;
  if (!data?.id) return null;
  return { id: data.id };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const authHeader = String(req.headers?.authorization ?? "");
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: { message: "Unauthorized" } });
    return;
  }

  try {
    const user = await requireSupabaseUser(token);
    if (!user) {
      res.status(401).json({ error: { message: "Invalid session" } });
      return;
    }
  } catch (err) {
    res.status(500).json({ error: { message: err instanceof Error ? err.message : "Auth config error" } });
    return;
  }

  const groqKey = readEnv("GROQ_API_KEY");
  if (!groqKey) {
    res.status(500).json({ error: { message: "Server is missing GROQ_API_KEY" } });
    return;
  }

  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: { message: "Invalid JSON body" } });
      return;
    }
  }

  const task = normalizeTask(body?.task);
  const maxTokens = Number.isFinite(body?.maxTokens) ? Number(body.maxTokens) : 400;
  const temperature = Number.isFinite(body?.temperature) ? Number(body.temperature) : 0.7;

  const prompt = toStringOrEmpty(body?.prompt);
  const incomingMessages = coerceMessages(body?.messages);
  const context = body?.context;

  const hasPrompt = Boolean(prompt.trim());
  const hasMessages = Boolean(incomingMessages && incomingMessages.length > 0);
  if (!hasPrompt && !hasMessages) {
    res.status(400).json({ error: { message: "Missing prompt/messages" } });
    return;
  }

  // Guardrails to reduce abuse/cost spikes
  if (prompt.length > 12_000) {
    res.status(400).json({ error: { message: "Prompt too long" } });
    return;
  }

  const contextStr = context == null ? "" : safeJson(context);
  if (contextStr.length > 25_000) {
    res.status(400).json({ error: { message: "Context too large" } });
    return;
  }

  const model = readEnv("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

  const messages: ChatMessage[] = [];
  messages.push({ role: "system", content: baseSystemPrompt(task) });
  if (context != null) {
    messages.push({ role: "system", content: buildContextMessage(context) });
  }
  if (hasMessages && incomingMessages) {
    messages.push(...incomingMessages);
  } else {
    messages.push({ role: "user", content: prompt.trim() });
  }

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: Math.max(64, Math.min(1000, maxTokens)),
      temperature: Math.max(0, Math.min(1.2, temperature)),
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.json().catch(() => ({}));
    res.status(groqRes.status).json({
      error: { message: err?.error?.message ?? `Groq API error ${groqRes.status}` },
    });
    return;
  }

  const data = await groqRes.json().catch(() => ({} as any));
  const content = data?.choices?.[0]?.message?.content;
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ content: typeof content === "string" ? content : "" });
}
