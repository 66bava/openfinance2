export const categoryColors: Record<string, string> = {
  Alimentação: "#111111",
  Transporte: "#333333",
  Saúde: "#555555",
  Educação: "#777777",
  Entretenimento: "#999999",
  Outros: "#BBBBBB",
}

export const categoryIcons: Record<string, string> = {
  Alimentação: "🍽️",
  Transporte: "🚌",
  Saúde: "🏥",
  Educação: "📚",
  Entretenimento: "🎬",
  Outros: "📦",
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Hoje"
  if (date.toDateString() === yesterday.toDateString()) return "Ontem"

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
