import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../lib/auth-context'
import {
  getFaturaAtual,
  getTransacoesFatura,
  confirmarTransacao,
} from '../../lib/queries/cartoes'
import { getCartoes } from '../../lib/queries/cartoes'
import ModalPagarFatura from '../components/cartoes/ModalPagarFatura'
import type { Fatura, Cartao, Transacao } from '../../lib/types'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  aberta: { label: 'Aberta', cor: '#D97706', bg: '#FEF9C3' },
  fechada: { label: 'Fechada', cor: '#525252', bg: '#F5F5F0' },
  paga: { label: 'Paga', cor: '#16A34A', bg: '#DCFCE7' },
  parcial: { label: 'Parcial', cor: '#2563EB', bg: '#DBEAFE' },
}

export default function FaturaDetalhe() {
  const { id: cartaoId, mes, ano } = useParams<{ id: string; mes: string; ano: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [cartao, setCartao] = useState<Cartao | null>(null)
  const [fatura, setFatura] = useState<Fatura | null>(null)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalPagarAberto, setModalPagarAberto] = useState(false)

  const mesNum = parseInt(mes ?? '1')
  const anoNum = parseInt(ano ?? String(new Date().getFullYear()))

  const carregar = useCallback(async () => {
    if (!cartaoId) return
    setCarregando(true)
    try {
      const [cartoes, fat] = await Promise.all([
        getCartoes(userId),
        getFaturaAtual(cartaoId, mesNum, anoNum, userId),
      ])
      const c = cartoes.find((x) => x.id === cartaoId)
      setCartao(c ?? null)
      setFatura(fat)

      const txs = await getTransacoesFatura(fat.id, userId)
      setTransacoes(txs)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar fatura')
    } finally {
      setCarregando(false)
    }
  }, [cartaoId, userId, mesNum, anoNum])

  useEffect(() => { carregar() }, [carregar])

  const handleConfirmar = async (tx: Transacao) => {
    try {
      await confirmarTransacao(tx.id, userId)
      setTransacoes((prev) => prev.map((t) => t.id === tx.id ? { ...t, confirmado: true } : t))
      toast.success('Transação confirmada!')
    } catch {
      toast.error('Erro ao confirmar.')
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!fatura || !cartao) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#A3A3A3' }}>Fatura não encontrada.</p>
        <button onClick={() => navigate('/app/cartoes')} style={{ marginTop: 12, fontSize: 14, color: '#16A34A', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Voltar para cartões
        </button>
      </div>
    )
  }

  const saldo = fatura.valor_total - fatura.valor_pago
  const pctPago = fatura.valor_total > 0 ? (fatura.valor_pago / fatura.valor_total) * 100 : 0
  const statusConf = STATUS_CONFIG[fatura.status] ?? STATUS_CONFIG.aberta

  const valorFmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div style={{ padding: '20px 20px 100px', maxWidth: 720, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/app/cartoes')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#525252', marginBottom: 16, padding: 0,
            fontFamily: 'var(--font-body)',
          }}
        >
          <ArrowLeft size={15} /> Voltar para cartões
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: cartao.cor, flexShrink: 0,
              }} />
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
                {cartao.nome}
              </h1>
            </div>
            <p style={{ fontSize: 14, color: '#A3A3A3', marginBottom: 8 }}>
              Fatura de {MESES[mesNum - 1]} {anoNum}
              {cartao.dia_vencimento ? ` · Vence dia ${cartao.dia_vencimento}` : ''}
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
            background: statusConf.bg, color: statusConf.cor,
          }}>
            {statusConf.label}
          </span>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }} className="grid grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Total da fatura', valor: fatura.valor_total, cor: '#0A0A0A' },
          { label: 'Valor pago', valor: fatura.valor_pago, cor: '#16A34A' },
          { label: 'Saldo restante', valor: saldo, cor: saldo > 0 ? '#DC2626' : '#16A34A' },
          ...(cartao.dia_vencimento ? [{
            label: 'Vencimento',
            valor: null,
            texto: `Dia ${cartao.dia_vencimento}`,
            cor: '#0A0A0A',
          }] : []),
        ].map((item) => (
          <div key={item.label} style={{
            background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: 14, padding: '16px 18px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#A3A3A3', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {item.label}
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: item.cor, letterSpacing: '-0.02em' }}>
              {'texto' in item && item.texto ? item.texto : valorFmt(item.valor ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Barra de progresso */}
      {fatura.valor_total > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#A3A3A3' }}>Progresso do pagamento</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>{pctPago.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, background: '#E5E5E3', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pctPago}%`,
              background: pctPago >= 100 ? '#16A34A' : '#0A0A0A',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Transações da fatura */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', marginBottom: 14 }}>
          Transações ({transacoes.length})
        </h2>

        {transacoes.length === 0 ? (
          <div style={{
            background: '#FAFAFA', border: '1px dashed #E5E5E3', borderRadius: 14,
            padding: '32px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: '#A3A3A3' }}>
              Nenhuma transação nesta fatura ainda.
            </p>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: 14, overflow: 'hidden' }}>
            {transacoes.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                  borderBottom: i < transacoes.length - 1 ? '1px solid #F5F5F5' : 'none',
                  cursor: !tx.confirmado ? 'pointer' : 'default',
                }}
                onClick={() => !tx.confirmado && handleConfirmar(tx)}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: '#F5F5F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                }}>
                  {tx.categorias?.icone || '📦'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.descricao}
                  </p>
                  <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>
                    {new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {tx.categorias?.nome ? ` · ${tx.categorias.nome}` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A' }}>
                    {valorFmt(tx.valor)}
                  </p>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                    background: tx.confirmado ? '#DCFCE7' : '#FEF9C3',
                    color: tx.confirmado ? '#16A34A' : '#D97706',
                  }}>
                    {tx.confirmado ? '✓ Confirmado' : 'Clique para confirmar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão fixo pagar fatura */}
      {fatura.status !== 'paga' && fatura.valor_total > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#FFFFFF', borderTop: '1px solid #E5E5E3',
          padding: '16px 20px 28px',
          display: 'flex', justifyContent: 'center',
          zIndex: 10,
        }}>
          <button
            onClick={() => setModalPagarAberto(true)}
            style={{
              width: '100%', maxWidth: 480,
              padding: '15px',
              background: '#16A34A', color: '#FFFFFF',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#15803D')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#16A34A')}
          >
            Pagar fatura · {valorFmt(saldo)}
          </button>
        </div>
      )}

      {modalPagarAberto && fatura && cartao && (
        <ModalPagarFatura
          fatura={fatura}
          cartao={cartao}
          userId={userId}
          onClose={() => setModalPagarAberto(false)}
          onPago={() => { setModalPagarAberto(false); carregar() }}
        />
      )}
    </div>
  )
}
