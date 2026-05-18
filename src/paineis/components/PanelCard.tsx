import type { ReactNode } from "react"

export function PanelCard({
  title,
  description,
  right,
  children,
}: {
  title?: ReactNode
  description?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className="rounded-3xl border p-6"
      style={{ background: "var(--bg-c, var(--of-surface))", borderColor: "var(--bd, var(--of-border))" }}
    >
      {title || description || right ? (
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <div className="text-[16px] font-extrabold" style={{ color: "var(--t1, var(--of-text))" }}>
                {title}
              </div>
            ) : null}
            {description ? (
              <div className="mt-2 text-[13px]" style={{ color: "var(--t2, var(--of-text-secondary))" }}>
                {description}
              </div>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </header>
      ) : null}
      <div className={title || description || right ? "mt-5" : ""}>{children}</div>
    </section>
  )
}
