import type { Lang } from "./i18n"

export function langToLocale(lang: Lang): string {
  switch (lang) {
    case "en":
      return "en-US"
    case "es":
      return "es-ES"
    case "pt":
    default:
      return "pt-BR"
  }
}

export function formatCurrency(value: number, lang: Lang, currency = "BRL"): string {
  return new Intl.NumberFormat(langToLocale(lang), { style: "currency", currency }).format(value)
}

export function formatShortDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString(langToLocale(lang), { day: "2-digit", month: "short" })
}

export function formatDate(dateStr: string, lang: Lang, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString(langToLocale(lang), options ?? { day: "2-digit", month: "2-digit", year: "numeric" })
}

