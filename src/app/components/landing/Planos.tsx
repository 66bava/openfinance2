import { Link } from "react-router"
import WaitlistForm from "./WaitlistForm"

type Feature = { texto: string }

function ListaFeatures({ features }: { features: Feature[] }) {
  return (
    <div style={{ borderTop: "1px solid #E5E5E3", paddingTop: 24, marginBottom: 28 }}>
      {features.map((f) => (
        <p
          key={f.texto}
          style={{
            fontSize: 14,
            color: "#6B6B6B",
            lineHeight: 1.6,
            marginBottom: 8,
            paddingLeft: 14,
            position: "relative",
          }}
        >
          <span style={{
            position: "absolute",
            left: 0,
            top: "0.15em",
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: "#1A1A1A",
            opacity: 0.3,
            display: "inline-block",
          }} />
          {f.texto}
        </p>
      ))}
    </div>
  )
}

export default function Planos() {
  return (
    <section
      id="planos"
      style={{
        backgroundColor: "#FFFFFF",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#6B6B6B",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Preços
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 3.2vw, 40px)",
            fontWeight: 400,
            color: "#1A1A1A",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            Escolha seu plano
          </h2>
          <p style={{ fontSize: 16, color: "#6B6B6B" }}>
            Comece grátis. Evolua quando fizer sentido.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6" style={{ alignItems: "start" }}>
          {/* Plano Grátis */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E5E3",
            borderRadius: 8,
            padding: "32px 28px",
          }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6B6B6B",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              Grátis
            </p>
            <p style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#1A1A1A",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}>
              R$ 0
            </p>
            <p style={{ fontSize: 14, color: "#6B6B6B", marginBottom: 28 }}>
              Para quem quer começar a organizar
            </p>
            <ListaFeatures features={[
              { texto: "Até 30 transações por mês" },
              { texto: "3 categorias personalizadas" },
              { texto: "Histórico de 3 meses" },
              { texto: "Score de Saúde básico" },
            ]} />
            <Link
              to="/login"
              style={{
                display: "flex",
                textAlign: "center",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "#1A1A1A",
                border: "1.5px solid #E5E5E3",
                borderRadius: 6,
                textDecoration: "none",
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "#1A1A1A")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "#E5E5E3")}
            >
              Começar agora
            </Link>
          </div>

          {/* Plano Pro — destaque */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "2px solid #1A1A1A",
            borderRadius: 8,
            padding: "32px 28px",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: -13,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#1A1A1A",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 14px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              letterSpacing: "0.08em",
            }}>
              MAIS ESCOLHIDO
            </div>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#1A1A1A",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              Pro
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <p style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#1A1A1A",
                letterSpacing: "-0.03em",
              }}>
                R$ 19,90
              </p>
            </div>
            <p style={{ fontSize: 14, color: "#6B6B6B", marginBottom: 28 }}>
              /mês · Para quem leva dinheiro a sério
            </p>
            <ListaFeatures features={[
              { texto: "Transações ilimitadas" },
              { texto: "Categorias ilimitadas" },
              { texto: "Histórico completo" },
              { texto: "Score + relatório de IA mensal" },
              { texto: "Exportação PDF e Excel" },
              { texto: "Suporte prioritário" },
            ]} />
            <Link
              to="/login"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#FFFFFF",
                backgroundColor: "#1A1A1A",
                borderRadius: 6,
                textDecoration: "none",
                minHeight: 44,
                transition: "background-color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#333333")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1A1A1A")}
            >
              Assinar Pro
            </Link>
          </div>

          {/* Plano Família */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E5E3",
            borderRadius: 8,
            padding: "32px 28px",
          }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6B6B6B",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              Família
            </p>
            <p style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#1A1A1A",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}>
              R$ 34,90
            </p>
            <p style={{ fontSize: 14, color: "#6B6B6B", marginBottom: 28 }}>
              /mês · Para quem cuida de quem ama
            </p>
            <ListaFeatures features={[
              { texto: "Tudo do Pro para até 4 pessoas" },
              { texto: "Perfis individuais com dados privados" },
              { texto: "Dashboard consolidado da família" },
              { texto: "Metas compartilhadas" },
            ]} />
            <Link
              to="/login"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "#1A1A1A",
                border: "1.5px solid #E5E5E3",
                borderRadius: 6,
                textDecoration: "none",
                minHeight: 44,
                transition: "border-color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "#1A1A1A")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "#E5E5E3")}
            >
              Assinar Família
            </Link>
          </div>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: 13,
          color: "#6B6B6B",
          marginTop: 32,
        }}>
          Cancele quando quiser. Sem multa. Sem burocracia.
        </p>

        {/* Waitlist abaixo dos planos */}
        <div
          style={{
            marginTop: 56,
            padding: "28px 32px",
            backgroundColor: "#F7F7F5",
            borderRadius: 8,
            border: "1px solid #E5E5E3",
          }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>
              Ainda não tem certeza?
            </p>
            <p style={{ fontSize: 13, color: "#6B6B6B" }}>
              Entre na lista de espera e seja avisado sobre novidades.
            </p>
          </div>
          <div style={{ flexShrink: 0, width: "100%", maxWidth: 420 }}>
            <WaitlistForm fonte="planos" />
          </div>
        </div>
      </div>
    </section>
  )
}
