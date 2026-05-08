const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function readEnv(name: string): string | undefined {
  const value = process.env[name] ?? process.env[`VITE_${name}`];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const maxTokens = Number.isFinite(body?.maxTokens) ? Number(body.maxTokens) : 400;

  if (!prompt.trim()) {
    res.status(400).json({ error: { message: "Missing prompt" } });
    return;
  }

  // Guardrails to reduce abuse/cost spikes
  if (prompt.length > 12_000) {
    res.status(400).json({ error: { message: "Prompt too long" } });
    return;
  }

  const model = readEnv("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: Math.max(64, Math.min(1000, maxTokens)),
      temperature: 0.7,
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
