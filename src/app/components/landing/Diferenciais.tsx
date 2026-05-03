// Ícones SVG monocromáticos simples
function IconScore() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="#1A1A1A" strokeWidth="1.5" />
      <path d="M7 10l2 2 4-4" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconIA() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="14" height="10" rx="2" stroke="#1A1A1A" strokeWidth="1.5" />
      <path d="M7 4v2M13 4v2" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 11h6" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconMissao() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v14M3 10h14" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconFamilia() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="3" stroke="#1A1A1A" strokeWidth="1.5" />
      <circle cx="14" cy="7" r="2.5" stroke="#1A1A1A" strokeWidth="1.5" />
      <path d="M2 16c0-3 2.2-5 5-5s5 2 5 5" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 12c1.5 0 4 1.2 4 4" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconLGPD() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="5" y="9" width="10" height="8" rx="2" stroke="#1A1A1A" strokeWidth="1.5" />
      <path d="M7 9V7a3 3 0 016 0v2" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconPWA() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="12" height="14" rx="2" stroke="#1A1A1A" strokeWidth="1.5" />
      <circle cx="10" cy="14" r="1" fill="#1A1A1A" />
    </svg>
  )
}

const diferenciais = [
  {
    Icone: IconScore,
    titulo: "Score de Saúde Financeira",
    texto: "Um número de 0 a 1000 que resume sua vida financeira. Acompanhe sua evolução mês a mês. Nenhum outro app do Brasil oferece isso.",
  },
  {
    Icone: IconIA,
    titulo: "Relatório com inteligência artificial",
    texto: "Todo mês, a IA analisa seus gastos e escreve um relatório personalizado em português. Com recomendações práticas, não genéricas.",
  },
  {
    Icone: IconMissao,
    titulo: "Modo Missão",
    texto: "Transforme metas em missões com prazo e valor. O app calcula automaticamente quanto você precisa guardar por mês e acompanha cada centavo.",
  },
  {
    Icone: IconFamilia,
    titulo: "Plano Família",
    texto: "Uma assinatura, até 4 perfis. Cada membro tem seus dados privados. O administrador vê a visão consolidada da família inteira.",
  },
  {
    Icone: IconLGPD,
    titulo: "Seus dados são seus",
    texto: "Conformidade total com a LGPD. Exporte, corrija ou delete seus dados quando quiser. Transparência total sobre o que coletamos e por quê.",
  },
  {
    Icone: IconPWA,
    titulo: "Funciona em qualquer dispositivo",
    texto: "Celular, tablet ou computador. Sem precisar instalar nada. Progressive Web App que funciona como um app nativo direto do navegador.",
  },
]

export default function Diferenciais() {
  return (
    <section
      id="diferenciais"
      style={{
        backgroundColor: "var(--of-surface)",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ maxWidth: 520, marginBottom: 64 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--of-text-secondary)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Diferenciais
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 3.2vw, 40px)",
            fontWeight: 400,
            color: "var(--of-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            O que só o Openfy oferece
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {diferenciais.map((item) => {
            const { Icone } = item
            return (
              <div
                key={item.titulo}
                style={{
                  padding: "28px 28px",
                  border: "1px solid var(--of-border)",
                  borderRadius: 8,
                  backgroundColor: "var(--of-surface)",
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <Icone />
                </div>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--of-text)",
                  letterSpacing: "-0.01em",
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}>
                  {item.titulo}
                </h3>
                <p style={{
                  fontSize: 14,
                  color: "var(--of-text-secondary)",
                  lineHeight: 1.65,
                }}>
                  {item.texto}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
