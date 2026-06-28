interface OFLogoProps {
  size?: "sm" | "md" | "lg"
  variant?: "icon" | "horizontal"
  ariaLabel?: string
}

export function OFLogo({ size = "md", variant = "horizontal", ariaLabel = "Finance App" }: OFLogoProps) {
  const sizes = {
    sm: { box: 28, text: 14, gap: 8 },
    md: { box: 34, text: 16, gap: 10 },
    lg: { box: 44, text: 20, gap: 12 },
  }
  const s = sizes[size]

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap, color: "var(--t1, var(--of-text))" }} aria-label={ariaLabel}>
      <div
        style={{
          width: s.box,
          height: s.box,
          background: "var(--green, #16A34A)",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width={s.box * 0.6}
          height={s.box * 0.6}
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect x="0" y="9" width="4" height="5" rx="1" fill="#fff" />
          <rect x="5" y="6" width="4" height="8" rx="1" fill="#fff" />
          <rect x="10" y="2" width="4" height="12" rx="1" fill="#fff" />
          <path
            d="M12 10V5m0 0 1.4 1.4M12 5 10.6 6.4"
            stroke="var(--green, #16A34A)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {variant === "horizontal" && (
        <span
          style={{
            fontSize: s.text,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "inherit",
            fontFamily: "var(--font-display)",
          }}
        >
          Finance App
        </span>
      )}
    </div>
  )
}
