import { motion } from "motion/react"
import { AlertCircle, TrendingDown, Target } from "lucide-react"

const problemas = [
  {
    Icone: AlertCircle,
    titulo: "Planilhas que você abandona",
    descricao: "Você começa no Excel, dura uma semana, desiste. Sem automação, sem contexto, sem acompanhamento — você larga tudo.",
  },
  {
    Icone: TrendingDown,
    titulo: "Apps que mostram gráficos, não respostas",
    descricao: "Você vê um gráfico bonito de onde gasta, mas ninguém te diz se está indo bem ou mal. Informação sem diagnóstico não serve.",
  },
  {
    Icone: Target,
    titulo: "Metas que ficam no papel",
    descricao: "Todo começo de ano você promete guardar dinheiro. Sem um plano concreto e acompanhamento real, a promessa não vira realidade.",
  },
]

export default function Problem() {
  return (
    <section
      id="recursos"
      style={{
        backgroundColor: "#FFFFFF",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: 560, marginBottom: 64 }}
        >
          <span style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            color: "#8257E5",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
            background: "rgba(130,87,229,0.08)",
            padding: "4px 12px",
            borderRadius: 20,
          }}>
            O problema
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 3.2vw, 40px)",
            fontWeight: 400,
            color: "#09090B",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            Você perde o controle e não sabe por quê
          </h2>
          <p style={{ fontSize: 16, color: "#71717A", lineHeight: 1.65 }}>
            Não é falta de disciplina. É falta de um sistema que funcione de verdade.
          </p>
        </motion.div>

        <div
          style={{ display: "grid", gap: 20 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {problemas.map((p, i) => {
            const { Icone } = p
            return (
              <motion.div
                key={p.titulo}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ scale: 1.02, y: -4 }}
                style={{
                  padding: "32px",
                  border: "1px solid #F4F4F5",
                  borderRadius: 12,
                  backgroundColor: "#FAFAFA",
                  cursor: "default",
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: "rgba(239,68,68,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}>
                  <Icone size={20} color="#EF4444" strokeWidth={1.5} />
                </div>
                <h3 style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#09090B",
                  marginBottom: 10,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.3,
                }}>
                  {p.titulo}
                </h3>
                <p style={{ fontSize: 14, color: "#71717A", lineHeight: 1.65 }}>
                  {p.descricao}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
