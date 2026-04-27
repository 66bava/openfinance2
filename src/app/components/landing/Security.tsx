import { motion } from "motion/react"
import { Lock, ShieldCheck, KeyRound, Server } from "lucide-react"

const pilares = [
  {
    icon: <ShieldCheck size={22} color="#16A34A" />,
    titulo: "Privacidade por design",
    descricao: "Seus dados nunca são vendidos, compartilhados ou usados para publicidade. Modelo 100% baseado em assinatura.",
  },
  {
    icon: <Lock size={22} color="#16A34A" />,
    titulo: "Criptografia ponta a ponta",
    descricao: "Dados criptografados em repouso e em trânsito. Row Level Security garante isolamento total entre contas.",
  },
  {
    icon: <KeyRound size={22} color="#16A34A" />,
    titulo: "Autenticação segura",
    descricao: "Sessões com tokens seguros e expiração automática. Suporte a autenticação social com provedores verificados.",
  },
  {
    icon: <Server size={22} color="#16A34A" />,
    titulo: "Infraestrutura confiável",
    descricao: "Hospedado na Supabase com backups automáticos e alta disponibilidade. Seus dados existem mesmo que você cancele.",
  },
]

export default function Security() {
  return (
    <section
      style={{
        backgroundColor: "#FAFAFA",
        borderTop: "1px solid #E5E5E3",
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
          style={{ textAlign: "center", marginBottom: 64 }}
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
            Segurança e privacidade
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Seus dados são seus.
            <br />
            E só seus.
          </h2>
          <p style={{ fontSize: 17, color: "#525252", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            Exporte ou delete seus dados com 1 clique. Em conformidade total com a LGPD.
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 md:grid-cols-2">
          {pilares.map((p, i) => (
            <motion.div
              key={p.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E5E3",
                borderRadius: 16,
                padding: "32px 36px",
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                background: "#F0FDF4",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {p.icon}
              </div>
              <div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#0A0A0A",
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}>
                  {p.titulo}
                </h3>
                <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.65 }}>
                  {p.descricao}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            flexWrap: "wrap",
            padding: "24px",
            background: "#FFFFFF",
            border: "1px solid #E5E5E3",
            borderRadius: 16,
          }}
        >
          {[
            "✓ Conformidade LGPD",
            "✓ Sem cookies de rastreamento",
            "✓ Exportação de dados sob demanda",
            "✓ Exclusão de conta em 1 clique",
          ].map((item) => (
            <span key={item} style={{ fontSize: 14, color: "#525252", fontWeight: 500 }}>
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
