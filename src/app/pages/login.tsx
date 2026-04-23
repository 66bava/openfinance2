import { useState, FormEvent } from "react";
import { useNavigate, Navigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  function toggleMode() {
    setIsSignUp((prev) => !prev);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nome,
            phone: telefone,
            birth_date: dataNascimento,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Salvar na tabela profiles se o usuário foi criado imediatamente
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          nome,
          telefone: telefone || null,
          data_nascimento: dataNascimento || null,
          plano: "free",
          renda_mensal: 0,
          meta_economia: 0,
        }, { onConflict: "id" });
      }

      setSuccessMessage(
        "Conta criada! Verifique seu e-mail para confirmar o cadastro."
      );
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    navigate("/");
  }

  const inputClass =
    "w-full bg-white text-black outline-none transition-colors px-3 py-2.5";
  const inputStyle = {
    fontSize: 14,
    borderRadius: 8,
    border: "1px solid #E0E0E0",
  } as React.CSSProperties;

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "#111111";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "#E0E0E0";
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F5F5F5" }}
    >
      <div
        className="w-full bg-white p-8"
        style={{
          maxWidth: isSignUp ? 400 : 360,
          borderRadius: 12,
          border: "1px solid #E0E0E0",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        }}
      >
        {/* Logo */}
        <div className="mb-7 text-center">
          <h1
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}
            className="text-black"
          >
            Open Finance
          </h1>
          <p style={{ fontSize: 13 }} className="text-[#777777] mt-1">
            {isSignUp ? "Crie sua conta gratuitamente" : "Entre na sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Campos extras apenas no cadastro */}
          {isSignUp && (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="nome"
                  style={{ fontSize: 13, fontWeight: 500 }}
                  className="text-[#333333]"
                >
                  Nome Completo *
                </label>
                <input
                  id="nome"
                  type="text"
                  autoComplete="name"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="telefone"
                  style={{ fontSize: 13, fontWeight: 500 }}
                  className="text-[#333333]"
                >
                  Telefone
                </label>
                <input
                  id="telefone"
                  type="tel"
                  autoComplete="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="dataNascimento"
                  style={{ fontSize: 13, fontWeight: 500 }}
                  className="text-[#333333]"
                >
                  Data de Nascimento
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div className="border-t border-[#F0F0F0] mt-1" />
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              style={{ fontSize: 13, fontWeight: 500 }}
              className="text-[#333333]"
            >
              E-mail *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              style={{ fontSize: 13, fontWeight: 500 }}
              className="text-[#333333]"
            >
              Senha *
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13 }} className="text-[#D32F2F]">
              {error}
            </p>
          )}
          {successMessage && (
            <p style={{ fontSize: 13 }} className="text-[#388E3C]">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            style={{ fontSize: 14, borderRadius: 8, padding: "10px 0", backgroundColor: "#111111" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#333333"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#111111"; }}
          >
            {loading
              ? isSignUp ? "Criando conta..." : "Entrando..."
              : isSignUp ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="text-center mt-5" style={{ fontSize: 13, color: "#777777" }}>
          {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-black font-semibold underline-offset-2 hover:underline"
            style={{ fontSize: 13 }}
          >
            {isSignUp ? "Entre" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
