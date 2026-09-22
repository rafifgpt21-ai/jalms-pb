"use client"

import { useEffect } from "react"
import { useAppearance, type ThemePreference, type UiDensity } from "@/components/appearance-provider"

export function AppearancePreferenceHydrator({ density, theme }: { density: UiDensity; theme: ThemePreference }) {
  const appearance = useAppearance()
  useEffect(() => {
    if (appearance.density !== density) appearance.setDensity(density)
    if (appearance.theme !== theme) appearance.setTheme(theme)
  }, [appearance, density, theme])
  return null
}

