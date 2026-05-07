import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import type { Categoria } from '../../../lib/types'
import { useLanguage } from '../../../lib/language-context'

const CORES_PRESET = [
  '#111111', '#374151', '#6B7280', '#9CA3AF',
  '#DC2626', '#EA580C', '#D97706', '#65A30D',
  '#16A34A', '#059669', '#0284C7', '#2563EB',
  '#7C3AED', '#DB2777', '#0F172A', '#78350F',
]

const GRUPOS_EMOJI: { grupo: string; emojis: string[] }[] = [
  { grupo: 'Alimentação e compras', emojis: ['🛒', '🍔', '🍕', '🥗', '🥩', '🍱', '☕', '🍺', '🧃', '🛍️'] },
  { grupo: 'Transporte e mobilidade', emojis: ['🚗', '🚕', '🏍️', '🚌', '🚇', '✈️', '🚢', '🚲', '⛽', '🅿️'] },
  { grupo: 'Saúde e bem-estar', emojis: ['💊', '🏥', '🧘', '🏋️', '💉', '👁️', '🦷', '🩺', '💆', '🏊'] },
  { grupo: 'Casa e moradia', emojis: ['🏠', '💡', '🚿', '🛏️', '🔧', '📺', '🧹', '🌿', '🛋️', '🔐'] },
  { grupo: 'Educação e trabalho', emojis: ['📚', '💻', '🎓', '📝', '📊', '🖊️', '🔬', '📐', '🏫', '🎯'] },
  { grupo: 'Lazer e entretenimento', emojis: ['🎬', '🎮', '🎵', '🎨', '📸', '🎭', '🎲', '🏆', '🎤', '🎪'] },
  { grupo: 'Finanças e investimentos', emojis: ['💰', '💳', '📈', '🏦', '💼', '💵', '🪙', '🤝', '📉', '🧾'] },
  { grupo: 'Família e social', emojis: ['👶', '🐶', '🎁', '🎂', '💝', '👨‍👩‍👧', '🌸', '💒', '🎓', '👴'] },
]

const TODOS_EMOJIS = GRUPOS_EMOJI.flatMap((g) => g.emojis)

interface Props {
  categoriaEditando?: Categoria | null
  onClose: () => void
  onSalvar: (dados: { nome: string; tipo: 'receita' | 'despesa'; icone: string; cor: string }) => Promise<void>
}

export default function ModalNovaCategoria({ categoriaEditando, onClose, onSalvar }: Props) {
  const { t } = useLanguage()
  const [nome, setNome] = useState(categoriaEditando?.nome ?? '')
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(categoriaEditando?.tipo ?? 'despesa')
  const [emoji, setEmoji] = useState(categoriaEditando?.icone ?? '📦')
  const [cor, setCor] = useState(categoriaEditando?.cor ?? '#111111')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  const emojisFiltrados = useMemo(() => {
    if (!busca) return null
    const term = busca.toLowerCase()
    return TODOS_EMOJIS.filter((e) => {
      // Busca por grupo ou correspondência aproximada
      const grupo = GRUPOS_EMOJI.find((g) => g.emojis.includes(e))
      return grupo?.grupo.toLowerCase().includes(term) || e.includes(term)
    })
  }, [busca])

  const handleSalvar = async () => {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = t("categoriesNameRequired")
    if (nome.trim().length > 30) e.nome = t("categoriesNameMax")
    if (Object.keys(e).length > 0) { setErros(e); return }

    setSalvando(true)
    try {
      await onSalvar({ nome: nome.trim(), tipo, icone: emoji, cor })
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
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px 24px 40px',
        }}
        className="md:rounded-[20px] md:my-auto"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--of-text)', letterSpacing: '-0.02em' }}>
            {categoriaEditando ? t("categoriesEdit") : t("categoriesNew")}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--of-text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--of-page-bg)', borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: cor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>
              {emoji}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--of-text)' }}>
                {nome || t("categoriesName")}
              </p>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: tipo === 'receita' ? 'var(--of-success-bg)' : 'var(--of-danger-bg)',
                color: tipo === 'receita' ? 'var(--of-success-text)' : 'var(--of-danger-text)',
              }}>
                {tipo === 'receita' ? t("categoriesIncome") : t("categoriesExpense")}
              </span>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              {t("categoriesName")}
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value.slice(0, 30))
                setErros((p) => ({ ...p, nome: '' }))
              }}
              placeholder={t("categoriesNamePlaceholder")}
              maxLength={30}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15,
                border: `1.5px solid ${erros.nome ? '#DC2626' : 'var(--of-border)'}`,
                borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--font-body)',
                background: 'var(--of-page-bg)', color: 'var(--of-text)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {erros.nome
                ? <p style={{ fontSize: 12, color: '#DC2626' }}>{erros.nome}</p>
                : <span />
              }
              <p style={{ fontSize: 11, color: 'var(--of-text-muted)' }}>{nome.length}/30</p>
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              {t("categoriesType")}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['despesa', 'receita'] as const).map((tipoOpcao) => (
                <button
                  key={tipoOpcao}
                  type="button"
                  onClick={() => setTipo(tipoOpcao)}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    border: `2px solid ${tipo === tipoOpcao ? (tipoOpcao === 'despesa' ? '#DC2626' : '#16A34A') : 'var(--of-border)'}`,
                    background: tipo === tipoOpcao ? (tipoOpcao === 'despesa' ? 'var(--of-danger-bg)' : 'var(--of-success-bg)') : 'var(--of-surface)',
                    color: tipo === tipoOpcao ? (tipoOpcao === 'despesa' ? 'var(--of-danger-text)' : 'var(--of-success-text)') : 'var(--of-text-secondary)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                >
                  {tipoOpcao === 'despesa' ? `↓ ${t("categoriesExpense")}` : `↑ ${t("categoriesIncome")}`}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              {t("categoriesEmoji")}
            </label>

            {/* Busca */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: '1.5px solid var(--of-border)', borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            }}>
              <Search size={14} color="var(--of-text-muted)" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("categoriesSearchEmoji")}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-body)', background: 'transparent', color: 'var(--of-text)' }}
              />
            </div>

            {/* Grid de emojis */}
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {emojisFiltrados ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {emojisFiltrados.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      style={{
                        width: 40, height: 40, fontSize: 20, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: emoji === e ? 'var(--of-hover)' : 'transparent',
                        transition: 'background 0.1s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              ) : (
                GRUPOS_EMOJI.map((grupo) => (
                  <div key={grupo.grupo} style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--of-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      {grupo.grupo}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {grupo.emojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEmoji(e)}
                          style={{
                            width: 40, height: 40, fontSize: 20, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: emoji === e ? 'var(--of-hover)' : 'transparent',
                            transition: 'background 0.1s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseOver={(el) => { if (emoji !== e) el.currentTarget.style.background = 'var(--of-hover)' }}
                          onMouseOut={(el) => { el.currentTarget.style.background = emoji === e ? 'var(--of-hover)' : 'transparent' }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--of-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              {t("categoriesColor")}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {CORES_PRESET.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => setCor(c)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', background: c, border: 'none',
                    outline: cor === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2,
                    boxShadow: cor === c ? `0 0 0 2px var(--of-surface), 0 0 0 4px ${c}` : '0 1px 3px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transform: cor === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Salvar */}
          <button
            onClick={handleSalvar}
            disabled={salvando}
            style={{
              padding: '14px',
              background: salvando ? 'var(--of-hover)' : 'var(--of-btn-bg)',
              color: salvando ? 'var(--of-text-muted)' : 'var(--of-btn-text)',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700,
              cursor: salvando ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {salvando ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> {t("cardsSaving")}</>
            ) : (categoriaEditando ? t("categoriesSaveChanges") : t("categoriesCreate"))}
          </button>
        </div>
      </div>
    </div>
  )
}
