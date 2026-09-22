"use client"

import { BarChart3 } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { GradeHistoryPoint } from "@/lib/student-grades"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

export default function GradeHistoryChart({ history }: { history: GradeHistoryPoint[] }) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="border-b px-3 py-2.5"><h2 className="text-sm font-semibold">Grade history</h2><p className="text-xs text-muted-foreground">Average course grade by semester.</p></div>
      {history.length < 2 ? (
        <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
          <BarChart3 className="size-6 text-muted-foreground" />
          <p className="mt-3 text-2xl font-semibold tabular-nums">{history[0] ? `${history[0].average}%` : "—"}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{history.length ? "A trend will appear after another semester has grade data." : "Grade history will appear when course grades are available."}</p>
        </div>
      ) : (
        <div className="h-64 p-2" role="img" aria-label="Line chart showing average grades by semester">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 12, left: -18, bottom: 6 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <Tooltip formatter={(value) => [`${Number(value)}%`, "Average grade"]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--popover-foreground)", fontSize: "12px" }} />
              <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2} activeDot={{ r: 5, fill: "var(--primary)" }} dot={{ r: 3, fill: "var(--primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </WorkspacePanel>
  )
}
