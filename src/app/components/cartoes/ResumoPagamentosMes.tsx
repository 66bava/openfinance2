import type { Fatura, Cartao } from '../../../lib/types'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '../../../lib/language-context'

interface Props {
  aPagar: number
  jaPago: number
  venceEmBreve: (Fatura & { cartoes?: Cartao })[]
}

function StatCard({
  label, valor, cor, sub,
}: {
  label: string
  valor: number
  cor: string
  sub?: string
}) {
  return (
    <div style={{
      background: 'var(--of-surface)',
      border: '1px solid var(--of-border)',
      borderRadius: 16,
      padding: '20px 22px',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{
        fontSize: 26,
        fontWeight: 700,
        color: cor,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        marginBottom: sub ? 6 : 0,
      }}>
        {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      {sub && <p style={{ fontSize: 12, color: 'var(--of-text-muted)' }}>{sub}</p>}
    </div>
  )
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function ResumoPagamentosMes({ aPagar, jaPago, venceEmBreve }: Props) {
  const { t } = useLanguage()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gap: 12 }} className="grid grid-cols-2 md:grid-cols-3">
        <StatCard label={t("cardsSummaryPayable")} valor={aPagar} cor="#DC2626" />
        <StatCard label={t("cardsSummaryPaid")} valor={jaPago} cor="#16A34A" />
        <div
          className="col-span-2 md:col-span-1"
          style={{
            background: venceEmBreve.length > 0 ? 'var(--of-warning-bg)' : 'var(--of-surface)',
            border: `1px solid ${venceEmBreve.length > 0 ? 'var(--of-warning-border)' : 'var(--of-border)'}`,
            borderRadius: 16,
            padding: '20px 22px',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t("cardsDueSoon")}
          </p>
          {venceEmBreve.length === 0 ? (
            <p style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', letterSpacing: '-0.03em' }}>
              {t("cardsNone")}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {venceEmBreve.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} color="#D97706" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--of-text)' }}>
                    {(f.cartoes as Cartao | undefined)?.nome ?? '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--of-text-muted)' }}>
                    {MESES[f.mes - 1]}/{f.ano}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginLeft: 'auto' }}>
                    {(f.valor_total - f.valor_pago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
