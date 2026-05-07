import { Lock, Sparkles, Infinity, Brain, Target } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useLanguage } from '../../../lib/language-context'

interface Props {
  onClose: () => void
}

export default function ModalUpgradePlano({ onClose }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const beneficios = [
    { icon: Infinity, texto: t('upgradeBenefitCategories') },
    { icon: Sparkles, texto: t('upgradeBenefitTransactions') },
    { icon: Brain, texto: t('upgradeBenefitAIReport') },
    { icon: Target, texto: t('upgradeBenefitScore') },
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-body)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--of-surface)',
        border: '1px solid var(--of-border)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 440,
        padding: '32px 28px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--of-page-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          border: '1px solid var(--of-border)',
        }}>
          <Lock size={28} color="var(--of-text)" />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--of-text)', letterSpacing: '-0.02em', marginBottom: 10 }}>
          {t('upgradeLimitTitle')}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--of-text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
          {t('upgradeLimitDesc')}
        </p>

        <div style={{
          background: 'var(--of-page-bg)', borderRadius: 14, padding: '16px 20px',
          marginBottom: 24, textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 12,
          border: '1px solid var(--of-border)',
        }}>
          {beneficios.map(({ icon: Icon, texto }) => (
            <div key={texto} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--of-success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={15} color="var(--of-success-text)" />
              </div>
              <span style={{ fontSize: 14, color: 'var(--of-text)', fontWeight: 500 }}>{texto}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { navigate('/app/perfil'); onClose() }}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--of-btn-bg)', color: 'var(--of-btn-text)',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            marginBottom: 10,
          }}
        >
          {t('upgradeViewPro')}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', color: 'var(--of-text-muted)',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          {t('upgradeKeepFree')}
        </button>
      </div>
    </div>
  )
}
