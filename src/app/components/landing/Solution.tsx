import { motion } from "motion/react"
import { Brain, Zap } from "lucide-react"

function ScoreVisual() {
  const angulo = (820 / 1000) * 180
  const rad = (angulo * Math.PI) / 180
  const cx = 100
  const cy = 80
  const r = 60
  const x = cx + r * Math.cos(Math.PI - rad)
  const y = cy - r * Math.sin(Math.PI - rad)

  return (
    <svg viewBox="0 0 200 100" width="200" height="100" aria-hidden="true">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#F4F4F5"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`}
        fill="none"
        stroke="#8257E5"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Ponteiro */}
      <circle cx={x} cy={y} r="6" fill="#FFFFFF" stroke="#8257E5" strokeWidth="3" />
      {/* Número */}
      <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 28, fontWeight: "800", fill: "#09090B", fontFamily: "system-ui" }}>820</text>
      <text x={cx} y={cy + 6} textAnchor="middle" style={{ fontSize: 9, fill: "#71717A", fontFamily: "system-ui" }}>de 1000 pontos</text>
      <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontSize: 9, fontWeight: "600", fill: "#22C55E", fontFamily: "system-ui" }}>Excelente ↑ +12 pts</text>
    </svg>
  )
}

export default function Solution() {
  return (
    <section
      id="como-funciona"
      style={{
        backgroundColor: "#FAFAFA",
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
          style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 64px" }}
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
            A resposta
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
            Score + IA + Gamificação
          </h2>
          <p style={{ fontSize: 16, color: "#71717A", lineHeight: 1.65 }}>
            Três pilares que trabalham juntos para você entender, melhorar e conquistar seus objetivos financeiros.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div
          style={{ display: "grid", gap: 16 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Card grande — Score */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              backgroundColor: "#09090B",
              borderRadius: 16,
              padding: "40px",
              color: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 280,
            }}
            className="md:col-span-2 lg:col-span-1"
          >
            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(130,87,229,0.2)",
                border: "1px solid rgba(130,87,229,0.3)",
                borderRadius: 20,
                padding: "5px 12px",
                marginBottom: 24,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8257E5" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#A78BFA", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Exclusivo Openfy
                </span>
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 400,
                color: "#FFFFFF",
                marginBottom: 12,
                lineHeight: 1.2,
              }}>
                Score de Saúde Financeira (0–1000)
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, maxWidth: 380 }}>
                Você já sabe sua nota de crédito. Agora descubra sua saúde financeira real. Um número que resume tudo: gastos, economia, metas e consistência.
              </p>
            </div>
            <div style={{ marginTop: 32 }}>
              <ScoreVisual />
            </div>
          </motion.div>

          {/* Cards menores */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #F4F4F5",
                borderRadius: 16,
                padding: "32px",
                flex: 1,
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(130,87,229,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}>
                <Brain size={20} color="#8257E5" strokeWidth={1.5} />
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#09090B",
                marginBottom: 10,
                letterSpacing: "-0.01em",
              }}>
                Relatório mensal com IA
              </h3>
              <p style={{ fontSize: 14, color: "#71717A", lineHeight: 1.65 }}>
                Claude Anthropic analisa seus gastos e gera um relatório em português com recomendações reais — não genéricas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #F4F4F5",
                borderRadius: 16,
                padding: "32px",
                flex: 1,
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(34,197,94,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}>
                <Zap size={20} color="#22C55E" strokeWidth={1.5} />
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#09090B",
                marginBottom: 10,
                letterSpacing: "-0.01em",
              }}>
                Modo Missão
              </h3>
              <p style={{ fontSize: 14, color: "#71717A", lineHeight: 1.65 }}>
                Metas gamificadas. Economizar vira desafio, não obrigação. Define o objetivo, o app calcula o caminho e acompanha cada passo.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
