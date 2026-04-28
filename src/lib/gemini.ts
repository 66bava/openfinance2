import { supabase } from './supabase'

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DadosFinanceirosMes {
  usuario: {
    nome: string
    renda_mensal: number
    meta_economia: number
    plano: string
    score_atual: number
  }
  periodo: {
    mes: number
    ano: number
    nome_mes: string
  }
  resumo: {
    total_receitas: number
    total_despesas: number
    saldo: number
    percentual_economizado: number
    meta_economia_valor: number
    bateu_meta: boolean
  }
  gastos_por_categoria: Array<{
    nome: string
    emoji: string
    valor: number
    percentual: number
    quantidade_transacoes: number
  }>
  comparativo_mes_anterior: {
    total_despesas_anterior: number
    variacao_percentual: number
    aumentou: boolean
  }
  score_historico: {
    score_atual: number
    score_anterior: number
    evolucao: number
  }
  metas_ativas: Array<{
    nome: string
    valor_alvo: number
    valor_atual: number
    percentual_concluido: number
    meses_restantes: number
  }>
  maiores_gastos: Array<{
    descricao: string
    valor: number
    categoria: string
    data: string
  }>
}

export interface RelatorioIA {
  resumo_executivo: string
  ponto_de_atencao: string
  analise_categorias: string
  recomendacoes: Array<{
    titulo: string
    descricao: string
    prioridade: 'alta' | 'media' | 'baixa'
  }>
  previsao_proximo_mes: string
  mensagem_motivacional: string
  score_comentario: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mesRange(mes: number, ano: number) {
  const m = String(mes).padStart(2, '0')
  const lastDay = new Date(ano, mes, 0).getDate()
  return {
    inicio: `${ano}-${m}-01`,
    fim: `${ano}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

function fmt(n: number): string {
  return n.toFixed(2)
}

function extractJSON(text: string): string {
  const mdMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  if (mdMatch) return mdMatch[1]
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last > first) return text.slice(first, last + 1)
  return text
}

// ── Gerar relatório com Gemini ────────────────────────────────────────────────

export async function gerarRelatorioIA(dados: DadosFinanceirosMes): Promise<RelatorioIA> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_KEY_MISSING')

  const gastosCats = dados.gastos_por_categoria.length > 0
    ? dados.gastos_por_categoria
        .map(c => `- ${c.emoji} ${c.nome}: R$ ${fmt(c.valor)} (${c.percentual}% do total, ${c.quantidade_transacoes} transações)`)
        .join('\n')
    : '- Nenhum gasto registrado'

  const metasStr = dados.metas_ativas.length > 0
    ? dados.metas_ativas
        .map(m => `- ${m.nome}: ${m.percentual_concluido}% concluído (R$ ${fmt(m.valor_atual)} de R$ ${fmt(m.valor_alvo)}), ${m.meses_restantes} meses restantes`)
        .join('\n')
    : '- Nenhuma meta ativa no momento'

  const maioresStr = dados.maiores_gastos.length > 0
    ? dados.maiores_gastos
        .map(g => `- ${g.descricao}: R$ ${fmt(g.valor)} (${g.categoria}) em ${g.data}`)
        .join('\n')
    : '- Nenhum gasto registrado'

  const prompt = `Você é um consultor financeiro pessoal especializado em finanças pessoais brasileiras.
Analise os dados financeiros abaixo e gere um relatório mensal personalizado, empático e prático.

DADOS DO USUÁRIO:
Nome: ${dados.usuario.nome}
Renda mensal declarada: R$ ${fmt(dados.usuario.renda_mensal)}
Meta de economia: ${dados.usuario.meta_economia}% da renda (R$ ${fmt(dados.resumo.meta_economia_valor)})
Score de Saúde Financeira atual: ${dados.usuario.score_atual}/1000

PERÍODO: ${dados.periodo.nome_mes} de ${dados.periodo.ano}

RESUMO DO MÊS:
- Total de receitas: R$ ${fmt(dados.resumo.total_receitas)}
- Total de despesas: R$ ${fmt(dados.resumo.total_despesas)}
- Saldo do mês: R$ ${fmt(dados.resumo.saldo)}
- Percentual economizado: ${dados.resumo.percentual_economizado}%
- Bateu a meta de economia: ${dados.resumo.bateu_meta ? 'SIM' : 'NÃO'}

GASTOS POR CATEGORIA:
${gastosCats}

COMPARATIVO COM MÊS ANTERIOR:
- Despesas mês anterior: R$ ${fmt(dados.comparativo_mes_anterior.total_despesas_anterior)}
- Variação: ${dados.comparativo_mes_anterior.variacao_percentual}% (${dados.comparativo_mes_anterior.aumentou ? 'aumento' : 'redução'})

EVOLUÇÃO DO SCORE:
- Score atual: ${dados.score_historico.score_atual}
- Score mês anterior: ${dados.score_historico.score_anterior}
- Evolução: ${dados.score_historico.evolucao > 0 ? '+' : ''}${dados.score_historico.evolucao} pontos

METAS ATIVAS (Modo Missão):
${metasStr}

MAIORES GASTOS DO MÊS:
${maioresStr}

INSTRUÇÕES PARA O RELATÓRIO:
- Escreva em português brasileiro, de forma clara e sem jargão técnico
- Seja direto, honesto e empático — como um amigo que entende de finanças
- NÃO use frases genéricas como "é importante economizar" sem contexto real
- BASE todas as recomendações nos dados reais acima
- Cada recomendação deve ter uma ação concreta e específica
- O tom deve ser encorajador mas realista
- Máximo de 3 recomendações

Responda APENAS com um JSON válido, sem texto antes ou depois, sem markdown, no seguinte formato:
{
  "resumo_executivo": "Parágrafo de 3-4 frases resumindo o mês de forma direta. Mencione o saldo, se bateu a meta e a maior categoria de gasto.",
  "ponto_de_atencao": "Uma frase clara identificando o principal problema ou risco financeiro do mês. Baseie nos dados reais.",
  "analise_categorias": "Parágrafo analisando os gastos por categoria. Destaque o que está alto, o que está dentro do esperado e o que pode melhorar.",
  "recomendacoes": [
    {
      "titulo": "Título curto e direto",
      "descricao": "Descrição da ação concreta, baseada nos dados reais do usuário. Máximo 2 frases.",
      "prioridade": "alta"
    },
    {
      "titulo": "Segunda recomendação",
      "descricao": "Descrição específica baseada nos dados.",
      "prioridade": "media"
    },
    {
      "titulo": "Terceira recomendação",
      "descricao": "Descrição específica baseada nos dados.",
      "prioridade": "baixa"
    }
  ],
  "previsao_proximo_mes": "Uma frase projetando o próximo mês com base na tendência atual.",
  "mensagem_motivacional": "Frase curta e genuína de encorajamento, personalizada para a situação real do usuário. Não seja genérico.",
  "score_comentario": "Uma frase explicando o que o score atual significa e como o usuário pode melhorá-lo especificamente."
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(`API_ERROR_${res.status}`)
  }

  const json = await res.json()
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    return JSON.parse(extractJSON(text)) as RelatorioIA
  } catch {
    console.error('Gemini parse error. Raw response (first 500 chars):', text.slice(0, 500))
    throw new Error('PARSE_ERROR')
  }
}

// ── Buscar dados do mês ───────────────────────────────────────────────────────

export async function buscarDadosParaRelatorio(
  userId: string,
  mes: number,
  ano: number
): Promise<DadosFinanceirosMes> {
  const { inicio, fim } = mesRange(mes, ano)
  const prevMes = mes === 1 ? 12 : mes - 1
  const prevAno = mes === 1 ? ano - 1 : ano
  const { inicio: prevInicio, fim: prevFim } = mesRange(prevMes, prevAno)

  const [profileRes, txRes, txPrevRes, relPrevRes, metasRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('transacoes').select('*, categorias(nome, icone)').eq('user_id', userId).gte('data', inicio).lte('data', fim),
    supabase.from('transacoes').select('valor').eq('user_id', userId).eq('tipo', 'despesa').gte('data', prevInicio).lte('data', prevFim),
    supabase.from('relatorios_ia').select('conteudo').eq('user_id', userId).eq('mes', prevMes).eq('ano', prevAno).maybeSingle(),
    supabase.from('metas').select('*').eq('user_id', userId).eq('concluida', false),
  ])

  const profile = profileRes.data as Record<string, unknown> | null
  const tx = (txRes.data ?? []) as Array<Record<string, unknown>>
  const txPrev = (txPrevRes.data ?? []) as Array<{ valor: number }>
  const metas = (metasRes.data ?? []) as Array<Record<string, unknown>>

  const despesas = tx.filter(t => t.tipo === 'despesa')
  const receitas = tx.filter(t => t.tipo === 'receita')
  const totalDespesas = despesas.reduce((s, t) => s + (t.valor as number), 0)
  const totalReceitas = receitas.reduce((s, t) => s + (t.valor as number), 0)
  const saldo = totalReceitas - totalDespesas
  const renda = (profile?.renda_mensal as number) ?? 0
  const metaPct = (profile?.meta_economia as number) ?? 20
  const metaValor = (renda * metaPct) / 100
  const pctEconomizado = renda > 0 ? Math.round((saldo / renda) * 1000) / 10 : 0

  const catMap = new Map<string, { nome: string; emoji: string; valor: number; qtd: number }>()
  for (const t of despesas) {
    const cat = t.categorias as Record<string, string> | null
    const nome = cat?.nome ?? 'Outros'
    const emoji = cat?.icone ?? '📦'
    const prev = catMap.get(nome) ?? { nome, emoji, valor: 0, qtd: 0 }
    catMap.set(nome, { ...prev, valor: prev.valor + (t.valor as number), qtd: prev.qtd + 1 })
  }
  const gastosPorCategoria = Array.from(catMap.values())
    .sort((a, b) => b.valor - a.valor)
    .map(c => ({
      nome: c.nome,
      emoji: c.emoji,
      valor: Math.round(c.valor * 100) / 100,
      percentual: totalDespesas > 0 ? Math.round((c.valor / totalDespesas) * 1000) / 10 : 0,
      quantidade_transacoes: c.qtd,
    }))

  const maioresGastos = [...despesas]
    .sort((a, b) => (b.valor as number) - (a.valor as number))
    .slice(0, 5)
    .map(t => ({
      descricao: (t.descricao as string) ?? 'Sem descrição',
      valor: t.valor as number,
      categoria: ((t.categorias as Record<string, string> | null)?.nome) ?? 'Outros',
      data: t.data as string,
    }))

  const totalDespesasAnterior = txPrev.reduce((s, t) => s + t.valor, 0)
  const variacaoPct = totalDespesasAnterior > 0
    ? Math.round(((totalDespesas - totalDespesasAnterior) / totalDespesasAnterior) * 1000) / 10
    : 0

  const scoreAtual = (profile?.score as number) ?? 0
  const scoreAnterior = ((relPrevRes.data?.conteudo as Record<string, number> | null)?.score_snapshot) ?? scoreAtual

  const agora = new Date()
  const metasAtivas = metas.map(m => {
    const prazo = new Date((m.prazo as string) + 'T00:00:00')
    const diasRestantes = (prazo.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    const valorAlvo = m.valor_alvo as number
    const valorAtual = m.valor_atual as number
    return {
      nome: m.nome as string,
      valor_alvo: valorAlvo,
      valor_atual: valorAtual,
      percentual_concluido: valorAlvo > 0 ? Math.round((valorAtual / valorAlvo) * 100) : 0,
      meses_restantes: Math.max(0, Math.round(diasRestantes / 30)),
    }
  })

  return {
    usuario: {
      nome: (profile?.nome as string) ?? 'Usuário',
      renda_mensal: renda,
      meta_economia: metaPct,
      plano: (profile?.plano as string) ?? 'free',
      score_atual: scoreAtual,
    },
    periodo: { mes, ano, nome_mes: MONTHS_PT[mes - 1] },
    resumo: {
      total_receitas: Math.round(totalReceitas * 100) / 100,
      total_despesas: Math.round(totalDespesas * 100) / 100,
      saldo: Math.round(saldo * 100) / 100,
      percentual_economizado: pctEconomizado,
      meta_economia_valor: Math.round(metaValor * 100) / 100,
      bateu_meta: metaValor > 0 && saldo >= metaValor,
    },
    gastos_por_categoria: gastosPorCategoria,
    comparativo_mes_anterior: {
      total_despesas_anterior: Math.round(totalDespesasAnterior * 100) / 100,
      variacao_percentual: variacaoPct,
      aumentou: variacaoPct > 0,
    },
    score_historico: {
      score_atual: scoreAtual,
      score_anterior: scoreAnterior,
      evolucao: scoreAtual - scoreAnterior,
    },
    metas_ativas: metasAtivas,
    maiores_gastos: maioresGastos,
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

export async function getOuCriarRelatorio(
  userId: string,
  mes: number,
  ano: number
): Promise<RelatorioIA> {
  const { data: cached } = await supabase
    .from('relatorios_ia')
    .select('conteudo')
    .eq('user_id', userId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle()

  if (cached?.conteudo) return cached.conteudo as RelatorioIA

  const dados = await buscarDadosParaRelatorio(userId, mes, ano)
  const relatorio = await gerarRelatorioIA(dados)

  await supabase.from('relatorios_ia').upsert(
    { user_id: userId, mes, ano, conteudo: relatorio, modelo: 'gemini-1.5-flash' },
    { onConflict: 'user_id,mes,ano' }
  )

  return relatorio
}
