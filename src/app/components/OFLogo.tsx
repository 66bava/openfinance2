interface OFLogoProps {
  size?: "sm" | "md" | "lg"
  variant?: "icon" | "horizontal"
}

export function OFLogo({ size = "md", variant = "horizontal" }: OFLogoProps) {
  const sizes = {
    sm: { box: 28, text: 14, gap: 8 },
    md: { box: 34, text: 16, gap: 10 },
    lg: { box: 44, text: 20, gap: 12 },
  }
  const s = sizes[size]

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap }}>
      <div
        style={{
          width: s.box,
          height: s.box,
          background: "#16A34A",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={s.box * 0.6} height={s.box * 0.6} viewBox="0 0 14 14" fill="none">
          <rect x="0" y="8" width="4" height="6" rx="1" fill="white" />
          <rect x="5" y="4" width="4" height="10" rx="1" fill="white" />
          <rect x="10" y="0" width="4" height="14" rx="1" fill="white" />
        </svg>
      </div>
      {variant === "horizontal" && (
        <span style={{
          fontSize: s.text,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--of-text)",
          fontFamily: "var(--font-display)",
        }}>
          Openfy
        </span>
      )}
    </div>
  )
}
