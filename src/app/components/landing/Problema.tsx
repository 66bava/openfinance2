const problemas = [
  {
    titulo: "Gastos invisíveis",
    texto: "Assinaturas esquecidas, taxas escondidas, compras por impulso. Sem um sistema, você perde dinheiro todo mês sem perceber.",
  },
  {
    titulo: "Informação sem contexto",
    texto: "Um gráfico de pizza mostrando que você gastou 30% em alimentação não diz nada. Falta o 'e daí?' — falta o diagnóstico.",
  },
  {
    titulo: "Metas que ficam no papel",
    texto: "Todo mundo quer guardar dinheiro. Poucos conseguem. Porque falta um plano concreto com acompanhamento real, não uma promessa de ano novo.",
  },
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
        <div style={{ maxWidth: 560, marginBottom: 64 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#6B6B6B",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            O problema
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 3.2vw, 40px)",
            fontWeight: 400,
            color: "#1A1A1A",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 20,
          }}>
            O problema que ninguém resolve
          </h2>
          <p style={{
            fontSize: 16,
            color: "#6B6B6B",
            lineHeight: 1.65,
          }}>
            Apps financeiros mostram gráficos. Mas nenhum responde a pergunta que importa: você está bem financeiramente?
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problemas.map((p) => (
            <div
              key={p.titulo}
              style={{
                padding: "32px",
                border: "1px solid #E5E5E3",
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
              }}
            >
              <h3 style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#1A1A1A",
                letterSpacing: "-0.01em",
                marginBottom: 14,
                lineHeight: 1.3,
              }}>
                {p.titulo}
              </h3>
              <p style={{
                fontSize: 15,
                color: "#6B6B6B",
                lineHeight: 1.65,
              }}>
                {p.texto}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
