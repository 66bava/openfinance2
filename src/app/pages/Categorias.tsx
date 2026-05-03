import { useState, useEffect, useCallback } from 'react'
import { Plus, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../lib/auth-context'
import { getProfile } from '../../lib/queries'
import {
  getCategorias,
  criarCategoria,
  editarCategoria,
  deletarCategoria,
  contarCategoriasPersonalizadas,
  LIMITE_FREE,
} from '../../lib/queries/categorias'
import CardCategoria from '../components/categorias/CardCategoria'
import ModalNovaCategoria from '../components/categorias/ModalNovaCategoria'
import ModalUpgradePlano from '../components/categorias/ModalUpgradePlano'
import type { Categoria } from '../../lib/types'

export default function Categorias() {
  const { user } = useAuth()
  const userId = user!.id

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [plano, setPlano] = useState('free')
  const [contPersonalizadas, setContPersonalizadas] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const [modalNovoCat, setModalNovoCat] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [modalUpgrade, setModalUpgrade] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [lista, profile, count] = await Promise.all([
        getCategorias(userId),
        getProfile(userId),
        contarCategoriasPersonalizadas(userId),
      ])
      setCategorias(lista.filter((c) => c.ativo !== false))
      setPlano(profile?.plano ?? 'free')
      setContPersonalizadas(count)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar categorias')
    } finally {
      setCarregando(false)
    }
  }, [userId])

  useEffect(() => { carregar() }, [carregar])

  const padrao = categorias.filter((c) => c.is_padrao)
  const personalizadas = categorias.filter((c) => !c.is_padrao && c.user_id === userId)

  const handleNovaCategoria = () => {
    if (plano === 'free' && contPersonalizadas >= LIMITE_FREE) {
      setModalUpgrade(true)
      return
    }
    setModalNovoCat(true)
  }

  const handleSalvarNova = async (dados: { nome: string; tipo: 'receita' | 'despesa'; icone: string; cor: string }) => {
    try {
      await criarCategoria(userId, plano, dados)
      toast.success('Categoria criada!')
      setModalNovoCat(false)
      carregar()
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'LIMITE_ATINGIDO') {
        setModalNovoCat(false)
        setModalUpgrade(true)
      } else {
        toast.error('Erro ao criar categoria.')
      }
    }
  }

  const handleSalvarEdicao = async (dados: { nome: string; tipo: 'receita' | 'despesa'; icone: string; cor: string }) => {
    if (!categoriaEditando) return
    try {
      await editarCategoria(categoriaEditando.id, userId, dados)
      toast.success('Categoria atualizada!')
      setCategoriaEditando(null)
      carregar()
    } catch {
      toast.error('Erro ao editar categoria.')
    }
  }

  const handleDeletar = async (categoria: Categoria) => {
    try {
      await deletarCategoria(categoria.id, userId)
      toast.success('Categoria removida.')
      carregar()
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'CATEGORIA_COM_TRANSACOES') {
        toast.error('Não é possível excluir: há transações vinculadas a esta categoria.')
      } else {
        toast.error('Erro ao excluir categoria.')
      }
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const atingiuLimite = plano === 'free' && contPersonalizadas >= LIMITE_FREE

  return (
    <div style={{ padding: '20px 20px 48px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

      {/* SEÇÃO 1 — Categorias padrão */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--of-text)', marginBottom: 4 }}>
            Categorias padrão
          </h2>
          <p style={{ fontSize: 13, color: 'var(--of-text-muted)' }}>
            Disponíveis para todos os planos · Não podem ser editadas
          </p>
        </div>

        {padrao.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--of-text-muted)' }}>Nenhuma categoria padrão encontrada.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {padrao.map((c) => (
              <CardCategoria key={c.id} categoria={c} />
            ))}
          </div>
        )}
      </section>

      {/* SEÇÃO 2 — Minhas categorias */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--of-text)', marginBottom: 4 }}>
              Minhas categorias
            </h2>
            {plano === 'free' ? (
              <p style={{ fontSize: 13, color: atingiuLimite ? '#DC2626' : '#A3A3A3' }}>
                {contPersonalizadas} de {LIMITE_FREE} criadas
                {!atingiuLimite && (
                  <span style={{ color: 'var(--of-text-muted)' }}> · </span>
                )}
                {!atingiuLimite && (
                  <button
                    onClick={() => setModalUpgrade(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#16A34A', fontWeight: 600, padding: 0, fontFamily: 'var(--font-body)' }}
                  >
                    Atualize para Pro e crie ilimitadas
                  </button>
                )}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--of-text-muted)' }}>
                Categorias ilimitadas · {contPersonalizadas} criadas
              </p>
            )}
          </div>

          <button
            onClick={handleNovaCategoria}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px',
              background: atingiuLimite ? 'var(--of-page-bg)' : 'var(--of-btn-bg)',
              color: atingiuLimite ? 'var(--of-text-secondary)' : 'var(--of-btn-text)',
              border: `1px solid ${atingiuLimite ? 'var(--of-border)' : 'transparent'}`,
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
            }}
          >
            {atingiuLimite ? <Lock size={14} /> : <Plus size={14} />}
            Nova categoria
          </button>
        </div>

        {/* Banner de limite atingido */}
        {atingiuLimite && (
          <div style={{
            background: '#FEF9C3', border: '1px solid #FDE047',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={15} color="#D97706" />
              <p style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>
                Limite de {LIMITE_FREE} categorias atingido no plano grátis
              </p>
            </div>
            <button
              onClick={() => setModalUpgrade(true)}
              style={{
                padding: '7px 14px', background: '#D97706', color: '#FFFFFF',
                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Ver Pro →
            </button>
          </div>
        )}

        {personalizadas.length === 0 ? (
          <div style={{
            background: 'var(--of-page-bg)', border: '1px dashed var(--of-border)',
            borderRadius: 14, padding: '40px 24px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>🏷️</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--of-text)', marginBottom: 6 }}>
              Nenhuma categoria personalizada ainda
            </p>
            <p style={{ fontSize: 13, color: 'var(--of-text-muted)', marginBottom: 20 }}>
              Crie categorias com seu emoji e cor favoritos para organizar melhor seus gastos.
            </p>
            {!atingiuLimite && (
              <button
                onClick={handleNovaCategoria}
                style={{
                  padding: '10px 20px', background: 'var(--of-btn-bg)', color: 'var(--of-btn-text)',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                Criar primeira categoria
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {personalizadas.map((c) => (
              <CardCategoria
                key={c.id}
                categoria={c}
                onEditar={() => setCategoriaEditando(c)}
                onDeletar={() => handleDeletar(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modais */}
      {(modalNovoCat || categoriaEditando) && (
        <ModalNovaCategoria
          categoriaEditando={categoriaEditando}
          onClose={() => { setModalNovoCat(false); setCategoriaEditando(null) }}
          onSalvar={categoriaEditando ? handleSalvarEdicao : handleSalvarNova}
        />
      )}

      {modalUpgrade && (
        <ModalUpgradePlano onClose={() => setModalUpgrade(false)} />
      )}
    </div>
  )
}
