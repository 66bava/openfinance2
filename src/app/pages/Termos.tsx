import { Link } from "react-router"

export default function Termos() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", backgroundColor: "#FFFFFF" }}>
      <nav style={{ borderBottom: "1px solid #F0F0F0", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ fontSize: 16, fontWeight: 700, color: "#111111", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Openfy
        </Link>
        <Link to="/" style={{ fontSize: 14, color: "#666666", textDecoration: "none" }}>← Voltar</Link>
      </nav>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111111", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Termos de Uso
        </h1>
        <p style={{ fontSize: 14, color: "#AAAAAA", marginBottom: 48 }}>Última atualização: abril de 2025</p>

        {[
          {
            title: "1. Aceitação dos termos",
            text: "Ao utilizar o Openfy, você concorda com estes termos. Caso não concorde, não utilize o serviço.",
          },
          {
            title: "2. Descrição do serviço",
            text: "O Openfy é uma ferramenta de gestão financeira pessoal que permite registrar transações, acompanhar metas e visualizar o Score de Saúde Financeira. O serviço é fornecido 'como está'.",
          },
          {
            title: "3. Contas e responsabilidades",
            text: "Você é responsável por manter a segurança de sua conta e senha. Não compartilhe suas credenciais. O Openfy não pode ser responsabilizado por acessos não autorizados decorrentes de negligência do usuário.",
          },
          {
            title: "4. Planos e pagamentos",
            text: "O plano Free é gratuito. Os planos Pro e Família são cobrados mensalmente. Cancelamentos podem ser feitos a qualquer momento, sem multa, com acesso garantido até o fim do período pago.",
          },
          {
            title: "5. Limitação de responsabilidade",
            text: "O Openfy não se responsabiliza por decisões financeiras tomadas com base nas informações exibidas no aplicativo. As informações são apenas orientativas.",
          },
          {
            title: "6. Modificações",
            text: "Podemos atualizar estes termos periodicamente. Você será notificado por e-mail em caso de alterações relevantes.",
          },
          {
            title: "7. Contato",
            text: "Dúvidas sobre os termos: suporte@openfy.app",
          },
        ].map((section) => (
          <section key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111111", marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: "#555555", lineHeight: 1.7 }}>{section.text}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
