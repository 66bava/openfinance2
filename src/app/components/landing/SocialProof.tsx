import { motion } from "motion/react"

const metricas = [
  {
    numero: "200+",
    label: "na lista de espera",
    detalhe: "e crescendo",
  },
  {
    numero: "14 dias",
    label: "trial grátis",
    detalhe: "sem cartão de crédito",
  },
  {
    numero: "100%",
    label: "LGPD compliant",
    detalhe: "seus dados são seus",
  },
]

export default function SocialProof() {
  return (
    <section
      style={{
        borderTop: "1px solid #E5E5E3",
        borderBottom: "1px solid #E5E5E3",
        padding: "48px 24px",
        fontFamily: "var(--font-body)",
        backgroundColor: "#FAFAFA",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
          }}
          className="grid grid-cols-1 md:grid-cols-3"
        >
          {metricas.map((m, i) => (
            <div
              key={m.label}
              style={{
                textAlign: "center",
                padding: "24px 32px",
                borderRight: i < metricas.length - 1 ? "1px solid #E5E5E3" : "none",
                borderBottom: "none",
              }}
              className={i < metricas.length - 1 ? "border-b md:border-b-0 border-[#E5E5E3]" : ""}
            >
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3vw, 40px)",
                fontWeight: 700,
                color: "#0A0A0A",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {m.numero}
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>
                {m.label}
              </p>
              <p style={{ fontSize: 13, color: "#A3A3A3" }}>
                {m.detalhe}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
