const depoimentos = [
  {
    texto: "Pela primeira vez eu entendo para onde meu dinheiro vai. O Score me deu um choque de realidade que eu precisava.",
    nome: "Ana Paula",
    info: "28 anos",
    inicial: "A",
  },
  {
    texto: "Já testei vários apps de finanças. O Openfy é o primeiro que me fez continuar usando depois da primeira semana.",
    nome: "Carlos",
    info: "34 anos",
    inicial: "C",
  },
  {
    texto: "Uso com meu marido no plano família. Finalmente conseguimos planejar juntos sem brigar por causa de dinheiro.",
    nome: "Mariana",
    info: "31 anos",
    inicial: "M",
  },
]

export default function Depoimentos() {
  return (
    <section
      style={{
        backgroundColor: "var(--of-page-bg)",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--of-text-secondary)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Depoimentos
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 3.2vw, 40px)",
            fontWeight: 400,
            color: "var(--of-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            Quem já usa, aprova
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {depoimentos.map((d) => (
            <div
              key={d.nome}
              style={{
                backgroundColor: "var(--of-surface)",
                border: "1px solid var(--of-border)",
                borderRadius: 8,
                padding: "32px 28px",
              }}
            >
              {/* Aspas tipográficas decorativas */}
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: 64,
                lineHeight: 0.6,
                color: "#E5E5E3",
                marginBottom: 20,
                userSelect: "none",
              }} aria-hidden="true">
                "
              </p>

              <p style={{
                fontSize: 16,
                color: "var(--of-text)",
                lineHeight: 1.65,
                fontStyle: "italic",
                marginBottom: 28,
              }}>
                {d.texto}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "var(--of-btn-bg)",
                  color: "var(--of-btn-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {d.inicial}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--of-text)" }}>{d.nome}</p>
                  <p style={{ fontSize: 12, color: "var(--of-text-secondary)" }}>{d.info}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
