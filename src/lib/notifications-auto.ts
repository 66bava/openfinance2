import { createNotification } from "./queries"
import type { ScoreResult } from "../score-engine"
import type { ImportedTransactionCandidate } from "./import"

// ─── Notificação: importação concluída ───────────────────────────────────────

export async function notifyImportCompleted(
  userId: string,
  opts: {
    filename: string
    inserted: number
    failed: number
    duplicates: number
    scoreAntes?: number | null
    scoreDepois?: number | null
  },
): Promise<void> {
  const { filename, inserted, failed, duplicates, scoreAntes, scoreDepois } = opts

  let title = "Importação concluída"
  let message = `${inserted} transações importadas de "${filename}".`
  if (failed > 0) message += ` ${failed} falharam.`
  if (duplicates > 0) message += ` ${duplicates} duplicadas ignoradas.`

  await createNotification(userId, {
    type: "import_completed",
    title,
    message,
    metadata: { filename, inserted, failed, duplicates, scoreAntes, scoreDepois },
  }).catch(() => {})
}

export async function notifyImportFailed(
  userId: string,
  opts: { filename: string; reason: string },
): Promise<void> {
  await createNotification(userId, {
    type: "import_failed",
    title: "Erro na importação",
    message: `Não foi possível importar "${opts.filename}". ${opts.reason}`,
    metadata: { filename: opts.filename },
  }).catch(() => {})
}

// ─── Notificação: mudança de score ───────────────────────────────────────────

export async function notifyScoreChange(
  userId: string,
  scoreBefore: number,
  scoreAfter: number,
): Promise<void> {
  const delta = scoreAfter - scoreBefore
  const absDelta = Math.abs(delta)
  if (absDelta < 30) return // variação pequena não notifica

  const subiu = delta > 0
  const title = subiu ? "Seu score subiu!" : "Seu score caiu"
  const message = subiu
    ? `Parabéns! Seu score Openfy foi de ${scoreBefore} para ${scoreAfter} (+${absDelta} pts).`
    : `Atenção: seu score caiu de ${scoreBefore} para ${scoreAfter} (−${absDelta} pts). Revise seus gastos.`

  await createNotification(userId, {
    type: subiu ? "score_up" : "score_down",
    title,
    message,
    metadata: { scoreBefore, scoreAfter, delta },
  }).catch(() => {})
}

// ─── Notificação: assinatura detectada ───────────────────────────────────────

export async function notifySubscriptionsDetected(
  userId: string,
  subs: Array<{ name: string; monthlyEstimate: number }>,
): Promise<void> {
  if (subs.length === 0) return

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  if (subs.length === 1) {
    const s = subs[0]!
    await createNotification(userId, {
      type: "subscription_detected",
      title: "Assinatura detectada",
      message: `Identificamos "${s.name}" como uma assinatura recorrente de ${fmtBRL(s.monthlyEstimate)}/mês.`,
      metadata: { subscriptions: subs },
    }).catch(() => {})
  } else {
    const total = subs.reduce((s, x) => s + x.monthlyEstimate, 0)
    await createNotification(userId, {
      type: "subscription_detected",
      title: `${subs.length} assinaturas detectadas`,
      message: `Encontramos ${subs.length} assinaturas recorrentes totalizando ${fmtBRL(total)}/mês.`,
      metadata: { subscriptions: subs },
    }).catch(() => {})
  }
}

// ─── Notificação: saldo negativo ─────────────────────────────────────────────

export async function notifyNegativeBalance(
  userId: string,
  saldoDisponivel: number,
): Promise<void> {
  if (saldoDisponivel >= 0) return

  const fmtBRL = (v: number) =>
    Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  await createNotification(userId, {
    type: "negative_balance",
    title: "Saldo negativo no ciclo",
    message: `Seus gastos superam suas receitas em ${fmtBRL(saldoDisponivel)} neste ciclo. Revise suas despesas.`,
    metadata: { saldoDisponivel },
  }).catch(() => {})
}

// ─── Notificação: gasto elevado em categoria ─────────────────────────────────

export async function notifyHighCategorySpend(
  userId: string,
  categoria: string,
  valor: number,
  percentual: number,
): Promise<void> {
  if (percentual < 40) return // só notifica se categoria domina 40%+ dos gastos

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  await createNotification(userId, {
    type: "high_category_spend",
    title: `Atenção: ${categoria} está alta`,
    message: `${categoria} representa ${Math.round(percentual)}% das suas despesas neste ciclo (${fmtBRL(valor)}).`,
    metadata: { categoria, valor, percentual },
  }).catch(() => {})
}

// ─── Notificação: investimento detectado ─────────────────────────────────────

export async function notifyInvestmentTransactionsDetected(
  userId: string,
  count: number,
  totalValue: number,
): Promise<void> {
  if (count === 0) return

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  await createNotification(userId, {
    type: "investment_detected",
    title: "Movimentações de investimento detectadas",
    message: `${count} transação(ões) de investimento no valor de ${fmtBRL(totalValue)} foram identificadas. Confira em Investimentos.`,
    metadata: { count, totalValue },
  }).catch(() => {})
}

// ─── Notificação: duplicatas encontradas ─────────────────────────────────────

export async function notifyDuplicatesFound(
  userId: string,
  duplicates: number,
  filename: string,
): Promise<void> {
  if (duplicates <= 0) return

  await createNotification(userId, {
    type: "duplicate_found",
    title: "Duplicatas encontradas",
    message: `${duplicates} transação(ões) de "${filename}" já existiam e foram ignoradas para evitar duplicação.`,
    metadata: { duplicates, filename },
  }).catch(() => {})
}

// ─── Disparar todas as notificações pós-importação ───────────────────────────

export async function triggerPostImportNotifications(
  userId: string,
  opts: {
    filename: string
    inserted: number
    failed: number
    duplicates: number
    scoreAntes: number
    scoreDepois: number
    saldoDisponivel: number
    topCategoria: { name: string; value: number; percent: number } | null
    subscriptions: Array<{ name: string; monthlyEstimate: number }>
    investmentCount: number
    investmentTotal: number
  },
): Promise<void> {
  await Promise.allSettled([
    notifyImportCompleted(userId, {
      filename: opts.filename,
      inserted: opts.inserted,
      failed: opts.failed,
      duplicates: opts.duplicates,
      scoreAntes: opts.scoreAntes,
      scoreDepois: opts.scoreDepois,
    }),
    notifyDuplicatesFound(userId, opts.duplicates, opts.filename),
    notifyScoreChange(userId, opts.scoreAntes, opts.scoreDepois),
    notifySubscriptionsDetected(userId, opts.subscriptions),
    opts.saldoDisponivel < 0 ? notifyNegativeBalance(userId, opts.saldoDisponivel) : Promise.resolve(),
    opts.topCategoria
      ? notifyHighCategorySpend(userId, opts.topCategoria.name, opts.topCategoria.value, opts.topCategoria.percent)
      : Promise.resolve(),
    opts.investmentCount > 0
      ? notifyInvestmentTransactionsDetected(userId, opts.investmentCount, opts.investmentTotal)
      : Promise.resolve(),
  ])
}
