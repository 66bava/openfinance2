import { useState, useEffect, FormEvent } from "react"
import { Link, Navigate } from "react-router"
import { useAuth } from "../../lib/auth-context"
import { supabase } from "../../lib/supabase"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion"

// ─── Utility ─────────────────────────────────────────────────────────
async function saveEmailToWaitlist(
  email: string,
  fonte: string,
): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.from("waitlist").insert({ email, fonte })
  if (!error)
    return {
      success: true,
      message: "Você está na lista! Vamos te avisar no lançamento.",
    }
  if (error.code === "23505")
    return { success: false, message: "Este email já está na lista." }
  return { success: false, message: "Erro ao salvar. Tente novamente." }
}

// ─── WaitlistForm ────────────────────────────────────────────────────
function WaitlistForm({
  fonte = "landing",
  dark = false,
}: {
  fonte?: string
  dark?: boolean
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "exists" | "error"
  >("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    setStatus("loading")
    const result = await saveEmailToWaitlist(email, fonte)
    setMessage(result.message)
    setStatus(result.success ? "success" : result.message.includes("já está") ? "exists" : "error")
  }

  if (status === "success" || status === "exists") {
    return (
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: status === "success" ? (dark ? "rgba(74,222,128,0.15)" : "#F0FDF4") : (dark ? "rgba(251,191,36,0.15)" : "#FFFBEB"),
          borderRadius: 8,
          border: `1px solid ${status === "success" ? (dark ? "rgba(74,222,128,0.4)" : "#86EFAC") : (dark ? "rgba(251,191,36,0.4)" : "#FDE68A")}`,
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: status === "success" ? (dark ? "#4ADE80" : "#15803D") : (dark ? "#FBB724" : "#92400E"),
          }}
        >
          {status === "success" ? "✓ " : "→ "}
          {message}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu email"
        required
        style={{
          flex: 1,
          minWidth: 200,
          padding: "12px 16px",
          fontSize: 14,
          border: dark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #E0E0E0",
          borderRadius: 6,
          outline: "none",
          backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          color: dark ? "#FFFFFF" : "#111111",
        }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          padding: "12px 20px",
          backgroundColor: dark ? "#FFFFFF" : "#111111",
          color: dark ? "#111111" : "#FFFFFF",
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          borderRadius: 6,
          cursor: status === "loading" ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          opacity: status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? "Salvando..." : "Quero entrar na lista"}
      </button>
      {status === "error" && (
        <p style={{ fontSize: 12, color: dark ? "#FCA5A5" : "#DC2626", width: "100%" }}>
          {message}
        </p>
      )}
    </form>
  )
}

// ─── Exit Intent Modal ────────────────────────────────────────────────
function ExitIntentModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: "40px",
          maxWidth: 460,
          width: "100%",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            color: "#AAAAAA",
            lineHeight: 1,
            fontWeight: 300,
          }}
        >
          ×
        </button>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#999999",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Oferta de lançamento
        </p>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 10,
            lineHeight: 1.2,
          }}
        >
          Seja o primeiro a saber
        </h3>
        <p style={{ fontSize: 15, color: "#666666", marginBottom: 24, lineHeight: 1.6 }}>
          Entre na lista de espera e ganhe acesso antecipado com 3 meses do plano Pro sem custo.
        </p>
        <WaitlistForm fonte="modal" />
      </div>
    </div>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "#FFFFFF",
        borderBottom: scrolled ? "1px solid #F0F0F0" : "1px solid transparent",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
          }}
        >
          Open Finance
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a
            href="#precos"
            style={{ fontSize: 14, color: "#666666", textDecoration: "none" }}
            className="hidden sm:block hover:text-black transition-colors"
          >
            Preços
          </a>
          <a
            href="#faq"
            style={{ fontSize: 14, color: "#666666", textDecoration: "none" }}
            className="hidden sm:block hover:text-black transition-colors"
          >
            FAQ
          </a>
          <Link
            to="/login"
            style={{
              fontSize: 14,
              color: "#666666",
              textDecoration: "none",
            }}
            className="hover:text-black transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              backgroundColor: "#111111",
              padding: "8px 18px",
              borderRadius: 6,
              textDecoration: "none",
            }}
            className="hover:bg-[#333333] transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Dashboard Mockup SVG ─────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="hidden md:flex justify-center items-center">
      <svg
        viewBox="0 0 300 580"
        width="260"
        style={{
          filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.14))",
          flexShrink: 0,
        }}
      >
        {/* Phone shell */}
        <rect x="4" y="4" width="292" height="572" rx="38" fill="#1A1A1A" />
        <rect x="10" y="10" width="280" height="560" rx="33" fill="#F5F5F5" />

        {/* Notch */}
        <rect x="110" y="16" width="80" height="18" rx="9" fill="#1A1A1A" />

        {/* App bar */}
        <rect x="10" y="10" width="280" height="52" rx="33" fill="#FFFFFF" />
        <rect x="10" y="42" width="280" height="20" fill="#FFFFFF" />
        <text
          x="24"
          y="46"
          style={{
            fontSize: 13,
            fontWeight: "700",
            fill: "#111111",
            fontFamily: "system-ui",
          }}
        >
          Open Finance
        </text>
        <circle cx="262" cy="40" r="12" fill="#F0F0F0" />
        <text
          x="262"
          y="44"
          textAnchor="middle"
          style={{ fontSize: 11, fill: "#666666", fontFamily: "system-ui" }}
        >
          A
        </text>

        {/* Score card */}
        <rect x="20" y="72" width="260" height="110" rx="14" fill="#111111" />
        <text
          x="34"
          y="100"
          style={{
            fontSize: 10,
            fill: "rgba(255,255,255,0.55)",
            fontFamily: "system-ui",
          }}
        >
          Score de Saúde Financeira
        </text>
        <text
          x="34"
          y="136"
          style={{
            fontSize: 40,
            fontWeight: "800",
            fill: "#FFFFFF",
            fontFamily: "system-ui",
            letterSpacing: "-2",
          }}
        >
          820
        </text>
        <rect x="34" y="148" width="100" height="3" rx="2" fill="rgba(255,255,255,0.18)" />
        <rect x="34" y="148" width="82" height="3" rx="2" fill="#4ADE80" />
        <text
          x="142"
          y="151"
          style={{
            fontSize: 9,
            fill: "#4ADE80",
            fontFamily: "system-ui",
          }}
        >
          Excelente
        </text>
        <text
          x="236"
          y="100"
          textAnchor="end"
          style={{
            fontSize: 9,
            fill: "rgba(255,255,255,0.4)",
            fontFamily: "system-ui",
          }}
        >
          maio 2025
        </text>
        <text
          x="236"
          y="114"
          textAnchor="end"
          style={{
            fontSize: 11,
            fill: "#4ADE80",
            fontWeight: "600",
            fontFamily: "system-ui",
          }}
        >
          +12 pts
        </text>

        {/* Stats */}
        <rect x="20" y="194" width="124" height="68" rx="12" fill="#FFFFFF" />
        <text
          x="32"
          y="216"
          style={{ fontSize: 9, fill: "#999999", fontFamily: "system-ui" }}
        >
          Receita
        </text>
        <text
          x="32"
          y="237"
          style={{
            fontSize: 15,
            fontWeight: "700",
            fill: "#111111",
            fontFamily: "system-ui",
            letterSpacing: "-0.5",
          }}
        >
          R$ 5.200
        </text>
        <text
          x="32"
          y="252"
          style={{ fontSize: 9, fill: "#16A34A", fontFamily: "system-ui" }}
        >
          +3,2% vs mês anterior
        </text>

        <rect x="156" y="194" width="124" height="68" rx="12" fill="#FFFFFF" />
        <text
          x="168"
          y="216"
          style={{ fontSize: 9, fill: "#999999", fontFamily: "system-ui" }}
        >
          Gastos
        </text>
        <text
          x="168"
          y="237"
          style={{
            fontSize: 15,
            fontWeight: "700",
            fill: "#111111",
            fontFamily: "system-ui",
            letterSpacing: "-0.5",
          }}
        >
          R$ 3.140
        </text>
        <text
          x="168"
          y="252"
          style={{ fontSize: 9, fill: "#DC2626", fontFamily: "system-ui" }}
        >
          60,4% da receita
        </text>

        {/* Category bars */}
        <text
          x="20"
          y="286"
          style={{
            fontSize: 10,
            fontWeight: "600",
            fill: "#111111",
            fontFamily: "system-ui",
          }}
        >
          Por categoria
        </text>

        {[
          { label: "Moradia", pct: 0.78, val: "R$ 1.200" },
          { label: "Alimentação", pct: 0.52, val: "R$ 820" },
          { label: "Transporte", pct: 0.34, val: "R$ 340" },
          { label: "Lazer", pct: 0.18, val: "R$ 180" },
        ].map((cat, i) => (
          <g key={cat.label}>
            <text
              x="20"
              y={306 + i * 28}
              style={{ fontSize: 9, fill: "#666666", fontFamily: "system-ui" }}
            >
              {cat.label}
            </text>
            <rect
              x="20"
              y={310 + i * 28}
              width="200"
              height="5"
              rx="3"
              fill="#F0F0F0"
            />
            <rect
              x="20"
              y={310 + i * 28}
              width={200 * cat.pct}
              height="5"
              rx="3"
              fill="#111111"
              opacity={0.4 + cat.pct * 0.5}
            />
            <text
              x="228"
              y={315 + i * 28}
              style={{
                fontSize: 8,
                fill: "#999999",
                fontFamily: "system-ui",
              }}
            >
              {cat.val}
            </text>
          </g>
        ))}

        {/* Transactions header */}
        <text
          x="20"
          y="436"
          style={{
            fontSize: 10,
            fontWeight: "600",
            fill: "#111111",
            fontFamily: "system-ui",
          }}
        >
          Últimas transações
        </text>

        {[
          { label: "Supermercado Extra", val: "-R$ 245", color: "#DC2626" },
          { label: "Salário — Empresa", val: "+R$ 5.200", color: "#16A34A" },
          { label: "Uber", val: "-R$ 32", color: "#DC2626" },
        ].map((tx, i) => (
          <g key={tx.label}>
            <rect
              x="20"
              y={446 + i * 36}
              width="260"
              height="30"
              rx="8"
              fill={i % 2 === 0 ? "#FFFFFF" : "#F9F9F9"}
            />
            <circle
              cx="34"
              cy={461 + i * 36}
              r="8"
              fill={i % 2 === 0 ? "#F0F0F0" : "#E8E8E8"}
            />
            <text
              x="48"
              y={458 + i * 36}
              style={{
                fontSize: 9,
                fontWeight: "600",
                fill: "#111111",
                fontFamily: "system-ui",
              }}
            >
              {tx.label}
            </text>
            <text
              x="48"
              y={468 + i * 36}
              style={{ fontSize: 8, fill: "#AAAAAA", fontFamily: "system-ui" }}
            >
              hoje
            </text>
            <text
              x="272"
              y={463 + i * 36}
              textAnchor="end"
              style={{
                fontSize: 10,
                fontWeight: "700",
                fill: tx.color,
                fontFamily: "system-ui",
              }}
            >
              {tx.val}
            </text>
          </g>
        ))}

        {/* Home bar */}
        <rect x="110" y="558" width="80" height="3" rx="2" fill="#CCCCCC" />
      </svg>
    </div>
  )
}

// ─── Section 1: Hero ─────────────────────────────────────────────────
function LandingHero() {
  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "88px 24px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#999999",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Gestão financeira pessoal
            </p>
            <h1
              style={{
                fontSize: "clamp(30px, 4.5vw, 52px)",
                fontWeight: 700,
                color: "#111111",
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                marginBottom: 20,
              }}
            >
              Entenda seu dinheiro.
              <br />
              De verdade.
            </h1>
            <p
              style={{
                fontSize: "clamp(15px, 1.5vw, 17px)",
                color: "#555555",
                lineHeight: 1.65,
                marginBottom: 36,
                maxWidth: 500,
              }}
            >
              Saia do piloto automático financeiro. Open Finance organiza suas
              receitas, despesas e metas em um só lugar. Descubra o Score de
              Saúde Financeira que ninguém mais oferece.
            </p>
            <Link
              to="/login"
              style={{
                display: "inline-block",
                backgroundColor: "#111111",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                padding: "14px 32px",
                borderRadius: 6,
                textDecoration: "none",
                marginBottom: 12,
              }}
              className="hover:bg-[#333333] transition-colors w-full sm:w-auto text-center"
            >
              Começar agora — é grátis
            </Link>
            <p
              style={{
                fontSize: 13,
                color: "#AAAAAA",
                marginBottom: 36,
              }}
            >
              Sem cartão de crédito. Sem surpresas.
            </p>
            <div
              style={{
                paddingTop: 28,
                borderTop: "1px solid #F0F0F0",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "#AAAAAA",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                Ou entre na lista de espera
              </p>
              <WaitlistForm fonte="hero" />
            </div>
          </div>
          {/* Right */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

// ─── Section 2: Problemas ────────────────────────────────────────────
function LandingProblemas() {
  const cards = [
    {
      icon: "📊",
      title: "Você não sabe para onde vai seu dinheiro",
      text: "73% dos brasileiros não conseguem se lembrar de quanto gastaram no mês passado. E é quase impossível rastrear sem um sistema.",
    },
    {
      icon: "⚠️",
      title: "Nenhum app de verdade explica se você está bem",
      text: "Apps genéricos mostram gráficos bonitos. Ninguém mostra se você REALMENTE está saudável financeiramente.",
    },
    {
      icon: "🎯",
      title: "Metas viram promessas que você nunca cumpre",
      text: "Sem um plano real e acompanhamento diário, fica impossível juntar dinheiro para o que importa.",
    },
  ]

  return (
    <section style={{ backgroundColor: "#F9F9F9", padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#AAAAAA",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          O problema
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 56,
          }}
        >
          Por que é tão difícil controlar o dinheiro?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: "32px 28px",
                border: "1px solid #EBEBEB",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 20 }}>{card.icon}</div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111111",
                  marginBottom: 12,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {card.title}
              </h3>
              <p style={{ fontSize: 14, color: "#666666", lineHeight: 1.65 }}>
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 3: Solução ──────────────────────────────────────────────
function LandingSolucao() {
  const steps = [
    {
      num: "1",
      title: "Registre seus gastos",
      desc: "Cada vez que você gasta, registra aqui. Toma 10 segundos. Você vê em tempo real para onde vai o dinheiro.",
    },
    {
      num: "2",
      title: "Seu Score de Saúde aparece",
      desc: "Open Finance calcula automaticamente seu Score (0–1000). Vermelho = crítico. Amarelo = regular. Verde = excelente.",
    },
    {
      num: "3",
      title: "Cumpra suas metas",
      desc: "Defina uma meta ('Viagem em 6 meses'). Open Finance mostra quanto você precisa guardar por mês. Simples assim.",
    },
  ]

  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#AAAAAA",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Como funciona
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 64,
          }}
        >
          Assim funciona o Open Finance
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.num}>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  color: "#F0F0F0",
                  lineHeight: 1,
                  marginBottom: 16,
                  letterSpacing: "-0.04em",
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#111111",
                  marginBottom: 10,
                  letterSpacing: "-0.01em",
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: 14, color: "#666666", lineHeight: 1.65 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 4: Diferencial ──────────────────────────────────────────
function LandingDiferencial() {
  const rows = [
    { feature: "Score de Saúde Financeira", of: true, mob: false, org: false },
    { feature: "Modo Missão (Metas)", of: true, mob: true, org: true },
    { feature: "IA explicando seus gastos", of: true, mob: false, org: false },
    { feature: "Plano Família (4 perfis)", of: true, mob: false, org: false },
    { feature: "Gratuito para começar", of: true, mob: true, org: true },
    { feature: "Design moderno", of: true, mob: false, org: true },
  ]

  return (
    <section id="diferencial" style={{ backgroundColor: "#F9F9F9", padding: "80px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#AAAAAA",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Comparativo
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 48,
          }}
        >
          Por que Open Finance é diferente
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#999999",
                    borderBottom: "1px solid #E8E8E8",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Funcionalidade
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111111",
                    borderBottom: "2px solid #111111",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open Finance
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#999999",
                    borderBottom: "1px solid #E8E8E8",
                  }}
                >
                  Mobills
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#999999",
                    borderBottom: "1px solid #E8E8E8",
                  }}
                >
                  Organizze
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} style={{ backgroundColor: i % 2 === 0 ? "#FFFFFF" : "transparent" }}>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "#333333",
                      borderBottom: "1px solid #F0F0F0",
                    }}
                  >
                    {row.feature}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "14px 20px",
                      fontSize: 16,
                      borderBottom: "1px solid #F0F0F0",
                    }}
                  >
                    {row.of ? (
                      <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span>
                    ) : (
                      <span style={{ color: "#CCCCCC" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "14px 20px",
                      fontSize: 16,
                      borderBottom: "1px solid #F0F0F0",
                    }}
                  >
                    {row.mob ? (
                      <span style={{ color: "#AAAAAA" }}>✓</span>
                    ) : (
                      <span style={{ color: "#DDDDDD" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "14px 20px",
                      fontSize: 16,
                      borderBottom: "1px solid #F0F0F0",
                    }}
                  >
                    {row.org ? (
                      <span style={{ color: "#AAAAAA" }}>✓</span>
                    ) : (
                      <span style={{ color: "#DDDDDD" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ─── Section 5: Depoimentos ──────────────────────────────────────────
function LandingDepoimentos() {
  const testimonials = [
    {
      quote:
        "Entendi pela primeira vez por que meu dinheiro acaba. Open Finance foi a revolução que minha vida financeira precisava.",
      name: "Ana Paula",
      age: "28 anos",
      initial: "A",
    },
    {
      quote:
        "Usei vários apps. Nenhum tinha esse Score de Saúde. Virou meu termômetro financeiro pessoal.",
      name: "Carlos",
      age: "34 anos",
      initial: "C",
    },
    {
      quote:
        "Finalmente um app que fala português normal. Sem jargão bancário chato.",
      name: "Mariana",
      age: "26 anos",
      initial: "M",
    },
  ]

  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#AAAAAA",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Depoimentos
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 56,
          }}
        >
          O que os usuários dizem
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                backgroundColor: "#F9F9F9",
                borderRadius: 12,
                padding: "28px 24px",
                border: "1px solid #F0F0F0",
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  color: "#333333",
                  lineHeight: 1.65,
                  marginBottom: 24,
                  fontStyle: "italic",
                }}
              >
                "{t.quote}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    backgroundColor: "#111111",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {t.initial}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111111",
                    }}
                  >
                    {t.name}
                  </p>
                  <p style={{ fontSize: 12, color: "#AAAAAA" }}>{t.age}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 6: Planos ───────────────────────────────────────────────
function LandingPlanos() {
  return (
    <section
      id="precos"
      style={{ backgroundColor: "#F9F9F9", padding: "80px 24px" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#AAAAAA",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Preços
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          Planos para todos
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: 15,
            color: "#666666",
            marginBottom: 56,
          }}
        >
          Comece grátis. Evolua quando quiser.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: "32px 28px",
              border: "1px solid #E8E8E8",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#999999",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Free
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#111111",
                letterSpacing: "-0.03em",
                marginBottom: 4,
              }}
            >
              Gratuito
            </p>
            <p
              style={{ fontSize: 13, color: "#AAAAAA", marginBottom: 28 }}
            >
              Para começar
            </p>
            <div
              style={{
                borderTop: "1px solid #F0F0F0",
                paddingTop: 24,
                marginBottom: 28,
              }}
            >
              {[
                "30 transações/mês",
                "3 categorias personalizadas",
                "Histórico de 3 meses",
                "Score de Saúde básico",
              ].map((f) => (
                <p
                  key={f}
                  style={{
                    fontSize: 14,
                    color: "#444444",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
            <Link
              to="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "#555555",
                border: "1.5px solid #E0E0E0",
                borderRadius: 6,
                textDecoration: "none",
              }}
              className="hover:border-[#111111] hover:text-black transition-colors"
            >
              Começar agora
            </Link>
          </div>

          {/* Pro */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: "32px 28px",
              border: "2px solid #111111",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -13,
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#111111",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 14px",
                borderRadius: 20,
                whiteSpace: "nowrap",
                letterSpacing: "0.04em",
              }}
            >
              MAIS POPULAR
            </div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#111111",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Pro
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#111111",
                  letterSpacing: "-0.03em",
                }}
              >
                R$ 19,90
              </p>
            </div>
            <p
              style={{ fontSize: 13, color: "#AAAAAA", marginBottom: 28 }}
            >
              por mês
            </p>
            <div
              style={{
                borderTop: "1px solid #F0F0F0",
                paddingTop: 24,
                marginBottom: 28,
              }}
            >
              {[
                "Transações ilimitadas",
                "Categorias ilimitadas",
                "Histórico completo",
                "Score + Análise de IA",
                "Relatórios PDF/Excel",
                "Sem anúncios",
              ].map((f) => (
                <p
                  key={f}
                  style={{
                    fontSize: 14,
                    color: "#444444",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
            <Link
              to="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#FFFFFF",
                backgroundColor: "#111111",
                borderRadius: 6,
                textDecoration: "none",
              }}
              className="hover:bg-[#333333] transition-colors"
            >
              Assinar Pro
            </Link>
          </div>

          {/* Família */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: "32px 28px",
              border: "1px solid #E8E8E8",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#999999",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Família
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#111111",
                letterSpacing: "-0.03em",
                marginBottom: 4,
              }}
            >
              R$ 34,90
            </p>
            <p
              style={{ fontSize: 13, color: "#AAAAAA", marginBottom: 28 }}
            >
              /mês para até 4 pessoas
            </p>
            <div
              style={{
                borderTop: "1px solid #F0F0F0",
                paddingTop: 24,
                marginBottom: 28,
              }}
            >
              {[
                "Tudo do Pro",
                "4 perfis com dados separados",
                "Visão consolidada da família",
                "Metas compartilhadas",
              ].map((f) => (
                <p
                  key={f}
                  style={{
                    fontSize: 14,
                    color: "#444444",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
            <Link
              to="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "#555555",
                border: "1.5px solid #E0E0E0",
                borderRadius: 6,
                textDecoration: "none",
              }}
              className="hover:border-[#111111] hover:text-black transition-colors"
            >
              Assinar Família
            </Link>
          </div>
        </div>

        {/* Waitlist below plans */}
        <div
          style={{
            marginTop: 48,
            padding: "28px 32px",
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            border: "1px solid #E8E8E8",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
          className="md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111111",
                marginBottom: 4,
              }}
            >
              Ainda não tem certeza?
            </p>
            <p style={{ fontSize: 13, color: "#888888" }}>
              Entre na lista de espera e seja avisado sobre novidades e promoções.
            </p>
          </div>
          <div style={{ flexShrink: 0, width: "100%", maxWidth: 420 }}>
            <WaitlistForm fonte="planos" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section 7: FAQ ──────────────────────────────────────────────────
function LandingFAQ() {
  const faqs = [
    {
      q: "Meus dados financeiros são seguros no Open Finance?",
      a: "Sim. Usamos Supabase com criptografia em repouso, autenticação segura e políticas de acesso restrito. Você tem controle total sobre seus dados e pode exportar ou deletar quando quiser. Leia nossa Política de Privacidade para detalhes técnicos.",
    },
    {
      q: "Funciona no celular?",
      a: "Sim! Open Finance funciona perfeitamente no navegador do celular. Estamos trabalhando em um app nativo para iOS e Android. Por enquanto, use pelo navegador ou instale como Progressive Web App (PWA) — fica como um app de verdade.",
    },
    {
      q: "Posso cancelar a assinatura Pro quando quiser?",
      a: "Claro. Cancele quando quiser, sem multa ou período de carência. Você terá acesso até o fim do ciclo pago e depois volta automaticamente para o plano Free.",
    },
    {
      q: "O que é esse Score de Saúde Financeira?",
      a: "É um número de 0 a 1000 que Open Finance calcula baseado na sua renda, despesas, economia e consistência. Quanto maior, melhor sua saúde financeira. Nenhum outro app oferece isso — é nosso diferencial.",
    },
    {
      q: "Preciso de um cartão de crédito para começar?",
      a: "Não! Você começa de graça com o plano Free. Se quiser assinar o Pro depois, aceitamos cartão de crédito, PIX e boleto.",
    },
    {
      q: "Como funciona o Plano Família?",
      a: "Uma assinatura única (R$ 34,90/mês) para até 4 membros da família. Cada um tem seu próprio perfil e dados privados. O administrador vê um dashboard consolidado com os gastos de todos. Perfeito para pais que querem ensinar os filhos sobre dinheiro.",
    },
  ]

  return (
    <section
      id="faq"
      style={{ backgroundColor: "#FFFFFF", padding: "80px 24px" }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#AAAAAA",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Dúvidas
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 48,
          }}
        >
          Perguntas frequentes
        </h2>
        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger
                className="no-underline hover:no-underline text-left"
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#111111",
                  paddingTop: 20,
                  paddingBottom: 20,
                }}
              >
                {faq.q}
              </AccordionTrigger>
              <AccordionContent>
                <p
                  style={{
                    fontSize: 14,
                    color: "#666666",
                    lineHeight: 1.7,
                    paddingBottom: 8,
                  }}
                >
                  {faq.a}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

// ─── Section 8: CTA Final ────────────────────────────────────────────
function LandingCTA() {
  return (
    <section
      style={{
        backgroundColor: "#111111",
        padding: "96px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "clamp(26px, 4vw, 44px)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            marginBottom: 16,
          }}
        >
          Comece hoje. É grátis.
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.55)",
            marginBottom: 40,
          }}
        >
          Sem cartão de crédito. Sem surpresas. Sem compromisso.
        </p>
        <Link
          to="/login"
          style={{
            display: "inline-block",
            backgroundColor: "#FFFFFF",
            color: "#111111",
            fontSize: 15,
            fontWeight: 700,
            padding: "16px 40px",
            borderRadius: 6,
            textDecoration: "none",
            marginBottom: 32,
          }}
          className="hover:bg-[#F0F0F0] transition-colors"
        >
          Cadastre-se agora
        </Link>
        <div style={{ marginTop: 8 }}>
          <WaitlistForm fonte="cta-final" dark />
        </div>
      </div>
    </section>
  )
}

// ─── Section 9: Footer ───────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer style={{ backgroundColor: "#1F2937", padding: "56px 24px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 12,
                letterSpacing: "-0.02em",
              }}
            >
              Open Finance
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
              Gestão financeira pessoal simples, bonita e inteligente.
            </p>
          </div>

          {/* Legal */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Legal
            </p>
            {[
              { label: "Privacidade", to: "/privacidade" },
              { label: "Termos de Uso", to: "/termos" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: "block",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  marginBottom: 10,
                }}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Produto */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Produto
            </p>
            {[
              { label: "Recursos", href: "#diferencial" },
              { label: "Preços", href: "#precos" },
              { label: "FAQ", href: "#faq" },
              { label: "Blog (em breve)", href: "#" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  display: "block",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  marginBottom: 10,
                }}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Contato */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Contato
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
              suporte@openfinance.app
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {["Instagram", "LinkedIn", "Twitter"].map((social) => (
                <a
                  key={social}
                  href="#"
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                  }}
                  className="hover:text-white transition-colors"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 24,
          }}
        >
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            © 2025 Open Finance. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading } = useAuth()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (loading || user) return
    const timer = setTimeout(() => setShowModal(true), 10000)
    return () => clearTimeout(timer)
  }, [loading, user])

  if (loading) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {showModal && <ExitIntentModal onClose={() => setShowModal(false)} />}
      <LandingNav />
      <LandingHero />
      <LandingProblemas />
      <LandingSolucao />
      <LandingDiferencial />
      <LandingDepoimentos />
      <LandingPlanos />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  )
}
