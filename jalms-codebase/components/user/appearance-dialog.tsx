"use client"

import { useState, useTransition } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppearance, type ThemePreference } from "@/components/appearance-provider"
import { updateWorkspacePreference } from "@/lib/actions/workspace-preferences.actions"
import { cn } from "@/lib/utils"

export function AppearanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const appearance = useAppearance()
  const [theme, setTheme] = useState<ThemePreference>(appearance.theme)
  const [pending, startTransition] = useTransition()

  const save = () => startTransition(async () => {
    appearance.setTheme(theme)
    const result = await updateWorkspacePreference({ density: appearance.density, theme })
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Appearance updated")
    onOpenChange(false)
  })

  const themes: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>Choose how the workspace looks.</DialogDescription>
        </DialogHeader>
        <div>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setTheme(value)} className={cn(
                  "flex h-20 flex-col items-center justify-center gap-2 rounded-md border text-sm transition-colors",
                  theme === value ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
                )}>
                  <Icon className="size-5" />{label}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
