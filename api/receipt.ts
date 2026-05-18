function readEnv(name: string): string | undefined {
  const env = ((globalThis as any)?.process?.env ?? undefined) as Record<string, string | undefined> | undefined
  const value = env?.[name] ?? env?.[`VITE_${name}`]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function safeJsonParse(body: any) {
  if (typeof body === "string") {
    try {
      return JSON.parse(body)
    } catch {
      return null
    }
  }
  return body ?? null
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: { message: "Method not allowed" } })
    return
  }

  const body = safeJsonParse(req.body)
  if (!body) {
    res.status(400).json({ error: { message: "Invalid JSON body" } })
    return
  }

  const imageDataUrl = toStringOrEmpty(body.imageDataUrl)
  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
    res.status(400).json({ error: { message: "Missing imageDataUrl (data:image/*)" } })
    return
  }

  // Guardrail: Vercel Functions têm limite de payload; evitamos explodir aqui.
  if (imageDataUrl.length > 3_500_000) {
    res.status(413).json({ error: { message: "Image too large for this endpoint. Use a smaller image." } })
    return
  }

  const mock = readEnv("RECEIPT_PARSER_MOCK") === "1"

  res.setHeader("Cache-Control", "no-store")

  if (!mock) {
    // Estrutura preparada, sem fingir OCR/visão.
    res.status(200).json({
      ok: false,
      status: "not_configured",
      message: "OCR/IA visual ainda não está configurado. Envie por texto ou use o formulário manual.",
      extracted: null,
      confidence: null,
    })
    return
  }

  // Mock controlado (explicitamente marcado): NÃO usa leitura real da imagem.
  res.status(200).json({
    ok: true,
    status: "mock",
    message: "Simulação (mock) ativa. Revise todos os campos antes de salvar.",
    extracted: {
      amount: null,
      dateISO: null,
      description: "",
      type: null,
      paymentMethod: null,
      categorySuggestion: null,
    },
    confidence: 0,
  })
}

