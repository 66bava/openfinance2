import { motion } from "motion/react"

const problemas = [
  {
    icone: "📊",
    titulo: "Apps só mostram números",
    texto: "Você vê que gastou R$ 3.200, mas não sabe se é muito ou pouco. Sem contexto, dados são só ruído.",
  },
  {
    icone: "📉",
    titulo: "Sem diagnóstico claro",
    texto: "Nenhum app diz: \"Sua saúde financeira piorou 15% esse mês.\" Você nunca sabe se está progredindo ou regredindo.",
  },
  {
    icone: "🎯",
    titulo: "Decisões no escuro",
    texto: "Sem uma referência real, você nunca sabe se pode ou não fazer aquele gasto. Intuição não é estratégia.",
  },
]

const stats = [
  { numero: "71%", texto: "dos brasileiros não sabem para onde vai o dinheiro", fonte: "SPC Brasil, 2024" },
  { numero: "67%", texto: "estão inadimplentes ou com nome negativado", fonte: "Serasa, 2024" },
]

export default function Problema() {
  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
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
            O problema
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
            Você não está no controle.
            <br />
            Você está reagindo.
          </h2>
          <p style={{ fontSize: 17, color: "#525252", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            A maioria dos apps financeiros organiza seus dados mas não responde a pergunta que importa.
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 20, marginBottom: 64 }} className="grid grid-cols-1 md:grid-cols-3">
          {problemas.map((p, i) => (
            <motion.div
              key={p.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E5E3",
                borderRadius: 16,
                padding: "36px 32px",
              }}
            >
              <div style={{
                fontSize: 28,
                marginBottom: 20,
                lineHeight: 1,
              }}>
                {p.icone}
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                color: "#0A0A0A",
                letterSpacing: "-0.01em",
                marginBottom: 12,
                lineHeight: 1.3,
              }}>
                {p.titulo}
              </h3>
              <p style={{
                fontSize: 15,
                color: "#525252",
                lineHeight: 1.65,
              }}>
                {p.texto}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            background: "#FAFAFA",
            border: "1px solid #E5E5E3",
            borderRadius: 16,
            padding: "36px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 48,
          }}
        >
          {stats.map((s) => (
            <div key={s.numero} style={{ textAlign: "center", maxWidth: 280 }}>
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: 48,
                fontWeight: 700,
                color: "#0A0A0A",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                marginBottom: 8,
              }}>
                {s.numero}
              </p>
              <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.5, marginBottom: 6 }}>
                {s.texto}
              </p>
              <p style={{ fontSize: 12, color: "#A3A3A3", fontWeight: 500 }}>
                Fonte: {s.fonte}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
