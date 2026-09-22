import * as React from "react"

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <div className="admin-page-frame">{children}</div>
    </div>
  )
}
