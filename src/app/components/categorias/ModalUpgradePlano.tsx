import { X, Lock, Sparkles, Infinity, Brain, Target } from 'lucide-react'
import { useNavigate } from 'react-router'

const BENEFICIOS = [
  { icon: Infinity, texto: 'Categorias personalizadas ilimitadas' },
  { icon: Sparkles, texto: 'Transações ilimitadas' },
  { icon: Brain, texto: 'Relatório mensal com IA (Claude)' },
  { icon: Target, texto: 'Score de Saúde Financeira completo' },
]

interface Props {
  onClose: () => void
}

export default function ModalUpgradePlano({ onClose }: Props) {
  const navigate = useNavigate()

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
        background: '#FFFFFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 440,
        padding: '32px 28px',
        textAlign: 'center',
      }}>
        {/* Fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3', padding: 4,
          }}
        />

        {/* Ícone cadeado */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#F5F5F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={28} color="#0A0A0A" />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Limite do plano grátis atingido
        </h2>
        <p style={{ fontSize: 15, color: '#525252', lineHeight: 1.65, marginBottom: 24 }}>
          O plano grátis permite até <strong>4 categorias personalizadas</strong>.
          Atualize para o Pro e crie categorias ilimitadas.
        </p>

        {/* Benefícios */}
        <div style={{
          background: '#F5F5F0', borderRadius: 14, padding: '16px 20px',
          marginBottom: 24, textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {BENEFICIOS.map(({ icon: Icon, texto }) => (
            <div key={texto} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: '#DCFCE7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={15} color="#16A34A" />
              </div>
              <span style={{ fontSize: 14, color: '#0A0A0A', fontWeight: 500 }}>{texto}</span>
            </div>
          ))}
        </div>

        {/* CTA principal */}
        <button
          onClick={() => { navigate('/app/perfil'); onClose() }}
          style={{
            width: '100%', padding: '14px',
            background: '#0A0A0A', color: '#FFFFFF',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            marginBottom: 10,
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#262626')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#0A0A0A')}
        >
          Ver plano Pro — R$ 19,90/mês
        </button>

        {/* CTA secundário */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', color: '#A3A3A3',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Continuar com o grátis
        </button>
      </div>
    </div>
  )
}
