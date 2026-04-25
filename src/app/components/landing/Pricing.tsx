import { useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { Check } from "lucide-react"

const planos = [
  {
    nome: "Free",
    preco: "0",
    precoAnual: "0",
    descricao: "Para começar a organizar as finanças",
    features: [
      "30 transações por mês",
      "3 categorias personalizadas",
      "Histórico de 3 meses",
      "Score de Saúde básico",
      "Suporte por email",
    ],
    cta: "Criar conta grátis",
    destaque: false,
  },
  {
    nome: "Pro",
    preco: "19,90",
    precoAnual: "16,58",
    descricao: "Para quem leva finanças a sério",
    features: [
      "Transações ilimitadas",
      "Categorias ilimitadas",
      "Histórico completo",
      "Score completo + evolução",
      "Relatório mensal com IA",
      "Modo Missão (metas)",
      "Exportar PDF e Excel",
      "Suporte prioritário",
    ],
    cta: "Começar trial de 14 dias",
    destaque: true,
    badge: "Mais Popular",
  },
  {
    nome: "Família",
    preco: "34,90",
    precoAnual: "29,08",
    descricao: "Pro para até 4 pessoas",
    features: [
      "Tudo do plano Pro",
      "4 perfis independentes",
      "Dashboard consolidado",
      "Controle parental",
      "Metas familiares compartilhadas",
    ],
    cta: "Começar trial de 14 dias",
    destaque: false,
  },
]

export default function Pricing() {
  const [anual, setAnual] = useState(false)

  return (
    <section
      id="precos"
      style={{
        backgroundColor: "#F5F5F0",
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
          style={{ textAlign: "center", marginBottom: 48 }}
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
            Preços
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.025em",
            marginBottom: 32,
          }}>
            Simples. Transparente. Justo.
          </h2>

          {/* Toggle anual/mensal */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "#FFFFFF",
            border: "1px solid #E5E5E3",
            borderRadius: 40,
            padding: "6px 20px",
          }}>
            <button
              onClick={() => setAnual(false)}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: !anual ? "#0A0A0A" : "#A3A3A3",
                background: !anual ? "#F5F5F0" : "transparent",
                border: "none",
                borderRadius: 30,
                padding: "6px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnual(true)}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: anual ? "#0A0A0A" : "#A3A3A3",
                background: anual ? "#F5F5F0" : "transparent",
                border: "none",
                borderRadius: 30,
                padding: "6px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Anual
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#16A34A",
                background: "#DCFCE7",
                padding: "2px 8px",
                borderRadius: 10,
              }}>
                -2 meses
              </span>
            </button>
          </div>
        </motion.div>

        <div style={{ display: "grid", gap: 20 }} className="grid grid-cols-1 md:grid-cols-3">
          {planos.map((plano, i) => (
            <motion.div
              key={plano.nome}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                background: plano.destaque ? "#0A0A0A" : "#FFFFFF",
                border: plano.destaque ? "2px solid #16A34A" : "1px solid #E5E5E3",
                borderRadius: 20,
                padding: 32,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {plano.badge && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#16A34A",
                  color: "#FFFFFF",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 14px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                }}>
                  {plano.badge}
                </div>
              )}

              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: plano.destaque ? "rgba(255,255,255,0.5)" : "#A3A3A3",
                  marginBottom: 8,
                }}>
                  {plano.nome}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  {plano.preco !== "0" && (
                    <span style={{ fontSize: 15, color: plano.destaque ? "rgba(255,255,255,0.5)" : "#A3A3A3" }}>
                      R$
                    </span>
                  )}
                  <span style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 42,
                    fontWeight: 700,
                    color: plano.destaque ? "#FFFFFF" : "#0A0A0A",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}>
                    {plano.preco === "0" ? "Grátis" : (anual ? plano.precoAnual : plano.preco)}
                  </span>
                  {plano.preco !== "0" && (
                    <span style={{ fontSize: 13, color: plano.destaque ? "rgba(255,255,255,0.4)" : "#A3A3A3" }}>
                      /mês
                    </span>
                  )}
                </div>
                {anual && plano.preco !== "0" && (
                  <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
                    Cobrado anualmente · 2 meses grátis
                  </p>
                )}
                <p style={{ fontSize: 14, color: plano.destaque ? "rgba(255,255,255,0.5)" : "#525252" }}>
                  {plano.descricao}
                </p>
              </div>

              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 32px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
              }}>
                {plano.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Check
                      size={15}
                      color={plano.destaque ? "#16A34A" : "#16A34A"}
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: 14,
                      color: plano.destaque ? "rgba(255,255,255,0.7)" : "#525252",
                      lineHeight: 1.5,
                    }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  padding: "13px",
                  borderRadius: 10,
                  backgroundColor: plano.destaque ? "#16A34A" : "transparent",
                  color: plano.destaque ? "#FFFFFF" : "#0A0A0A",
                  border: plano.destaque ? "none" : "1.5px solid #E5E5E3",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseOver={(e) => {
                  if (plano.destaque) e.currentTarget.style.backgroundColor = "#15803D"
                  else e.currentTarget.style.borderColor = "#0A0A0A"
                }}
                onMouseOut={(e) => {
                  if (plano.destaque) e.currentTarget.style.backgroundColor = "#16A34A"
                  else e.currentTarget.style.borderColor = "#E5E5E3"
                }}
              >
                {plano.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
