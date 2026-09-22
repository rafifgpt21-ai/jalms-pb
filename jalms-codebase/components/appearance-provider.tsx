"use client"

import * as React from "react"

export type UiDensity = "compact" | "comfortable"
export type ThemePreference = "system" | "light" | "dark"

type AppearanceContextValue = {
  density: UiDensity
  theme: ThemePreference
  setDensity: (density: UiDensity) => void
  setTheme: (theme: ThemePreference) => void
}

const AppearanceContext = React.createContext<AppearanceContextValue | null>(null)

function applyAppearance(density: UiDensity, theme: ThemePreference) {
  const root = document.documentElement
  root.dataset.density = density
  root.dataset.theme = theme
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", dark)
  root.style.colorScheme = dark ? "dark" : "light"
}

export function AppearanceProvider({ children, initialDensity = "compact", initialTheme = "system" }: {
  children: React.ReactNode
  initialDensity?: UiDensity
  initialTheme?: ThemePreference
}) {
  const [density, setDensityState] = React.useState<UiDensity>(initialDensity)
  const [theme, setThemeState] = React.useState<ThemePreference>(initialTheme)

  React.useEffect(() => {
    applyAppearance(density, theme)
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => applyAppearance(density, theme)
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [density, theme])

  const setDensity = React.useCallback((next: UiDensity) => {
    setDensityState(next)
    document.cookie = `arsync-density=${next}; path=/; max-age=31536000; samesite=lax`
    applyAppearance(next, theme)
  }, [theme])

  const setTheme = React.useCallback((next: ThemePreference) => {
    setThemeState(next)
    document.cookie = `arsync-theme=${next}; path=/; max-age=31536000; samesite=lax`
    applyAppearance(density, next)
  }, [density])

  return <AppearanceContext.Provider value={{ density, theme, setDensity, setTheme }}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const value = React.useContext(AppearanceContext)
  if (!value) throw new Error("useAppearance must be used within AppearanceProvider")
  return value
}

