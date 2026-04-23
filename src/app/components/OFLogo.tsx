interface OFLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "horizontal";
}

export function OFLogo({ size = "md", variant = "horizontal" }: OFLogoProps) {
  const sizes = {
    sm: { box: 28, text: 12, label: 11 },
    md: { box: 36, text: 16, label: 13 },
    lg: { box: 48, text: 20, label: 15 },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      {/* Icon mark */}
      <div
        style={{ width: s.box, height: s.box }}
        className="bg-black rounded-lg flex items-center justify-center flex-shrink-0"
      >
        <svg
          width={s.box * 0.65}
          height={s.box * 0.65}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* O shape that partially overlaps with F */}
          <circle cx="10" cy="12" r="7" stroke="white" strokeWidth="2.2" fill="none" />
          {/* F shape integrated */}
          <line x1="13" y1="7" x2="19" y2="7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="13" y1="12" x2="17" y2="12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="13" y1="7" x2="13" y2="18" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Text */}
      {variant === "horizontal" && (
        <div className="flex flex-col leading-none">
          <span
            style={{ fontSize: s.text, fontWeight: 700, letterSpacing: "-0.02em" }}
            className="text-black"
          >
            Open Finance
          </span>
          <span
            style={{ fontSize: s.label - 2, fontWeight: 400, letterSpacing: "0.08em" }}
            className="text-[#777777]"
          >
            GESTÃO FINANCEIRA
          </span>
        </div>
      )}
    </div>
  );
}
