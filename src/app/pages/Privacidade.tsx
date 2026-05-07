import { Link } from "react-router"

const SECTIONS = [
  {
    title: "1. Identidade do Controlador",
    text: "O controlador dos seus dados pessoais é a Openfy, com e-mail de contato suporte@openfy.app. Você pode exercer seus direitos de titular a qualquer momento pelo mesmo endereço.",
  },
  {
    title: "2. Dados coletados e finalidade",
    text: "Coletamos: (a) dados de identificação — nome e e-mail, para criação e manutenção de conta; (b) dados financeiros — transações, metas e renda mensal que você registra voluntariamente, para prestação do serviço; (c) dados de uso — logs de acesso, exportação e alterações, para segurança e conformidade legal. Não coletamos dados sensíveis conforme definido no art. 5º, II da LGPD.",
  },
  {
    title: "3. Base legal do tratamento",
    text: "Tratamos seus dados com base no seu consentimento (art. 7º, I da LGPD), registrado no momento do cadastro e identificado pela versão da política aceita. Você pode revogar o consentimento a qualquer momento, excluindo sua conta.",
  },
  {
    title: "4. Segurança e armazenamento",
    text: "Seus dados são armazenados no Supabase com criptografia em repouso (AES-256) e em trânsito (TLS 1.2+). O acesso é controlado por Row Level Security — apenas você tem acesso aos seus dados. Registros de auditoria são mantidos por 12 meses.",
  },
  {
    title: "5. Cookies",
    text: "Usamos apenas cookies essenciais para manter sua sessão autenticada. Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de terceiros. Você pode gerenciar sua preferência no banner de cookies exibido no primeiro acesso.",
  },
  {
    title: "6. Compartilhamento de dados",
    text: "Não vendemos, alugamos nem compartilhamos seus dados pessoais com terceiros para fins comerciais. Dados podem ser compartilhados apenas com prestadores de serviço essenciais (infraestrutura de nuvem) sob acordos de confidencialidade compatíveis com a LGPD.",
  },
  {
    title: "7. Seus direitos (art. 18 da LGPD)",
    text: "Você tem direito a: confirmação de tratamento, acesso aos dados, correção, anonimização/bloqueio/eliminação, portabilidade, revogação do consentimento, e oposição ao tratamento. Acesse a aba Privacidade no seu perfil para exportar ou excluir seus dados. Para demais solicitações: suporte@openfy.app.",
  },
  {
    title: "8. Retenção e exclusão",
    text: "Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir a conta, todos os dados pessoais são eliminados permanentemente em até 30 dias, salvo obrigação legal de retenção.",
  },
  {
    title: "9. Contato com o Encarregado (DPO)",
    text: "Para exercer seus direitos ou sanar dúvidas sobre privacidade: suporte@openfy.app. Você também pode reportar irregularidades à Autoridade Nacional de Proteção de Dados (ANPD) pelo site gov.br/anpd.",
  },
  {
    title: "10. Atualizações desta política",
    text: "Esta política pode ser atualizada periodicamente. A versão em vigor é identificada pela data abaixo. Alterações relevantes serão comunicadas por e-mail. Continuar usando o serviço após a notificação implica aceitação da nova versão.",
  },
]

export default function Privacidade() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", backgroundColor: "#FFFFFF" }}>
      <nav style={{ borderBottom: "1px solid #F0F0F0", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ fontSize: 16, fontWeight: 700, color: "#111111", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Openfy
        </Link>
        <Link to="/" style={{ fontSize: 14, color: "#666666", textDecoration: "none" }}>← Voltar</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#16A34A", textTransform: "uppercase" }}>
            LGPD — Lei nº 13.709/2018
          </span>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111111", letterSpacing: "-0.02em", marginTop: 8, marginBottom: 8 }}>
            Política de Privacidade
          </h1>
          <p style={{ fontSize: 14, color: "#AAAAAA" }}>Última atualização: abril de 2025 · Versão 1.0</p>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111111", marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: "#555555", lineHeight: 1.7 }}>{section.text}</p>
          </section>
        ))}

        <div style={{
          marginTop: 48, padding: "20px 24px",
          background: "#F5F5F0", borderRadius: 12,
          borderLeft: "4px solid #16A34A",
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111111", marginBottom: 6 }}>
            Exercer seus direitos
          </p>
          <p style={{ fontSize: 13, color: "#555555", lineHeight: 1.6 }}>
            Acesse <Link to="/app/perfil" style={{ color: "#16A34A", fontWeight: 600 }}>Perfil → Privacidade</Link> para exportar ou excluir sua conta diretamente no aplicativo. Para demais solicitações: suporte@openfy.app
          </p>
        </div>
      </div>
    </div>
  )
}
