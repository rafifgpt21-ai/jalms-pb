"use client"

import { useState } from "react"
import { Building2, Loader2, Save, School } from "lucide-react"
import { toast } from "sonner"
import type { SchoolPrincipalNames } from "@/lib/school-principals"
import { updateSchoolPrincipalNames } from "@/lib/actions/system-config.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

export function SchoolPrincipalsForm({ initialPrincipals }: { initialPrincipals: SchoolPrincipalNames }) {
  const [principals, setPrincipals] = useState(initialPrincipals)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const result = await updateSchoolPrincipalNames(principals)
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("School principals updated")
  }

  return (
    <WorkspacePanel className="max-w-3xl overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Report card signatories</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">The report card selects a principal automatically from the class grade level.</p>
      </div>

      <div className="divide-y">
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
          <span className="flex size-10 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><School className="size-4" /></span>
          <div className="min-w-0 space-y-2">
            <div><Label htmlFor="smp-principal">Junior high school principal (SMP)</Label><p className="text-xs text-muted-foreground">Used by classes assigned to grades 7, 8, and 9.</p></div>
            <Input id="smp-principal" value={principals.SMP} onChange={(event) => setPrincipals((current) => ({ ...current, SMP: event.target.value }))} placeholder="Enter the SMP principal's full name" autoComplete="off" />
          </div>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
          <span className="flex size-10 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300"><Building2 className="size-4" /></span>
          <div className="min-w-0 space-y-2">
            <div><Label htmlFor="sma-principal">Senior high school principal (SMA)</Label><p className="text-xs text-muted-foreground">Used by classes assigned to grades 10, 11, and 12.</p></div>
            <Input id="sma-principal" value={principals.SMA} onChange={(event) => setPrincipals((current) => ({ ...current, SMA: event.target.value }))} placeholder="Enter the SMA principal's full name" autoComplete="off" />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t bg-muted/20 px-4 py-3">
        <Button onClick={save} disabled={saving} className="max-sm:w-full">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save principals
        </Button>
      </div>
    </WorkspacePanel>
  )
}
