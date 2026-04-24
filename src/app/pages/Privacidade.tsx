import { Link } from "react-router"

export default function Privacidade() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", backgroundColor: "#FFFFFF" }}>
      <nav style={{ borderBottom: "1px solid #F0F0F0", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ fontSize: 16, fontWeight: 700, color: "#111111", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Open Finance
        </Link>
        <Link to="/" style={{ fontSize: 14, color: "#666666", textDecoration: "none" }}>← Voltar</Link>
      </nav>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111111", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Política de Privacidade
        </h1>
        <p style={{ fontSize: 14, color: "#AAAAAA", marginBottom: 48 }}>Última atualização: abril de 2025</p>

        {[
          {
            title: "1. Coleta de dados",
            text: "O Open Finance coleta apenas os dados necessários para o funcionamento do serviço: endereço de e-mail, dados financeiros que você registra manualmente e informações de perfil que você fornece voluntariamente.",
          },
          {
            title: "2. Uso dos dados",
            text: "Seus dados são utilizados exclusivamente para fornecer e melhorar o serviço. Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins comerciais.",
          },
          {
            title: "3. Segurança",
            text: "Utilizamos Supabase com criptografia em repouso e em trânsito. O acesso aos dados é restrito por políticas de segurança em nível de linha (Row Level Security). Apenas você tem acesso aos seus dados.",
          },
          {
            title: "4. Cookies",
            text: "Utilizamos cookies essenciais para manter sua sessão ativa. Não utilizamos cookies de rastreamento ou publicidade.",
          },
          {
            title: "5. Seus direitos",
            text: "Você pode solicitar a exportação ou exclusão completa dos seus dados a qualquer momento. Envie um e-mail para suporte@openfinance.app.",
          },
          {
            title: "6. Contato",
            text: "Para dúvidas sobre privacidade, entre em contato: suporte@openfinance.app",
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
