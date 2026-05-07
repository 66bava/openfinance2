import { useState } from 'react'
import { X, CreditCard, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { criarCartao } from '../../../lib/queries/cartoes'
import type { BandeiraCartao, Cartao } from '../../../lib/types'

const CORES_PRESET = [
  { valor: '#111111', label: 'Preto' },
  { valor: '#1A1A2E', label: 'Azul escuro' },
  { valor: '#16213E', label: 'Marinho' },
  { valor: '#0F3460', label: 'Azul royal' },
  { valor: '#533483', label: 'Roxo' },
  { valor: '#16A34A', label: 'Verde' },
  { valor: '#B91C1C', label: 'Vermelho' },
  { valor: '#92400E', label: 'Dourado' },
]

const BANDEIRAS: { valor: BandeiraCartao; label: string }[] = [
  { valor: 'visa', label: 'Visa' },
  { valor: 'mastercard', label: 'Mastercard' },
  { valor: 'elo', label: 'Elo' },
  { valor: 'amex', label: 'Amex' },
  { valor: 'hipercard', label: 'Hipercard' },
  { valor: 'outro', label: 'Outro' },
]

interface Props {
  userId: string
  onClose: () => void
  onSalvo: (cartao: Cartao) => void
}

export default function ModalNovoCartao({ userId, onClose, onSalvo }: Props) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'credito' | 'debito'>('credito')
  const [bandeira, setBandeira] = useState<BandeiraCartao>('visa')
  const [limite, setLimite] = useState('')
  const [diaVencimento, setDiaVencimento] = useState('')
  const [diaFechamento, setDiaFechamento] = useState('')
  const [cor, setCor] = useState('#111111')
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  const validar = () => {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = 'Informe o nome do cartão'
    if (tipo === 'credito') {
      const dia = parseInt(diaVencimento)
      const fech = parseInt(diaFechamento)
      if (diaVencimento && (dia < 1 || dia > 31)) e.diaVencimento = 'Dia inválido (1-31)'
      if (diaFechamento && (fech < 1 || fech > 31)) e.diaFechamento = 'Dia inválido (1-31)'
    }
    return e
  }

  const handleSalvar = async () => {
    const e = validar()
    if (Object.keys(e).length > 0) { setErros(e); return }

    setSalvando(true)
    try {
      const limiteNum = limite ? parseFloat(limite.replace(',', '.')) : 0
      const cartao = await criarCartao(userId, {
        nome: nome.trim(),
        tipo,
        bandeira,
        limite: limiteNum,
        dia_vencimento: diaVencimento ? parseInt(diaVencimento) : null,
        dia_fechamento: diaFechamento ? parseInt(diaFechamento) : null,
        cor,
      })
      toast.success('Cartão adicionado com sucesso!')
      onSalvo(cartao)
    } catch {
      toast.error('Erro ao salvar cartão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
        fontFamily: 'var(--font-body)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--of-surface)',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 24px 40px',
        }}
        className="md:rounded-[20px] md:my-auto"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--of-text)', letterSpacing: '-0.02em' }}>
            Novo cartão
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--of-text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Nome */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Nome do cartão
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => { setNome(e.target.value); setErros((p) => ({ ...p, nome: '' })) }}
              placeholder="Ex: Nubank, Itaú Platinum..."
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15,
                border: `1.5px solid ${erros.nome ? '#DC2626' : 'var(--of-border)'}`,
                borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--font-body)',
              }}
            />
            {erros.nome && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{erros.nome}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Tipo
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([['credito', 'Crédito', CreditCard], ['debito', 'Débito', Building2]] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTipo(val)}
                  style={{
                    padding: '14px',
                    borderRadius: 12,
                    border: `2px solid ${tipo === val ? 'var(--of-btn-bg)' : 'var(--of-border)'}`,
                    background: tipo === val ? 'var(--of-btn-bg)' : 'var(--of-surface)',
                    color: tipo === val ? 'var(--of-btn-text)' : 'var(--of-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={22} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bandeira */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Bandeira
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {BANDEIRAS.map((b) => (
                <button
                  key={b.valor}
                  type="button"
                  onClick={() => setBandeira(b.valor)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `2px solid ${bandeira === b.valor ? 'var(--of-btn-bg)' : 'var(--of-border)'}`,
                    background: bandeira === b.valor ? 'var(--of-btn-bg)' : 'var(--of-surface)',
                    color: bandeira === b.valor ? 'var(--of-btn-text)' : 'var(--of-text-secondary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos de crédito */}
          {tipo === 'credito' && (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Limite (R$)
                </label>
                <input
                  type="number"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%', padding: '11px 14px', fontSize: 15,
                    border: '1.5px solid var(--of-border)', borderRadius: 10, outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'var(--font-body)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Dia vencimento
                  </label>
                  <input
                    type="number"
                    value={diaVencimento}
                    onChange={(e) => { setDiaVencimento(e.target.value); setErros((p) => ({ ...p, diaVencimento: '' })) }}
                    placeholder="10"
                    min="1" max="31"
                    style={{
                      width: '100%', padding: '11px 14px', fontSize: 15,
                      border: `1.5px solid ${erros.diaVencimento ? '#DC2626' : 'var(--of-border)'}`,
                      borderRadius: 10, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)',
                    }}
                  />
                  {erros.diaVencimento && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{erros.diaVencimento}</p>}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Dia fechamento
                  </label>
                  <input
                    type="number"
                    value={diaFechamento}
                    onChange={(e) => { setDiaFechamento(e.target.value); setErros((p) => ({ ...p, diaFechamento: '' })) }}
                    placeholder="3"
                    min="1" max="31"
                    style={{
                      width: '100%', padding: '11px 14px', fontSize: 15,
                      border: `1.5px solid ${erros.diaFechamento ? '#DC2626' : 'var(--of-border)'}`,
                      borderRadius: 10, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)',
                    }}
                  />
                  {erros.diaFechamento && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{erros.diaFechamento}</p>}
                </div>
              </div>
            </>
          )}

          {/* Cor */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Cor do cartão
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CORES_PRESET.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  title={c.label}
                  onClick={() => setCor(c.valor)}
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: c.valor,
                    border: cor === c.valor ? '3px solid #0A0A0A' : '2px solid transparent',
                    outline: cor === c.valor ? '2px solid #FFFFFF' : 'none',
                    outlineOffset: -4,
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    transform: cor === c.valor ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              background: cor,
              borderRadius: 12,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              {nome || 'Nome do cartão'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 20,
            }}>
              {tipo === 'credito' ? 'Crédito' : 'Débito'}
            </span>
          </div>

          {/* Salvar */}
          <button
            onClick={handleSalvar}
            disabled={salvando}
            style={{
              padding: '14px',
              background: salvando ? 'var(--of-border)' : 'var(--of-btn-bg)',
              color: salvando ? 'var(--of-text-muted)' : 'var(--of-btn-text)',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: salvando ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {salvando ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Salvando...</>
            ) : 'Salvar cartão'}
          </button>
        </div>
      </div>
    </div>
  )
}
