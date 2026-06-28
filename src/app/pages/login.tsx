import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setErro(null)

    if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro('Email ou senha incorretos')
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) setErro('Erro ao criar conta. Tente outro email.')
      else setErro('Verifique seu email para confirmar o cadastro!')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F5F5F5'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '2rem',
        background: 'white', borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Open Finance
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#777', marginBottom: '1.5rem' }}>
          {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis'}
        </p>

        {erro && (
          <div style={{
            padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem',
            background: '#FFF3CD', color: '#856404', fontSize: '0.875rem'
          }}>
            {erro}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '0.75rem', marginBottom: '0.75rem',
            borderRadius: '8px', border: '1px solid #E0E0E0',
            fontSize: '0.95rem', boxSizing: 'border-box'
          }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          style={{
            width: '100%', padding: '0.75rem', marginBottom: '1rem',
            borderRadius: '8px', border: '1px solid #E0E0E0',
            fontSize: '0.95rem', boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '0.75rem', background: '#111',
            color: 'white', borderRadius: '8px', border: 'none',
            fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#777' }}>
          {modo === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <span
            onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')}
            style={{ color: '#111', fontWeight: 600, cursor: 'pointer' }}
          >
            {modo === 'login' ? 'Cadastre-se' : 'Entre'}
          </span>
        </p>
      </div>
    </div>
  )
}