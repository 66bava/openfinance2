import { useSearchParams, Link } from "react-router"
import { CheckCircle, MessageCircle, ArrowLeft } from "lucide-react"

const WHATSAPP_PROOF_TEXT = "Olá! Acabei de fazer o pagamento do plano Pro do Finance App. Segue o comprovante:"

export default function Obrigado() {
  const [params] = useSearchParams()
  const plano = params.get("plano") ?? "pro"
  const isPro = plano === "pro"

  const whatsappLink = `https://wa.me/5511999999999?text=${encodeURIComponent(WHATSAPP_PROOF_TEXT)}`

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F5F5F5",
        padding: "16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          padding: "40px 32px",
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        {/* Ícone de sucesso */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#F0FDF4",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={36} style={{ color: "#16A34A" }} />
          </div>
        </div>

        <h1
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: 800,
            color: "#09090B",
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          {isPro ? "Obrigado pelo interesse!" : "Recebemos seu pedido!"}
        </h1>

        <p style={{ fontSize: 15, color: "#71717A", lineHeight: 1.6, marginBottom: 28 }}>
          {isPro
            ? "Para ativar seu plano Pro, envie o comprovante de pagamento pelo WhatsApp. Faremos a ativação em até 24 horas."
            : "Recebemos seu pedido. Entraremos em contato em breve."}
        </p>

        {/* Passos */}
        <div
          style={{
            background: "#F9FAFB",
            borderRadius: 14,
            padding: "20px 24px",
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
            Próximos passos
          </p>
          {[
            { num: "1", text: "Realize o pagamento de R$ 19,90/mês" },
            { num: "2", text: "Envie o comprovante pelo WhatsApp abaixo" },
            { num: "3", text: "Ativação do plano Pro em até 24 horas" },
          ].map(({ num, text }) => (
            <div key={num} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#16A34A",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {num}
              </div>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Botão WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "15px 0",
            background: "#25D366",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            color: "#FFFFFF",
            textDecoration: "none",
            marginBottom: 12,
            width: "100%",
            transition: "background 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#1ebe5d")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#25D366")}
        >
          <MessageCircle size={18} />
          Enviar comprovante pelo WhatsApp
        </a>

        <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 24 }}>
          Ou envie para{" "}
          <a href="mailto:suporte@financeapp.com.br" style={{ color: "#16A34A", fontWeight: 600 }}>
            suporte@financeapp.com.br
          </a>
        </p>

        {/* Voltar */}
        <Link
          to="/app/perfil"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "#6B7280",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} />
          Voltar ao perfil
        </Link>
      </div>
    </div>
  )
}
