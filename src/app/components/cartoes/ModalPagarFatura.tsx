import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { pagarFatura } from '../../../lib/queries/cartoes'
import type { Fatura, Cartao } from '../../../lib/types'

const METODOS = [
  { valor: 'pix', label: 'PIX' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'ted', label: 'TED' },
  { valor: 'debito_automatico', label: 'Débito automático' },
  { valor: 'dinheiro', label: 'Dinheiro' },
]

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface Props {
  fatura: Fatura
  cartao: Cartao
  userId: string
  onClose: () => void
  onPago: () => void
}

export default function ModalPagarFatura({ fatura, cartao, userId, onClose, onPago }: Props) {
  const [tipoPagamento, setTipoPagamento] = useState<'total' | 'parcial'>('total')
  const [valorParcial, setValorParcial] = useState('')
  const [metodo, setMetodo] = useState('pix')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [salvando, setSalvando] = useState(false)

  const saldoRestante = fatura.valor_total - fatura.valor_pago
  const valorConfirmar = tipoPagamento === 'total'
    ? saldoRestante
    : parseFloat(valorParcial.replace(',', '.') || '0')

  const handleConfirmar = async () => {
    if (tipoPagamento === 'parcial' && (isNaN(valorConfirmar) || valorConfirmar <= 0)) {
      toast.error('Informe um valor válido para o pagamento parcial')
      return
    }
    if (tipoPagamento === 'parcial' && valorConfirmar > saldoRestante) {
      toast.error('O valor parcial não pode ser maior que o saldo restante')
      return
    }

    setSalvando(true)
    try {
      await pagarFatura(
        fatura.id,
        userId,
        valorConfirmar,
        tipoPagamento,
        metodo,
        data,
        cartao.nome,
        fatura.mes,
        fatura.ano
      )
      toast.success('Pagamento registrado com sucesso!')
      onPago()
    } catch {
      toast.error('Erro ao registrar pagamento. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const valorFmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 480,
          padding: '24px 24px 40px',
        }}
        className="md:rounded-[20px] md:my-auto"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
            Pagar fatura
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Info da fatura */}
        <div style={{
          background: '#F5F5F0',
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: '#A3A3A3', marginBottom: 4 }}>
            {cartao.nome} · {MESES[fatura.mes - 1]}/{fatura.ano}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.03em' }}>
              {valorFmt(saldoRestante)}
            </span>
            {fatura.valor_pago > 0 && (
              <span style={{ fontSize: 13, color: '#16A34A' }}>
                ({valorFmt(fatura.valor_pago)} já pago)
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 4 }}>
            Total da fatura: {valorFmt(fatura.valor_total)}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tipo de pagamento */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Tipo de pagamento
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['total', 'parcial'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoPagamento(t)}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    border: `2px solid ${tipoPagamento === t ? '#0A0A0A' : '#E5E5E3'}`,
                    background: tipoPagamento === t ? '#0A0A0A' : '#FFFFFF',
                    color: tipoPagamento === t ? '#FFFFFF' : '#525252',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'total' ? 'Total' : 'Parcial'}
                </button>
              ))}
            </div>
          </div>

          {/* Valor parcial */}
          {tipoPagamento === 'parcial' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Valor a pagar (R$)
              </label>
              <input
                type="number"
                value={valorParcial}
                onChange={(e) => setValorParcial(e.target.value)}
                placeholder={`Máx: ${valorFmt(saldoRestante)}`}
                min="0.01"
                step="0.01"
                style={{
                  width: '100%', padding: '11px 14px', fontSize: 15,
                  border: '1.5px solid #E5E5E3', borderRadius: 10, outline: 'none',
                  boxSizing: 'border-box', fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          )}

          {/* Data */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Data do pagamento
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15,
                border: '1.5px solid #E5E5E3', borderRadius: 10, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          {/* Método */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Método
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {METODOS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => setMetodo(m.valor)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${metodo === m.valor ? '#0A0A0A' : '#E5E5E3'}`,
                    background: metodo === m.valor ? '#0A0A0A' : '#FFFFFF',
                    color: metodo === m.valor ? '#FFFFFF' : '#525252',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div style={{
            background: '#0A0A0A',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Valor a confirmar</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {valorConfirmar > 0 ? valorFmt(valorConfirmar) : '—'}
            </span>
          </div>

          {/* Botão */}
          <button
            onClick={handleConfirmar}
            disabled={salvando}
            style={{
              padding: '14px',
              background: salvando ? '#E5E5E3' : '#16A34A',
              color: salvando ? '#A3A3A3' : '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: salvando ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseOver={(e) => { if (!salvando) e.currentTarget.style.background = '#15803D' }}
            onMouseOut={(e) => { if (!salvando) e.currentTarget.style.background = '#16A34A' }}
          >
            {salvando ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Confirmando...</>
            ) : 'Confirmar pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
