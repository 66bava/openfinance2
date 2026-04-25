import { Link } from "react-router"
import WaitlistForm from "./WaitlistForm"

export default function CTAFinal() {
  return (
    <section
      style={{
        backgroundColor: "#0A0A0A",
        padding: "112px 24px",
        textAlign: "center",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 4vw, 48px)",
          fontWeight: 400,
          color: "#FFFFFF",
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          marginBottom: 20,
        }}>
          Comece a entender seu dinheiro.
        </h2>

        <p style={{
          fontSize: 16,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 48,
          lineHeight: 1.6,
        }}>
          Crie sua conta em 30 segundos. Grátis. Sem cartão.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              color: "#0A0A0A",
              fontSize: 15,
              fontWeight: 700,
              padding: "14px 32px",
              borderRadius: 6,
              textDecoration: "none",
              minHeight: 44,
              transition: "background-color 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#F0F0F0")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
          >
            Criar conta grátis
          </Link>
          <a
            href="mailto:suporte@openfy.app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.7)",
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 32px",
              borderRadius: 6,
              textDecoration: "none",
              border: "1.5px solid rgba(255,255,255,0.2)",
              minHeight: 44,
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"
              e.currentTarget.style.color = "#FFFFFF"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
              e.currentTarget.style.color = "rgba(255,255,255,0.7)"
            }}
          >
            Falar com a equipe
          </a>
        </div>

        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 36,
        }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Ou entre na lista de espera
          </p>
          <WaitlistForm variant="dark" showCounter fonte="cta-final" />
        </div>
      </div>
    </section>
  )
}
