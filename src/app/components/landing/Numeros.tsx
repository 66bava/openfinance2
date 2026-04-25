const metricas = [
  {
    numero: "73%",
    descricao: "dos brasileiros não sabem quanto gastaram no mês passado",
    fonte: "SPC Brasil",
  },
  {
    numero: "R$ 1.400",
    descricao: "é o gasto médio invisível por ano em taxas e assinaturas esquecidas",
    fonte: "Serasa",
  },
  {
    numero: "0 a 1000",
    descricao: "é o range do Score de Saúde Financeira exclusivo do Openfy",
    fonte: "Openfy",
  },
]

export default function Numeros() {
  return (
    <section
      id="numeros"
      style={{
        backgroundColor: "#F7F7F5",
        padding: "56px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0",
          }}
        >
          {metricas.map((metrica, i) => (
            <div
              key={metrica.numero}
              style={{
                padding: "0 40px",
                borderRight: i < metricas.length - 1 ? "1px solid #E5E5E3" : "none",
                textAlign: "center",
              }}
              className={i > 0 ? "border-l-0 md:border-l-0" : ""}
            >
              <p style={{
                fontSize: "clamp(36px, 4vw, 52px)",
                fontWeight: 700,
                color: "#1A1A1A",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                marginBottom: 12,
                fontFamily: "var(--font-body)",
              }}>
                {metrica.numero}
              </p>
              <p style={{
                fontSize: 14,
                color: "#6B6B6B",
                lineHeight: 1.5,
                maxWidth: 200,
                margin: "0 auto",
              }}>
                {metrica.descricao}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
