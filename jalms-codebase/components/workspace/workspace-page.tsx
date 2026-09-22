import * as React from "react"
import { cn } from "@/lib/utils"

export function WorkspacePage({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("workspace-page", className)} {...props} />
}

export function WorkspaceHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("workspace-header", className)} {...props} />
}

export function WorkspaceToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("workspace-toolbar", className)} {...props} />
}

export function WorkspaceActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("workspace-actions", className)} {...props} />
}

export function WorkspacePanel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("workspace-panel", className)} {...props} />
}
