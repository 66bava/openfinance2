import { createContext, useContext, useState, type ReactNode } from "react"
import { getT, type Lang, type TranslationKey } from "./i18n"

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "pt",
  setLang: () => {},
  t: getT("pt"),
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("of-lang")
    if (stored === "pt" || stored === "en" || stored === "es") return stored
    return "pt"
  })

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem("of-lang", newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: getT(lang) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
