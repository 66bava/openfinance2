import { Link } from "react-router"
import type { ReactNode } from "react"

function BrandMark() {
  return (
    <div className="logo-mark" aria-hidden="true" style={{ width: 28, height: 28 }}>
      <svg viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}

export function LegalLayout(props: {
  title: string
  meta?: string
  kicker?: string
  backTo?: string
  children: ReactNode
}) {
  const backTo = props.backTo ?? "/"
  return (
    <div className="ofx ofx-legal">
      <header className="legal-nav">
        <Link to="/" className="legal-brand" aria-label="Openfy">
          <BrandMark />
          <span className="legal-brand-text">Openfy</span>
        </Link>
        <Link to={backTo} className="legal-back">
          ← Voltar
        </Link>
      </header>

      <main className="legal-container">
        <div className="legal-hero">
          {props.kicker ? <div className="legal-kicker">{props.kicker}</div> : null}
          <h1 className="legal-title">{props.title}</h1>
          {props.meta ? <div className="legal-meta">{props.meta}</div> : null}
        </div>

        <div className="legal-content">{props.children}</div>

        <div className="legal-note">
          <div className="legal-note-title">Segurança e transparência</div>
          <div className="legal-note-text">
            A Openfy nunca solicita sua senha bancária. Quando a conexão bancária via Open Finance estiver disponível, a autorização acontece diretamente no seu banco (consentimento),
            e você pode revogar o acesso a qualquer momento.
          </div>
        </div>
      </main>
    </div>
  )
}

