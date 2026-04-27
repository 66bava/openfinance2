import { motion } from "motion/react"

const timeline = [
  { data: "Set 2024", evento: "Ideia nasce" },
  { data: "Nov 2024", evento: "Primeiro commit" },
  { data: "Jan 2025", evento: "Score de Saúde v1" },
  { data: "Mar 2025", evento: "Relatórios com IA" },
  { data: "Abr 2025", evento: "Beta fechado" },
  { data: "2026", evento: "Escalando" },
]

function OpenfyIcon() {
  return (
    <div style={{
      width: 48,
      height: 48,
      background: "#16A34A",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
        <rect x="0" y="8" width="4" height="6" rx="1" fill="white" />
        <rect x="5" y="4" width="4" height="10" rx="1" fill="white" />
        <rect x="10" y="0" width="4" height="14" rx="1" fill="white" />
      </svg>
    </div>
  )
}

export default function Founder() {
  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{ display: "grid", gap: 80, alignItems: "start" }}
          className="grid grid-cols-1 md:grid-cols-2"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
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
              A origem
            </span>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 3vw, 40px)",
              fontWeight: 700,
              color: "#0A0A0A",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              marginBottom: 32,
            }}>
              Construído por quem
              <br />
              entende o problema.
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 16, color: "#525252", lineHeight: 1.75 }}>
                O Openfy foi criado por dois jovens de 16 anos que perceberam algo simples:
              </p>

              <div style={{
                background: "#FAFAFA",
                border: "1px solid #E5E5E3",
                borderLeft: "3px solid #0A0A0A",
                borderRadius: "0 12px 12px 0",
                padding: "20px 24px",
              }}>
                <p style={{ fontSize: 15, color: "#525252", lineHeight: 1.7, margin: 0 }}>
                  Apps de banco mostram extratos.
                  <br />
                  Apps de finanças organizam gastos.
                  <br />
                  <strong style={{ color: "#0A0A0A" }}>Mas nenhum responde a pergunta mais importante:</strong>
                </p>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#0A0A0A",
                  marginTop: 12,
                  marginBottom: 0,
                  letterSpacing: "-0.02em",
                }}>
                  "Minha vida financeira está saudável?"
                </p>
              </div>

              <p style={{ fontSize: 16, color: "#525252", lineHeight: 1.75 }}>
                Então eles passaram meses construindo o Openfy do zero.
                Sem investimento. Sem equipe. Só código e obsessão por resolver isso direito.
              </p>

              <p style={{ fontSize: 16, color: "#525252", lineHeight: 1.75 }}>
                O resultado é um produto funcional com arquitetura moderna, IA real e uma métrica que nenhum outro app brasileiro tem.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div style={{
              background: "#FAFAFA",
              border: "1px solid #E5E5E3",
              borderRadius: 20,
              padding: "36px 32px",
              marginBottom: 24,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <OpenfyIcon />
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", marginBottom: 2 }}>
                    Openfy
                  </p>
                  <p style={{ fontSize: 13, color: "#A3A3A3" }}>
                    Desenvolvido em 2024–2025
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {timeline.map((item, i) => (
                  <div
                    key={item.data}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      paddingBottom: i < timeline.length - 1 ? 20 : 0,
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: i === timeline.length - 1 ? "#16A34A" : "#0A0A0A",
                        border: i === timeline.length - 1 ? "none" : "2px solid #0A0A0A",
                        flexShrink: 0,
                        marginTop: 3,
                      }} />
                      {i < timeline.length - 1 && (
                        <div style={{
                          width: 1,
                          flex: 1,
                          background: "#E5E5E3",
                          marginTop: 4,
                          minHeight: 28,
                        }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 0 }}>
                      <span style={{ fontSize: 12, color: "#A3A3A3", fontWeight: 500 }}>
                        {item.data}
                      </span>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: i === timeline.length - 1 ? "#16A34A" : "#0A0A0A",
                        margin: 0,
                        lineHeight: 1.4,
                      }}>
                        {item.evento}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: "#0A0A0A",
              borderRadius: 16,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>🇧🇷</span>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                Feito no Brasil. Para brasileiros que querem
                {" "}<strong style={{ color: "#FFFFFF" }}>entender sua vida financeira de verdade.</strong>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
