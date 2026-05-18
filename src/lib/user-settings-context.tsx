import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type CurrencyPreference = "BRL" | "USD" | "EUR" | string
export type DateFormatPreference = "pt-BR" | "en-US" | string

type UserSettingsContextValue = {
  currency: CurrencyPreference
  dateLocale: DateFormatPreference
  setCurrency: (currency: CurrencyPreference) => void
  setDateLocale: (locale: DateFormatPreference) => void
}

const UserSettingsContext = createContext<UserSettingsContextValue>({
  currency: "BRL",
  dateLocale: "pt-BR",
  setCurrency: () => {},
  setDateLocale: () => {},
})

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyPreference>(() => {
    return localStorage.getItem("of-currency") || "BRL"
  })
  const [dateLocale, setDateLocaleState] = useState<DateFormatPreference>(() => {
    return localStorage.getItem("of-date-locale") || "pt-BR"
  })

  useEffect(() => {
    localStorage.setItem("of-currency", String(currency || "BRL"))
  }, [currency])

  useEffect(() => {
    localStorage.setItem("of-date-locale", String(dateLocale || "pt-BR"))
  }, [dateLocale])

  return (
    <UserSettingsContext.Provider
      value={{
        currency,
        dateLocale,
        setCurrency: setCurrencyState,
        setDateLocale: setDateLocaleState,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings() {
  return useContext(UserSettingsContext)
}

