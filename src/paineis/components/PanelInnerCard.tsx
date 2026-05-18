import type { ReactNode } from "react"

export function PanelInnerCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--bd, var(--of-border))", background: "var(--bg-i, var(--of-page-bg))" }}
    >
      {children}
    </div>
  )
}
