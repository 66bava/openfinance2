import type { Cartao, Fatura } from '../../../lib/types'

function BandeiraIcon({ bandeira }: { bandeira: Cartao['bandeira'] }) {
  const base: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.04em',
    padding: '3px 8px',
    borderRadius: 4,
  }

  switch (bandeira) {
    case 'visa':
      return <span style={{ ...base, background: '#1A1F71', color: '#FFFFFF' }}>VISA</span>
    case 'mastercard':
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#EB001B', display: 'block' }} />
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F79E1B', display: 'block', marginLeft: -8 }} />
        </span>
      )
    case 'elo':
      return <span style={{ ...base, background: '#FFE500', color: '#000000' }}>elo</span>
    case 'amex':
      return <span style={{ ...base, background: '#007BC1', color: '#FFFFFF' }}>AMEX</span>
    case 'hipercard':
      return <span style={{ ...base, background: '#B61222', color: '#FFFFFF' }}>Hiper</span>
    default:
      return <span style={{ ...base, background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>●●●</span>
  }
}

interface Props {
  cartao: Cartao
  fatura?: Fatura | null
  onVerFatura: () => void
  onPagarFatura?: () => void
}

export default function CardCartao({ cartao, fatura, onVerFatura, onPagarFatura }: Props) {
  const isCredito = cartao.tipo === 'credito'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Card visual */}
      <div
        style={{
          background: cartao.cor,
          borderRadius: 16,
          padding: '22px 24px',
          aspectRatio: '1.586 / 1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          cursor: 'pointer',
        }}
        onClick={onVerFatura}
      >
        {/* Círculos decorativos de fundo */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: -20,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />

        {/* Topo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            {cartao.nome}
          </span>
          <BandeiraIcon bandeira={cartao.bandeira} />
        </div>

        {/* Meio — limite */}
        {isCredito && cartao.limite > 0 && (
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
              Limite
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
              {cartao.limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <span style={{
              display: 'inline-block',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.1)',
              padding: '3px 8px',
              borderRadius: 20,
              marginBottom: 6,
            }}>
              {isCredito ? 'Crédito' : 'Débito'}
            </span>
            {isCredito && cartao.dia_vencimento && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                Vence dia {cartao.dia_vencimento}
                {cartao.dia_fechamento ? ` · Fecha dia ${cartao.dia_fechamento}` : ''}
              </p>
            )}
            {!isCredito && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Conta corrente</p>
            )}
          </div>

          {/* Fatura status */}
          {isCredito && fatura && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                Fatura atual
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                {fatura.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onVerFatura}
          style={{
            flex: 1,
            padding: '10px',
            background: '#FFFFFF',
            border: '1px solid #E5E5E3',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: '#0A0A0A',
            cursor: 'pointer',
            transition: 'background 0.15s',
            fontFamily: 'var(--font-body)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#F5F5F0')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#FFFFFF')}
        >
          {isCredito ? 'Ver fatura' : 'Ver gastos'}
        </button>

        {isCredito && fatura && fatura.status !== 'paga' && onPagarFatura && (
          <button
            onClick={onPagarFatura}
            style={{
              flex: 1,
              padding: '10px',
              background: '#16A34A',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background 0.15s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#15803D')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#16A34A')}
          >
            Pagar fatura
          </button>
        )}
      </div>
    </div>
  )
}
