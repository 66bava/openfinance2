import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../lib/auth-context'
import {
  getCartoes,
  getFaturaAtual,
  getTransacoesCartaoMes,
  confirmarTransacao,
  getResumoPagamentosMes,
} from '../../lib/queries/cartoes'
import CardCartao from '../components/cartoes/CardCartao'
import ModalNovoCartao from '../components/cartoes/ModalNovoCartao'
import ModalPagarFatura from '../components/cartoes/ModalPagarFatura'
import ResumoPagamentosMes from '../components/cartoes/ResumoPagamentosMes'
import type { Cartao, Fatura, Transacao } from '../../lib/types'
import { useNavigate } from 'react-router'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function BadgeStatus({ confirmado }: { confirmado?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      background: confirmado ? '#DCFCE7' : '#FEF9C3',
      color: confirmado ? '#16A34A' : '#D97706',
    }}>
      {confirmado ? '✓ Confirmado' : '⏳ Pendente'}
    </span>
  )
}

export default function Cartoes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user!.id

  const agora = new Date()
  const [mesSel, setMesSel] = useState(agora.getMonth() + 1)
  const [anoSel, setAnoSel] = useState(agora.getFullYear())

  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [faturas, setFaturas] = useState<Record<string, Fatura>>({})
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [resumo, setResumo] = useState<{ aPagar: number; jaPago: number; venceEmBreve: any[] }>({
    aPagar: 0, jaPago: 0, venceEmBreve: [],
  })

  const [carregando, setCarregando] = useState(true)
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [cartaoParaPagar, setCartaoParaPagar] = useState<{ cartao: Cartao; fatura: Fatura } | null>(null)
  const [filtroCartao, setFiltroCartao] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'confirmado'>('todos')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [listaCartoes, res] = await Promise.all([
        getCartoes(userId),
        getResumoPagamentosMes(userId),
      ])
      setCartoes(listaCartoes)
      setResumo(res)

      // Buscar fatura atual de cada cartão de crédito
      const faturasMap: Record<string, Fatura> = {}
      await Promise.all(
        listaCartoes
          .filter((c) => c.tipo === 'credito')
          .map(async (c) => {
            const f = await getFaturaAtual(c.id, mesSel, anoSel, userId)
            faturasMap[c.id] = f
          })
      )
      setFaturas(faturasMap)

      // Buscar transações de todos os cartões no mês
      const txsPorCartao = await Promise.all(
        listaCartoes.map((c) => getTransacoesCartaoMes(c.id, userId, mesSel, anoSel))
      )
      setTransacoes(txsPorCartao.flat())
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar cartões')
    } finally {
      setCarregando(false)
    }
  }, [userId, mesSel, anoSel])

  useEffect(() => { carregar() }, [carregar])

  const txsFiltradas = transacoes.filter((tx) => {
    if (filtroCartao !== 'todos' && tx.cartao_id !== filtroCartao) return false
    if (filtroStatus === 'pendente' && tx.confirmado) return false
    if (filtroStatus === 'confirmado' && !tx.confirmado) return false
    return true
  })

  const handleConfirmarTx = async (tx: Transacao) => {
    try {
      await confirmarTransacao(tx.id, userId)
      setTransacoes((prev) => prev.map((t) => t.id === tx.id ? { ...t, confirmado: true } : t))
      toast.success('Transação confirmada!')
    } catch {
      toast.error('Erro ao confirmar transação.')
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 20px 40px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

      {/* Resumo do mês */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--of-text)' }}>
            {MESES[mesSel - 1]} {anoSel}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={`${mesSel}-${anoSel}`}
              onChange={(e) => {
                const [m, a] = e.target.value.split('-')
                setMesSel(parseInt(m))
                setAnoSel(parseInt(a))
              }}
              style={{
                padding: '7px 12px', fontSize: 13, border: '1px solid var(--of-border)',
                borderRadius: 8, background: 'var(--of-surface)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', color: 'var(--of-text)',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(agora.getFullYear(), agora.getMonth() - 5 + i)
                return (
                  <option key={i} value={`${d.getMonth() + 1}-${d.getFullYear()}`}>
                    {MESES[d.getMonth()]} {d.getFullYear()}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
        <ResumoPagamentosMes
          aPagar={resumo.aPagar}
          jaPago={resumo.jaPago}
          venceEmBreve={resumo.venceEmBreve}
        />
      </div>

      {/* Meus cartões */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--of-text)' }}>
            Meus cartões
          </h2>
          <button
            onClick={() => setModalNovoAberto(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', background: 'var(--of-btn-bg)', color: 'var(--of-btn-text)',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#262626')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--of-btn-bg)')}
          >
            <Plus size={16} /> Adicionar cartão
          </button>
        </div>

        {cartoes.length === 0 ? (
          <div style={{
            background: 'var(--of-page-bg)', border: '1px dashed var(--of-border)', borderRadius: 16,
            padding: '48px 24px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>💳</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--of-text)', marginBottom: 6 }}>
              Nenhum cartão cadastrado
            </p>
            <p style={{ fontSize: 13, color: 'var(--of-text-muted)', marginBottom: 20 }}>
              Adicione seus cartões de crédito e débito para controlar as faturas.
            </p>
            <button
              onClick={() => setModalNovoAberto(true)}
              style={{
                padding: '10px 20px', background: 'var(--of-btn-bg)', color: 'var(--of-btn-text)',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Adicionar primeiro cartão
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {cartoes.map((c) => (
              <CardCartao
                key={c.id}
                cartao={c}
                fatura={faturas[c.id] ?? null}
                onVerFatura={() => {
                  const f = faturas[c.id]
                  if (f) navigate(`/app/cartoes/${c.id}/fatura/${f.mes}/${f.ano}`)
                }}
                onPagarFatura={() => {
                  const f = faturas[c.id]
                  if (f) setCartaoParaPagar({ cartao: c, fatura: f })
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transações do mês */}
      {transacoes.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--of-text)' }}>
              Transações do mês
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Filter size={14} color="#A3A3A3" />

              {/* Filtro cartão */}
              <select
                value={filtroCartao}
                onChange={(e) => setFiltroCartao(e.target.value)}
                style={{
                  padding: '6px 10px', fontSize: 13, border: '1px solid var(--of-border)',
                  borderRadius: 8, background: 'var(--of-surface)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', color: 'var(--of-text)',
                }}
              >
                <option value="todos">Todos os cartões</option>
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              {/* Filtro status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
                style={{
                  padding: '6px 10px', fontSize: 13, border: '1px solid var(--of-border)',
                  borderRadius: 8, background: 'var(--of-surface)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', color: 'var(--of-text)',
                }}
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--of-surface)', border: '1px solid var(--of-border)', borderRadius: 16, overflow: 'hidden' }}>
            {txsFiltradas.length === 0 ? (
              <p style={{ padding: '32px', textAlign: 'center', fontSize: 14, color: 'var(--of-text-muted)' }}>
                Nenhuma transação encontrada com os filtros selecionados.
              </p>
            ) : (
              txsFiltradas.map((tx, i) => {
                const cartaoTx = cartoes.find((c) => c.id === tx.cartao_id)
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px',
                      borderBottom: i < txsFiltradas.length - 1 ? '1px solid var(--of-border-light)' : 'none',
                    }}
                  >
                    {/* Emoji categoria */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--of-page-bg)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16, flexShrink: 0,
                    }}>
                      {tx.categorias?.icone || '📦'}
                    </div>

                    {/* Descrição */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--of-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.descricao}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <p style={{ fontSize: 12, color: 'var(--of-text-muted)' }}>
                          {new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        {cartaoTx && (
                          <>
                            <span style={{ fontSize: 12, color: '#E5E5E3' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--of-text-muted)' }}>{cartaoTx.nome}</span>
                          </>
                        )}
                        {tx.categorias?.nome && (
                          <>
                            <span style={{ fontSize: 12, color: '#E5E5E3' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--of-text-muted)' }}>{tx.categorias.nome}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: tx.tipo === 'despesa' ? '#0A0A0A' : '#16A34A' }}>
                        {tx.tipo === 'despesa' ? '-' : '+'}
                        {tx.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BadgeStatus confirmado={tx.confirmado} />
                        {!tx.confirmado && (
                          <button
                            onClick={() => handleConfirmarTx(tx)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px',
                              background: 'var(--of-btn-bg)', color: 'var(--of-btn-text)',
                              border: 'none', borderRadius: 20, cursor: 'pointer',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            Confirmar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Modais */}
      {modalNovoAberto && (
        <ModalNovoCartao
          userId={userId}
          onClose={() => setModalNovoAberto(false)}
          onSalvo={() => { setModalNovoAberto(false); carregar() }}
        />
      )}

      {cartaoParaPagar && (
        <ModalPagarFatura
          fatura={cartaoParaPagar.fatura}
          cartao={cartaoParaPagar.cartao}
          userId={userId}
          onClose={() => setCartaoParaPagar(null)}
          onPago={() => { setCartaoParaPagar(null); carregar() }}
        />
      )}
    </div>
  )
}
