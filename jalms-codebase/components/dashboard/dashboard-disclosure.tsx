"use client"

import { useId, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardDisclosureProps {
  label: string
  expandedLabel?: string
  children: React.ReactNode
  expandedChildren: React.ReactNode
}

export function DashboardDisclosure({
  label,
  expandedLabel = "Show less",
  children,
  expandedChildren,
}: DashboardDisclosureProps) {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()

  return (
    <>
      {children}
      <div className="border-t px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9 w-full justify-between px-2 text-muted-foreground"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span>{expanded ? expandedLabel : label}</span>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
      {expanded && <div id={contentId} className="divide-y border-t">{expandedChildren}</div>}
    </>
  )
}
