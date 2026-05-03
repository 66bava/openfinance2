import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Categoria } from '../../../lib/types'

interface Props {
  categoria: Categoria
  onEditar?: () => void
  onDeletar?: () => void
}

export default function CardCategoria({ categoria, onEditar, onDeletar }: Props) {
  const [hover, setHover] = useState(false)
  const isPadrao = categoria.is_padrao

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--of-surface)',
        border: `1px solid ${hover && !isPadrao ? '#0A0A0A' : '#E5E5E3'}`,
        borderRadius: 14,
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover && !isPadrao ? '0 4px 16px rgba(0,0,0,0.07)' : 'none',
        cursor: isPadrao ? 'default' : 'pointer',
      }}
    >
      {/* Emoji + cor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: categoria.cor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          {categoria.icone || '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--of-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {categoria.nome}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: categoria.tipo === 'receita' ? '#DCFCE7' : '#FEE2E2',
              color: categoria.tipo === 'receita' ? '#16A34A' : '#DC2626',
            }}>
              {categoria.tipo === 'receita' ? 'Receita' : 'Despesa'}
            </span>
            {isPadrao && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: 'var(--of-page-bg)', color: 'var(--of-text-muted)',
              }}>
                Padrão
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Botões de ação (hover) */}
      {!isPadrao && hover && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', gap: 4,
        }}>
          {onEditar && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditar() }}
              title="Editar"
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--of-page-bg)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#E5E5E3')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'var(--of-hover)')}
            >
              <Pencil size={13} color="#525252" />
            </button>
          )}
          {onDeletar && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeletar() }}
              title="Excluir"
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: '#FEF2F2', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#FEE2E2')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#FEF2F2')}
            >
              <Trash2 size={13} color="#DC2626" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
