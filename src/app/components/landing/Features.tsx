import { motion } from "motion/react"
import { Sparkles, Target, Users, Check } from "lucide-react"

function ScoreGauge({ score = 782 }: { score?: number }) {
  const pct = score / 1000
  const angle = pct * 180
  const rad = (angle * Math.PI) / 180
  const cx = 100, cy = 90, r = 70
  const x = cx + r * Math.cos(Math.PI - rad)
  const y = cy - r * Math.sin(Math.PI - rad)
  const largeArc = angle > 180 ? 1 : 0

  return (
    <svg viewBox="0 0 200 110" width="200" height="110" aria-label={`Score ${score}`}>
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`}
        fill="none" stroke="#16A34A" strokeWidth="10" strokeLinecap="round"
      />
      {/* Score */}
      <text x={cx} y={cy - 10} textAnchor="middle"
        style={{ fontSize: 32, fontWeight: "800", fill: "white", fontFamily: "system-ui", letterSpacing: "-1" }}>
        {score}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle"
        style={{ fontSize: 9, fill: "rgba(255,255,255,0.45)", fontFamily: "system-ui" }}>
        de 1000
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle"
        style={{ fontSize: 9, fill: "#16A34A", fontFamily: "system-ui", fontWeight: "600" }}>
        Ótimo
      </text>
    </svg>
  )
}

export default function Features() {
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
            Recursos
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
          }}>
            Quatro diferenciais que nenhum<br className="hidden md:block" /> concorrente tem
          </h2>
        </motion.div>

        <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 md:grid-cols-2">

          {/* Card Score — destaque full width */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              gridColumn: "1 / -1",
              background: "#0A0A0A",
              borderRadius: 20,
              padding: "48px 48px",
              display: "grid",
              gap: 48,
              alignItems: "center",
            }}
            className="grid grid-cols-1 md:grid-cols-2"
          >
            <div>
              <div style={{
                width: 44,
                height: 44,
                background: "rgba(22,163,74,0.12)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 15 L7 8 L11 11 L15 4 L19 6" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(22px, 2.5vw, 30px)",
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 16,
                letterSpacing: "-0.02em",
              }}>
                Score de Saúde Financeira
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 24, lineHeight: 1.65 }}>
                Algoritmo exclusivo que analisa 7 pilares e te dá uma nota de 0 a 1000. Acompanhe sua evolução mês a mês.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Reserva de emergência", "Taxa de poupança", "Endividamento", "+ 4 pilares financeiros"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Check size={16} color="#16A34A" />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ScoreGauge score={782} />
            </div>
          </motion.div>

          {/* Card IA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E5E3",
              borderRadius: 20,
              padding: 40,
              transition: "box-shadow 0.2s",
            }}
            whileHover={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
          >
            <div style={{
              width: 44,
              height: 44,
              background: "#DCFCE7",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <Sparkles size={20} color="#16A34A" />
            </div>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "#0A0A0A",
              marginBottom: 12,
              letterSpacing: "-0.02em",
            }}>
              Relatório mensal com IA
            </h3>
            <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.65 }}>
              Claude Sonnet analisa seus gastos e entrega insights personalizados todo mês. Análise real, não genérica.
            </p>
          </motion.div>

          {/* Card Modo Missão */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E5E3",
              borderRadius: 20,
              padding: 40,
              transition: "box-shadow 0.2s",
            }}
            whileHover={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
          >
            <div style={{
              width: 44,
              height: 44,
              background: "#DCFCE7",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <Target size={20} color="#16A34A" />
            </div>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "#0A0A0A",
              marginBottom: 12,
              letterSpacing: "-0.02em",
            }}>
              Modo Missão
            </h3>
            <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.65 }}>
              Metas viram desafios gamificados. Economizar deixa de ser obrigação e vira conquista com pontos e recompensas.
            </p>
          </motion.div>

          {/* Card Família — full width */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              gridColumn: "1 / -1",
              background: "#F5F5F0",
              borderRadius: 20,
              padding: "48px 48px",
              display: "grid",
              gap: 48,
              alignItems: "center",
            }}
            className="grid grid-cols-1 md:grid-cols-2"
          >
            <div>
              <div style={{
                width: 44,
                height: 44,
                background: "#E5E5E3",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}>
                <Users size={20} color="#0A0A0A" />
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(22px, 2.5vw, 30px)",
                fontWeight: 700,
                color: "#0A0A0A",
                marginBottom: 16,
                letterSpacing: "-0.02em",
              }}>
                Plano Família — 4 perfis, 1 assinatura
              </h3>
              <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.65 }}>
                Cada membro tem seu próprio painel com dados independentes. Ideal para ensinar educação financeira em casa.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { nome: "Pai", score: 810 },
                { nome: "Mãe", score: 750 },
                { nome: "Filho", score: 680 },
                { nome: "Filha", score: 720 },
              ].map((p) => (
                <div
                  key={p.nome}
                  style={{
                    background: "#FFFFFF",
                    padding: "16px",
                    borderRadius: 12,
                    border: "1px solid #E5E5E3",
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#DCFCE7",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>
                      {p.nome[0]}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 13, color: "#0A0A0A", marginBottom: 2 }}>{p.nome}</p>
                  <p style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>Score {p.score}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
