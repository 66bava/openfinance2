const passos = [
  {
    num: "01",
    titulo: "Registre",
    descricao: "Cada gasto ou receita que você tem, registra aqui. Toma 10 segundos. Categorias automáticas fazem o trabalho pesado.",
  },
  {
    num: "02",
    titulo: "Entenda",
    descricao: "Openfy calcula seu Score de Saúde Financeira automaticamente. De 0 a 1000. Você vê em tempo real se está melhorando ou piorando.",
  },
  {
    num: "03",
    titulo: "Conquiste",
    descricao: "Defina metas concretas. Viagem, reserva de emergência, carro novo. O app calcula quanto guardar por mês e acompanha seu progresso.",
  },
]

export default function Solucao() {
  return (
    <section
      id="como-funciona"
      style={{
        backgroundColor: "#F7F7F5",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 72px" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#6B6B6B",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Como funciona
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 3.2vw, 40px)",
            fontWeight: 400,
            color: "#1A1A1A",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            Como o Openfy funciona
          </h2>
          <p style={{ fontSize: 16, color: "#6B6B6B", lineHeight: 1.65 }}>
            Três passos. Cinco minutos por dia. Resultado real no fim do mês.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {passos.map((passo, i) => (
            <div key={passo.num} style={{ position: "relative" }}>
              {/* Linha conectora entre passos (desktop) */}
              {i < passos.length - 1 && (
                <div
                  className="hidden md:block"
                  style={{
                    position: "absolute",
                    top: 28,
                    right: -48,
                    width: 96,
                    height: 1,
                    backgroundColor: "#E5E5E3",
                    zIndex: 0,
                  }}
                />
              )}

              <p style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#E5E5E3",
                lineHeight: 1,
                marginBottom: 20,
                letterSpacing: "-0.04em",
                fontFamily: "var(--font-body)",
              }}>
                {passo.num}
              </p>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#1A1A1A",
                letterSpacing: "-0.01em",
                marginBottom: 12,
              }}>
                {passo.titulo}
              </h3>
              <p style={{
                fontSize: 15,
                color: "#6B6B6B",
                lineHeight: 1.65,
              }}>
                {passo.descricao}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
