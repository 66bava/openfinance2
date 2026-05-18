const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function readEnv(name: string): string | undefined {
  // `api/*` pode nÃ£o estar incluÃ­do no tsconfig do app (Vite), entÃ£o evitamos
  // depender de tipos de Node no editor. Em runtime (Vercel Node), `process.env` existe.
  const env = ((globalThis as any)?.process?.env ?? undefined) as Record<string, string | undefined> | undefined;
  const value = env?.[name] ?? env?.[`VITE_${name}`];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasEnvKey(name: string): boolean {
  const env = ((globalThis as any)?.process?.env ?? undefined) as Record<string, string | undefined> | undefined;
  const value = env?.[name];
  return typeof value === "string" && value.trim().length > 0;
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeFirstChars(value: unknown, count = 4): string {
  const s = typeof value === "string" ? value : "";
  return s.trim().slice(0, count);
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  const text = parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("");
  return typeof text === "string" ? text : "";
}

async function callGeminiChat(opts: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string; detail?: string }> {
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(opts.model)}:generateContent`;

  // Gemini não usa "system" dentro de contents; usamos system_instruction no request.
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  if (contents.length === 0) {
    return { ok: false, status: 400, message: "Missing prompt/messages" };
  }

  const body: any = {
    contents,
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: clamp(opts.maxTokens, 64, 1024),
      temperature: clamp(opts.temperature, 0, 1.2),
    },
  };

  if (opts.systemInstruction && opts.systemInstruction.trim()) {
    // A doc oficial mostra `system_instruction` (REST) e `systemInstruction` (SDK).
    // Usamos o formato REST para maximizar compatibilidade.
    body.system_instruction = { parts: [{ text: opts.systemInstruction.trim() }] };
  }

  const gemRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": opts.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!gemRes.ok) {
    const errBody = await gemRes.json().catch(() => ({}));
    const msg = errBody?.error?.message ?? errBody?.message ?? `Erro ${gemRes.status} na API do Gemini.`;
    return { ok: false, status: gemRes.status, message: msg, detail: safeJson(errBody) };
  }

  const payload = await gemRes.json().catch(() => ({}));
  const text = extractGeminiText(payload);
  return { ok: true, text: typeof text === "string" ? text : "" };
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
      "Não mostre seções técnicas como 'dados considerados', 'contexto', 'dados usados' ou similares.",
      "Formato obrigatório:",
      "**Resumo:** (2-4 bullets curtos)",
      "**Por que seu score está assim:** (2-3 frases)",
      "**3 ações para melhorar:** (exatamente 3 itens numerados, específicos e mensuráveis)",
    ].join("\n");
  }

  if (task === "categoria") {
    return [
      ...rules,
      "",
      "Tarefa: analisar uma categoria de gastos dentro de um período e sugerir redução.",
      "Não mostre seções técnicas como 'dados considerados', 'contexto', 'dados usados' ou similares.",
      "Formato obrigatório:",
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
      "Não mostre seções técnicas como 'dados considerados', 'contexto', 'dados usados' ou similares.",
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

  if (task === "weekly_insight") {
    return [
      ...rules,
      "",
      "Tarefa: gerar 1 insight semanal automático (não-chatbot).",
      "O insight deve ser curto, humano e acionável.",
      "Não use introduções do tipo 'Claro!' ou 'Posso ajudar'. Vá direto ao ponto.",
      "Formato obrigatório:",
      "**Título:** (1 linha curta)",
      "**Mensagem:** (1-2 frases)",
      "**Ação:** (1 frase objetiva para fazer hoje)",
      "Limite: até 70 palavras no total.",
    ].join("\n");
  }

  if (task === "risk_alert") {
    return [
      ...rules,
      "",
      "Tarefa: gerar 1 alerta de risco financeiro (não-chatbot).",
      "Seja específico e use apenas dados do CONTEXTO.",
      "Formato obrigatório:",
      "**Risco:** (1 frase)",
      "**Por que agora:** (1 frase com número do CONTEXTO, se existir)",
      "**O que fazer hoje:** (1-2 passos curtos)",
      "Limite: até 80 palavras no total.",
    ].join("\n");
  }

  if (task === "opportunity_insight") {
    return [
      ...rules,
      "",
      "Tarefa: gerar 1 insight de oportunidade (não-chatbot).",
      "Foco em pequena vitória e impacto rápido.",
      "Formato obrigatório:",
      "**Oportunidade:** (1 frase)",
      "**Por que vale a pena:** (1 frase com número do CONTEXTO, se existir)",
      "**Próximo passo:** (1 passo simples)",
      "Limite: até 80 palavras no total.",
    ].join("\n");
  }

  if (task === "financial_summary") {
    return [
      ...rules,
      "",
      "Tarefa: gerar 1 resumo financeiro curto (não-chatbot).",
      "Use apenas dados do CONTEXTO.",
      "Formato obrigatório:",
      "**Resumo:** (3 bullets curtos)",
      "**1 foco da semana:** (1 frase)",
      "Limite: até 90 palavras no total.",
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

async function callSupabaseRpc(accessToken: string, rpcName: string, body: any): Promise<any> {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseAnonKey = readEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Server is missing SUPABASE_URL/SUPABASE_ANON_KEY");

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.message ?? payload?.error ?? `RPC error ${res.status}`);
  }
  return payload;
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

  let userId: string | null = null;
  try {
    const user = await requireSupabaseUser(token);
    if (!user) {
      res.status(401).json({ error: { message: "Invalid session" } });
      return;
    }
    userId = user.id;
  } catch (err) {
    res.status(500).json({ error: { message: err instanceof Error ? err.message : "Auth config error" } });
    return;
  }

  const groqKey = readEnv("GROQ_API_KEY");
  const groqKeySource = hasEnvKey("GROQ_API_KEY") ? "GROQ_API_KEY" : hasEnvKey("VITE_GROQ_API_KEY") ? "VITE_GROQ_API_KEY" : "GROQ_API_KEY";
  const groqKeyHint = groqKey
    ? `len=${String(groqKey).trim().length}, prefix=${safeFirstChars(groqKey)}, formato=${safeFirstChars(groqKey).toLowerCase() === "gsk_" ? "ok" : "suspeito"}`
    : "ausente";

  const geminiKey = readEnv("GEMINI_API_KEY");
  const geminiKeySource = hasEnvKey("GEMINI_API_KEY") ? "GEMINI_API_KEY" : hasEnvKey("VITE_GEMINI_API_KEY") ? "VITE_GEMINI_API_KEY" : "GEMINI_API_KEY";
  const geminiKeyHint = geminiKey
    ? `len=${String(geminiKey).trim().length}, prefix=${safeFirstChars(geminiKey)}, fonte=${geminiKeySource}`
    : "ausente";

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
  const geminiModel = readEnv("GEMINI_MODEL") ?? "gemini-2.0-flash";

  // Limite semanal do Conselheiro IA (persistente no banco)
  // Aplica para tarefas de conselheiro (score/categoria). Relatórios têm limite próprio.
  if (userId && (task === "score" || task === "categoria")) {
    try {
      const gate = await callSupabaseRpc(token, "incrementar_conselheiro_ia", { p_user_id: userId });

      if (!gate?.success) {
        // "Perfil não encontrado" é erro de dados, não rate-limit
        const isPerfil = typeof gate?.message === "string" && gate.message.toLowerCase().includes("perfil");
        if (isPerfil) {
          res.status(500).json({ error: { message: "Perfil do usuário não encontrado. Tente recarregar a página." } });
          return;
        }

        // Rate limit: inclui data de reset na mensagem para o cliente exibir
        let limitMsg = gate?.message ?? "Limite semanal do Conselheiro IA atingido.";
        if (gate?.reset_at) {
          const reset = new Date(gate.reset_at).toLocaleDateString("pt-BR", {
            weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          });
          limitMsg += ` Disponível novamente ${reset}.`;
        }
        res.status(429).json({ error: { message: limitMsg }, usage: gate });
        return;
      }

      // Headers precisam ser ASCII e sem quebras de linha.
      // A UI jÃ¡ consulta via RPC, entÃ£o enviamos apenas sinais simples (opcional).
      const usado = typeof gate?.usado === "number" ? gate.usado : 0;
      const limite = typeof gate?.limite === "number" ? gate.limite : 0;
      const remaining = limite < 0 ? -1 : Math.max(0, limite - usado);
      res.setHeader("x-of-ai-remaining", String(remaining));
      if (typeof gate?.reset_at === "string" && gate.reset_at.trim()) {
        res.setHeader("x-of-ai-reset-at", gate.reset_at.replace(/[\r\n]/g, ""));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao verificar limite de uso da IA.";
      res.status(500).json({ error: { message: `Falha no controle de uso: ${msg}` } });
      return;
    }
  }

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

  // Preferência: Groq (OpenAI-compatible). Se a chave estiver ausente/inválida, faz fallback automático para Gemini.
  if (!groqKey) {
    if (geminiKey) {
      const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const gem = await callGeminiChat({
        apiKey: geminiKey,
        model: geminiModel,
        systemInstruction: sys,
        messages,
        maxTokens,
        temperature,
      });

      if (gem.ok) {
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({ content: gem.text });
        return;
      }

      res.status(gem.status).json({
        error: {
          message: `Falha ao chamar IA (Groq ausente; fallback Gemini falhou). Verifique ${groqKeySource} e/ou ${geminiKeySource}.`,
          detail: gem.message,
        },
        provider: {
          groq: { key: groqKeyHint, model },
          gemini: { key: geminiKeyHint, model: geminiModel },
        },
      });
      return;
    }

    res.status(500).json({
      error: { message: "Server is missing GROQ_API_KEY (and no GEMINI_API_KEY fallback configured)" },
      provider: { groq: { key: groqKeyHint, model }, gemini: { key: geminiKeyHint, model: geminiModel } },
    });
    return;
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
    const errBody = await groqRes.json().catch(() => ({}));
    const groqMsg = errBody?.error?.message ?? errBody?.message ?? null;

    if (groqRes.status === 401 && geminiKey) {
      const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const gem = await callGeminiChat({
        apiKey: geminiKey,
        model: geminiModel,
        systemInstruction: sys,
        messages,
        maxTokens,
        temperature,
      });

      if (gem.ok) {
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({ content: gem.text });
        return;
      }

      res.status(401).json({
        error: {
          message: `Chave da Groq inválida/expirada (${groqKeySource}). Também falhou o fallback Gemini (${geminiKeySource}).`,
          detail: `${groqMsg ?? "Invalid API Key"} | Gemini: ${gem.message}`,
        },
        provider: {
          groq: { key: groqKeyHint, model },
          gemini: { key: geminiKeyHint, model: geminiModel },
        },
      });
      return;
    }

    const humanMsg =
      groqRes.status === 401
        ? `Chave de IA inválida ou expirada. Verifique ${groqKeySource} (e reinicie o dev server). Dica: ${groqKeyHint}.`
        : groqRes.status === 429
          ? "Limite de requisições da IA atingido. Tente novamente em instantes."
          : groqMsg ?? `Erro ${groqRes.status} na API de IA.`;

    res.status(groqRes.status).json({
      error: { message: humanMsg, detail: groqMsg },
      provider: {
        groq: { key: groqKeyHint, model },
        gemini: { key: geminiKeyHint, model: geminiModel },
      },
    });
    return;
  }

  const data = await groqRes.json().catch(() => ({} as any));
  const content = data?.choices?.[0]?.message?.content;
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ content: typeof content === "string" ? content : "" });
}
