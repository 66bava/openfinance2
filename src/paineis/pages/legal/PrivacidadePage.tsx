import { LegalLayout } from "./LegalLayout"

const SECTIONS: Array<{ title: string; text: string }> = [
  {
    title: "1. Visão geral",
    text: "Esta página descreve, de forma resumida, como a Openfy trata dados pessoais e financeiros. O texto final pode ser atualizado sem alterar a estrutura da página.",
  },
  {
    title: "2. Dados que coletamos",
    text: "Dados de cadastro (nome, e-mail) e dados financeiros fornecidos por você (transações, assinaturas, compromissos e investimentos). No futuro, mediante consentimento, dados poderão ser importados via Open Finance ou arquivos (CSV/OFX).",
  },
  {
    title: "3. Finalidade e base legal",
    text: "Usamos os dados para fornecer o serviço, melhorar análises e manter segurança. Quando exigido, coletamos consentimento explícito e registramos data/versão do aceite.",
  },
  {
    title: "4. Segurança",
    text: "Seus dados são protegidos por Row Level Security (RLS) no Supabase: cada usuário acessa apenas seus próprios registros. Registramos eventos relevantes em logs de auditoria para segurança e conformidade.",
  },
  {
    title: "5. Seus direitos (LGPD)",
    text: "Você pode exportar seus dados e solicitar exclusão definitiva. Algumas etapas (como exclusão da conta do provedor de autenticação) exigem um fluxo de back-end dedicado; a estrutura está preparada para isso.",
  },
]

export default function PrivacidadePage() {
  return (
    <LegalLayout title="Política de Privacidade" kicker="LGPD" meta="Versão estrutural · Texto final será revisado">
      <div className="legal-card">
        {SECTIONS.map((s) => (
          <section key={s.title} className="legal-section">
            <h2 className="legal-h2">{s.title}</h2>
            <p className="legal-p">{s.text}</p>
          </section>
        ))}
      </div>
    </LegalLayout>
  )
}

