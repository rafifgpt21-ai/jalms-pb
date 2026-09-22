"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const ReportPreviewClient = dynamic(
  () => import("@/components/homeroom/report-preview-client").then((module) => module.ReportPreviewClient),
  {
    ssr: false,
    loading: () => <div className="flex min-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-md border bg-card" aria-busy="true" aria-label="Loading report preview"><div className="flex items-center justify-between border-b p-2"><Skeleton className="h-8 w-28" /><Skeleton className="h-8 w-28" /></div><div className="flex-1 bg-muted/30 p-4"><Skeleton className="mx-auto h-full max-w-3xl" /></div></div>,
  },
)

export function ReportPreviewBridge(props: React.ComponentProps<typeof ReportPreviewClient>) {
  return <ReportPreviewClient {...props} />
}
