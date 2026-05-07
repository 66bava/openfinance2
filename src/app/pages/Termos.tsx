import { Link } from "react-router"

const SECTIONS = [
  {
    title: "1. Aceitação dos termos",
    text: "Ao criar uma conta no Openfy você confirma que leu, compreendeu e concorda com estes Termos de Uso. O aceite é registrado eletronicamente no momento do cadastro. Se não concordar, não utilize o serviço.",
  },
  {
    title: "2. Descrição do serviço",
    text: "O Openfy é uma plataforma de gestão financeira pessoal que permite registrar transações, acompanhar metas e visualizar o Score de Saúde Financeira. O serviço é fornecido 'como está', sujeito a melhorias e manutenções.",
  },
  {
    title: "3. Contas e responsabilidades",
    text: "Você é responsável pela segurança de sua conta e senha. Não compartilhe suas credenciais. O Openfy não pode ser responsabilizado por acessos não autorizados decorrentes de negligência do usuário. Notifique-nos imediatamente em caso de uso indevido.",
  },
  {
    title: "4. Planos e pagamentos",
    text: "O plano Free é gratuito. Os planos pagos são cobrados mensalmente. Cancelamentos podem ser feitos a qualquer momento sem multa, com acesso garantido até o fim do período pago. Não há reembolso de períodos parciais.",
  },
  {
    title: "5. Propriedade intelectual",
    text: "Todo o conteúdo, marca, código-fonte e interfaces do Openfy são de propriedade exclusiva da Openfy. Seus dados financeiros permanecem de sua propriedade — você pode exportá-los a qualquer momento.",
  },
  {
    title: "6. Uso aceitável",
    text: "É proibido utilizar o Openfy para fins ilegais, tentar acessar dados de outros usuários, realizar engenharia reversa do software, ou sobrecarregar intencionalmente os servidores. Violações podem resultar no encerramento da conta.",
  },
  {
    title: "7. Limitação de responsabilidade",
    text: "O Openfy não se responsabiliza por decisões financeiras tomadas com base nas informações exibidas. As análises e o Score têm caráter orientativo. O serviço pode ficar indisponível por manutenção, com aviso prévio sempre que possível.",
  },
  {
    title: "8. Privacidade e LGPD",
    text: "O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade, em conformidade com a Lei nº 13.709/2018 (LGPD). Seus direitos de titular estão descritos nesse documento.",
  },
  {
    title: "9. Modificações",
    text: "Podemos atualizar estes termos periodicamente. Você será notificado por e-mail em caso de alterações relevantes. Continuar usando o serviço após a notificação constitui aceite da versão atualizada.",
  },
  {
    title: "10. Foro e lei aplicável",
    text: "Estes termos são regidos pelas leis brasileiras. Quaisquer disputas serão resolvidas no foro da Comarca de São Paulo — SP, salvo disposição legal em contrário.",
  },
  {
    title: "11. Contato",
    text: "Dúvidas sobre os termos: suporte@openfy.app",
  },
]

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
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111111", letterSpacing: "-0.02em", marginBottom: 8 }}>
            Termos de Uso
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
          borderLeft: "4px solid #0A0A0A",
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111111", marginBottom: 6 }}>
            Política de Privacidade
          </p>
          <p style={{ fontSize: 13, color: "#555555", lineHeight: 1.6 }}>
            Para informações sobre como tratamos seus dados pessoais, consulte nossa{" "}
            <Link to="/privacidade" style={{ color: "#16A34A", fontWeight: 600 }}>Política de Privacidade</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
