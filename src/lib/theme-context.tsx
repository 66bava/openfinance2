import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"
export type ThemePreference = Theme | "system"

const ThemeContext = createContext<{
  theme: Theme
  themePreference: ThemePreference
  setThemePreference: (pref: ThemePreference) => void
  toggleTheme: () => void
}>({
  theme: "light",
  themePreference: "system",
  setThemePreference: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem("of-theme")
    if (stored === "dark" || stored === "light" || stored === "system") return stored
    return "system"
  })

  const [theme, setTheme] = useState<Theme>(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    return prefersDark ? "dark" : "light"
  })

  useEffect(() => {
    localStorage.setItem("of-theme", themePreference)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const compute = () => {
      const effective: Theme = themePreference === "system" ? (mq.matches ? "dark" : "light") : themePreference
      setTheme(effective)
      document.documentElement.classList.toggle("dark", effective === "dark")
    }

    compute()

    const handler = () => {
      if (themePreference !== "system") return
      compute()
    }

    // Safari fallback: addEventListener pode não existir em versões antigas
    if ((mq as any).addEventListener) (mq as any).addEventListener("change", handler)
    else (mq as any).addListener?.(handler)

    return () => {
      if ((mq as any).removeEventListener) (mq as any).removeEventListener("change", handler)
      else (mq as any).removeListener?.(handler)
    }
  }, [themePreference])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference,
        toggleTheme: () => setThemePreference((p) => (p === "dark" ? "light" : p === "light" ? "system" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
