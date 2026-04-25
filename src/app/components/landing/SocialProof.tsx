import { motion } from "motion/react"

const tecnologias = ["Supabase", "Anthropic Claude", "Stripe", "React", "Vercel"]

export default function SocialProof() {
  return (
    <section
      style={{
        borderTop: "1px solid #E5E5E3",
        borderBottom: "1px solid #E5E5E3",
        padding: "48px 24px",
        fontFamily: "var(--font-body)",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "#A3A3A3",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 28,
        }}>
          Construído com tecnologia de ponta
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px 48px",
            opacity: 0.55,
          }}
        >
          {tecnologias.map((nome) => (
            <span
              key={nome}
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#525252",
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
              }}
            >
              {nome}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
