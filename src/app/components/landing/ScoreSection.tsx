import { motion } from "motion/react"

const pilares = [
  { nome: "Reserva de emergência", pct: 0.82, desc: "3+ meses de despesas guardadas" },
  { nome: "Taxa de poupança", pct: 0.68, desc: "% da renda poupada mensalmente" },
  { nome: "Diversificação de renda", pct: 0.55, desc: "Fontes variadas de renda" },
  { nome: "Nível de endividamento", pct: 0.90, desc: "Baixo comprometimento de renda" },
  { nome: "Consistência de registros", pct: 0.95, desc: "Registros regulares há 6+ meses" },
  { nome: "Liquidez", pct: 0.72, desc: "Acesso rápido a recursos" },
  { nome: "Cumprimento de metas", pct: 0.60, desc: "Metas concluídas no prazo" },
]

function ScoreGaugeLarge({ score = 782 }: { score?: number }) {
  const pct = score / 1000
  const angle = pct * 180
  const rad = (angle * Math.PI) / 180
  const cx = 150, cy = 130, r = 110
  const x = cx + r * Math.cos(Math.PI - rad)
  const y = cy - r * Math.sin(Math.PI - rad)
  const largeArc = angle > 180 ? 1 : 0

  return (
    <svg viewBox="0 0 300 160" width="100%" style={{ maxWidth: 300 }} aria-label={`Score ${score} de 1000`}>
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#F5F5F5" strokeWidth="16" strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`}
        fill="none" stroke="#16A34A" strokeWidth="16" strokeLinecap="round"
      />
      {/* Ponto indicador */}
      <circle cx={x} cy={y} r="8" fill="#16A34A" />

      {/* Score */}
      <text x={cx} y={cy - 20} textAnchor="middle"
        style={{ fontSize: 52, fontWeight: "800", fill: "#0A0A0A", fontFamily: "system-ui", letterSpacing: "-2" }}>
        {score}
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle"
        style={{ fontSize: 14, fill: "#A3A3A3", fontFamily: "system-ui" }}>
        de 1000
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle"
        style={{ fontSize: 14, fill: "#16A34A", fontFamily: "system-ui", fontWeight: "700" }}>
        Ótimo
      </text>

      {/* Labels extremos */}
      <text x={cx - r + 4} y={cy + 20} style={{ fontSize: 10, fill: "#A3A3A3", fontFamily: "system-ui" }}>0</text>
      <text x={cx + r - 12} y={cy + 20} style={{ fontSize: 10, fill: "#A3A3A3", fontFamily: "system-ui" }}>1000</text>
    </svg>
  )
}

export default function ScoreSection() {
  return (
    <section
      id="score"
      style={{
        backgroundColor: "#0A0A0A",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#16A34A",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 16,
          }}>
            Score exclusivo
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            O único indicador real de saúde<br className="hidden md:block" /> financeira do Brasil
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            Não é um score de crédito. É um diagnóstico completo da sua vida financeira, baseado em 7 pilares.
          </p>
        </motion.div>

        <div
          style={{ display: "grid", gap: 64, alignItems: "center" }}
          className="grid grid-cols-1 md:grid-cols-2"
        >
          {/* Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}
          >
            <ScoreGaugeLarge score={782} />
            <div style={{
              background: "rgba(22,163,74,0.08)",
              border: "1px solid rgba(22,163,74,0.2)",
              borderRadius: 12,
              padding: "16px 24px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                Evolução nos últimos 3 meses
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#16A34A", fontFamily: "var(--font-display)" }}>
                +47 pontos
              </p>
            </div>
          </motion.div>

          {/* Pilares */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {pilares.map((pilar, i) => (
              <motion.div
                key={pilar.nome}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{pilar.nome}</span>
                  <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>
                    {Math.round(pilar.pct * 100)}%
                  </span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pilar.pct * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: "#16A34A",
                      borderRadius: 3,
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{pilar.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
