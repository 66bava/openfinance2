export type FinancialCycleSettings = {
  cycle_start_day: number
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampDate(year: number, monthIndex: number, day: number) {
  const last = daysInMonth(year, monthIndex)
  const d = Math.max(1, Math.min(last, day))
  return new Date(year, monthIndex, d, 0, 0, 0, 0)
}

function toISODate(d: Date) {
  return d.toISOString().split("T")[0]
}

export function getCurrentCycleRange(
  settings: FinancialCycleSettings,
  todayInput: Date = new Date(),
): { inicio: string; fim: string; inicioDate: Date; fimDate: Date } {
  const cycleStartDay = Math.max(1, Math.min(31, Number(settings.cycle_start_day) || 1))
  const today = new Date(todayInput)
  today.setHours(0, 0, 0, 0)

  const year = today.getFullYear()
  const month = today.getMonth()

  const startThisMonth = clampDate(year, month, cycleStartDay)
  const start =
    today.getTime() >= startThisMonth.getTime()
      ? startThisMonth
      : clampDate(year, month - 1, cycleStartDay)

  const nextStart = clampDate(start.getFullYear(), start.getMonth() + 1, cycleStartDay)
  const end = new Date(nextStart)
  end.setDate(end.getDate() - 1)
  end.setHours(0, 0, 0, 0)

  return { inicio: toISODate(start), fim: toISODate(end), inicioDate: start, fimDate: end }
}

export function getLastCycles(
  settings: FinancialCycleSettings,
  count: number,
  todayInput: Date = new Date(),
): Array<{ inicio: string; fim: string; label: string }> {
  const { inicioDate } = getCurrentCycleRange(settings, todayInput)
  const cycleStartDay = Math.max(1, Math.min(31, Number(settings.cycle_start_day) || 1))

  const out: Array<{ inicio: string; fim: string; label: string }> = []
  for (let i = count - 1; i >= 0; i--) {
    const start = clampDate(inicioDate.getFullYear(), inicioDate.getMonth() - i, cycleStartDay)
    const next = clampDate(start.getFullYear(), start.getMonth() + 1, cycleStartDay)
    const end = new Date(next)
    end.setDate(end.getDate() - 1)
    const label = start.toLocaleDateString("pt-BR", { month: "short" }) // label simples
    out.push({ inicio: toISODate(start), fim: toISODate(end), label })
  }
  return out
}

