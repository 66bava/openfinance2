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
import { useLanguage } from '../../lib/language-context'

export default function Categorias() {
  const { user } = useAuth()
  const { t } = useLanguage()
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
      toast.error(t("categoriesLoadError"))
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
      toast.success(t("categoriesCreatedToast"))
      setModalNovoCat(false)
      carregar()
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'LIMITE_ATINGIDO') {
        setModalNovoCat(false)
        setModalUpgrade(true)
      } else {
        toast.error(t("categoriesCreateError"))
      }
    }
  }

  const handleSalvarEdicao = async (dados: { nome: string; tipo: 'receita' | 'despesa'; icone: string; cor: string }) => {
    if (!categoriaEditando) return
    try {
      await editarCategoria(categoriaEditando.id, userId, dados)
      toast.success(t("categoriesUpdatedToast"))
      setCategoriaEditando(null)
      carregar()
    } catch {
      toast.error(t("categoriesEditError"))
    }
  }

  const handleDeletar = async (categoria: Categoria) => {
    try {
      await deletarCategoria(categoria.id, userId)
      toast.success(t("categoriesRemovedToast"))
      carregar()
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'CATEGORIA_COM_TRANSACOES') {
        toast.error(t("categoriesDeleteLinkedError"))
      } else {
        toast.error(t("categoriesDeleteError"))
      }
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ width: 24, height: 24, border: "2px solid var(--of-text)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
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
            {t("categoriesDefault")}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--of-text-muted)' }}>
            {t("categoriesDefaultDesc")}
          </p>
        </div>

        {padrao.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--of-text-muted)' }}>{t("categoriesNoDefault")}</p>
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
              {t("categoriesMine")}
            </h2>
            {plano === 'free' ? (
              <p style={{ fontSize: 13, color: atingiuLimite ? '#DC2626' : 'var(--of-text-muted)' }}>
                {contPersonalizadas} de {LIMITE_FREE} {t("categoriesCreated")}
                {!atingiuLimite && (
                  <span style={{ color: 'var(--of-text-muted)' }}> · </span>
                )}
                {!atingiuLimite && (
                  <button
                    onClick={() => setModalUpgrade(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#16A34A', fontWeight: 600, padding: 0, fontFamily: 'var(--font-body)' }}
                  >
                    {t("categoriesUpgradeUnlimited")}
                  </button>
                )}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--of-text-muted)' }}>
                {t("categoriesUnlimited")} · {contPersonalizadas} {t("categoriesCreated")}
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
            {t("categoriesNew")}
          </button>
        </div>

        {/* Banner de limite atingido */}
        {atingiuLimite && (
          <div style={{
            background: 'var(--of-warning-bg)', border: '1px solid var(--of-warning-border)',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={15} color="#D97706" />
              <p style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>
                {t("categoriesLimitReached")}
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
              {t("categoriesViewPro")}
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
              {t("categoriesNoCustomTitle")}
            </p>
            <p style={{ fontSize: 13, color: 'var(--of-text-muted)', marginBottom: 20 }}>
              {t("categoriesNoCustomDesc")}
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
                {t("categoriesCreateFirst")}
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
