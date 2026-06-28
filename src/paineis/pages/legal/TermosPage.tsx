import { LegalLayout } from "./LegalLayout"

const SECTIONS: Array<{ title: string; text: string }> = [
  {
    title: "1. Aceitação",
    text: "Ao criar uma conta e usar a Finance App, você concorda com estes Termos de Uso. O aceite pode ser registrado eletronicamente, incluindo data e versão.",
  },
  {
    title: "2. Descrição do serviço",
    text: "A Finance App é um produto de organização e inteligência financeira. As análises e recomendações são orientativas e dependem dos dados registrados/importados pelo usuário.",
  },
  {
    title: "3. Responsabilidades",
    text: "Você é responsável por manter a segurança da sua conta. Não compartilhe credenciais. Em integrações futuras via Open Finance, a Finance App não solicitará senha bancária.",
  },
  {
    title: "4. Privacidade",
    text: "O tratamento de dados pessoais segue a Política de Privacidade. Você pode exportar dados e solicitar exclusão definitiva conforme disponível no produto.",
  },
]

export default function TermosPage() {
  return (
    <LegalLayout title="Termos de Uso" meta="Versão estrutural · Texto final será revisado">
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

