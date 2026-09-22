"use client"

import type { LearningProfile } from "@/lib/actions/intelligence.actions"
import { ACADEMIC_DOMAIN_DESCRIPTIONS, ACADEMIC_DOMAIN_LABELS } from "@/lib/learning-profile"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

export function LearningProfileTable({ data }: { data: LearningProfile[] }) {
  const sortedData = [...data].sort((a, b) => b.score - a.score || b.count - a.count)

  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2">
        <div><h2 className="text-sm font-semibold">Domain breakdown</h2><p className="text-xs text-muted-foreground">Scores are normalized against each activity&apos;s maximum points.</p></div>
        <span className="hidden text-xs text-muted-foreground sm:block">{data.reduce((total, item) => total + item.count, 0)} scored activities</span>
      </div>

      <div className="divide-y md:hidden">
        {sortedData.map((item) => (
          <div key={item.domain} className="space-y-2 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="text-sm font-semibold">{ACADEMIC_DOMAIN_LABELS[item.domain]}</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{ACADEMIC_DOMAIN_DESCRIPTIONS[item.domain]}</p></div>
              <Badge variant="secondary" className="shrink-0">{item.count} {item.count === 1 ? "activity" : "activities"}</Badge>
            </div>
            <div className="flex items-center gap-3"><Progress value={item.score} className="h-1.5 flex-1" /><span className="w-10 text-right text-sm font-semibold tabular-nums">{item.score}%</span></div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Academic domain</TableHead><TableHead className="w-[30%]">Average score</TableHead><TableHead className="w-24 text-right">Evidence</TableHead><TableHead className="hidden xl:table-cell">Focus</TableHead></TableRow></TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.domain}>
                <TableCell className="font-medium">{ACADEMIC_DOMAIN_LABELS[item.domain]}</TableCell>
                <TableCell><div className="flex items-center gap-3"><Progress value={item.score} className="h-1.5 flex-1" /><span className="w-10 text-right text-sm font-semibold tabular-nums">{item.score}%</span></div></TableCell>
                <TableCell className="text-right"><Badge variant="secondary">{item.count}</Badge></TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">{ACADEMIC_DOMAIN_DESCRIPTIONS[item.domain]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </WorkspacePanel>
  )
}
