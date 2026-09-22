"use client"

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts"
import type { LearningProfile } from "@/lib/actions/intelligence.actions"
import { ACADEMIC_DOMAIN_ORDER, ACADEMIC_DOMAIN_SHORT_LABELS } from "@/lib/learning-profile"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

export default function LearningRadarChart({ data }: { data: LearningProfile[] }) {
  const chartData = ACADEMIC_DOMAIN_ORDER.map((domain) => {
    const profile = data.find((item) => item.domain === domain)
    return { domain: ACADEMIC_DOMAIN_SHORT_LABELS[domain], score: profile?.score ?? 0 }
  })

  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="border-b px-3 py-2.5">
        <h2 className="text-sm font-semibold">Domain balance</h2>
        <p className="text-xs text-muted-foreground">Average graded performance across six academic domains.</p>
      </div>
      <div className="h-72 p-2 sm:h-80" role="img" aria-label="Radar chart of average scores across academic domains">
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="67%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
              <Radar name="Average score" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip
                formatter={(value) => [`${Number(value)}%`, "Average score"]}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--popover-foreground)", fontSize: "12px" }}
              />
            </RadarChart>
        </ResponsiveContainer>
      </div>
    </WorkspacePanel>
  )
}
