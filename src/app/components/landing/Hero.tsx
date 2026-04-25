import { Link } from "react-router"
import { motion } from "motion/react"
import { CheckCircle2 } from "lucide-react"
import WaitlistForm from "./WaitlistForm"

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="hidden md:block"
    >
      <div style={{
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08)",
        border: "1px solid #E5E5E3",
      }}>
        {/* Browser bar */}
        <div style={{
          background: "#F5F5F0",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid #E5E5E3",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
          </div>
          <div style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: 5,
            padding: "4px 12px",
            fontSize: 11,
            color: "#A3A3A3",
            marginLeft: 8,
          }}>
            app.openfy.com.br/dashboard
          </div>
        </div>

        {/* Dashboard SVG */}
        <svg viewBox="0 0 580 380" width="100%" style={{ display: "block", maxWidth: 580 }}>
          <rect width="580" height="380" fill="#FAFAFA" />

          {/* Sidebar */}
          <rect width="58" height="380" fill="#0A0A0A" />
          <rect x="15" y="16" width="28" height="28" rx="6" fill="#16A34A" />
          <rect x="18" y="22" width="4" height="10" rx="1" fill="white" />
          <rect x="24" y="18" width="4" height="14" rx="1" fill="white" />
          <rect x="30" y="20" width="4" height="12" rx="1" fill="white" />
          {[60, 100, 140, 180, 220].map((y, i) => (
            <rect key={y} x="15" y={y} width="28" height="28" rx="6"
              fill={i === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)"} />
          ))}

          {/* Main header */}
          <rect x="58" y="0" width="522" height="46" fill="#FFFFFF" />
          <text x="78" y="28" style={{ fontSize: 13, fontWeight: "700", fill: "#0A0A0A", fontFamily: "system-ui" }}>
            Bom dia, Pedro 👋
          </text>
          <rect x="458" y="11" width="106" height="24" rx="6" fill="#0A0A0A" />
          <text x="511" y="28" textAnchor="middle" style={{ fontSize: 10, fill: "white", fontFamily: "system-ui", fontWeight: "600" }}>
            + Nova transação
          </text>

          {/* Score card */}
          <rect x="76" y="60" width="180" height="100" rx="10" fill="#0A0A0A" />
          <text x="92" y="82" style={{ fontSize: 8, fill: "rgba(255,255,255,0.45)", fontFamily: "system-ui" }}>
            Score de Saúde Financeira
          </text>
          <text x="92" y="118" style={{ fontSize: 34, fontWeight: "800", fill: "white", fontFamily: "system-ui", letterSpacing: "-1.5" }}>
            782
          </text>
          <rect x="92" y="132" width="120" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
          <rect x="92" y="132" width="94" height="4" rx="2" fill="#16A34A" />
          <text x="220" y="136" style={{ fontSize: 7, fill: "#16A34A", fontFamily: "system-ui" }}>Ótimo</text>
          <text x="240" y="98" textAnchor="end" style={{ fontSize: 8, fill: "#16A34A", fontFamily: "system-ui", fontWeight: "600" }}>
            +12 pts ↑
          </text>

          {/* Card receita */}
          <rect x="268" y="60" width="118" height="100" rx="10" fill="#FFFFFF" stroke="#E5E5E3" strokeWidth="1" />
          <text x="282" y="84" style={{ fontSize: 8, fill: "#A3A3A3", fontFamily: "system-ui" }}>Receita</text>
          <text x="282" y="108" style={{ fontSize: 14, fontWeight: "700", fill: "#0A0A0A", fontFamily: "system-ui", letterSpacing: "-0.5" }}>
            R$ 12.500
          </text>
          <text x="282" y="124" style={{ fontSize: 7, fill: "#16A34A", fontFamily: "system-ui" }}>+3,2% vs anterior</text>
          <text x="282" y="142" style={{ fontSize: 7, fill: "#A3A3A3", fontFamily: "system-ui" }}>abril 2026</text>

          {/* Card gastos */}
          <rect x="398" y="60" width="118" height="100" rx="10" fill="#FFFFFF" stroke="#E5E5E3" strokeWidth="1" />
          <text x="412" y="84" style={{ fontSize: 8, fill: "#A3A3A3", fontFamily: "system-ui" }}>Gastos</text>
          <text x="412" y="108" style={{ fontSize: 14, fontWeight: "700", fill: "#0A0A0A", fontFamily: "system-ui", letterSpacing: "-0.5" }}>
            R$ 6.890
          </text>
          <text x="412" y="124" style={{ fontSize: 7, fill: "#EF4444", fontFamily: "system-ui" }}>55,1% da receita</text>
          <text x="412" y="142" style={{ fontSize: 7, fill: "#A3A3A3", fontFamily: "system-ui" }}>abril 2026</text>

          {/* Gráfico categorias */}
          <rect x="76" y="176" width="210" height="148" rx="10" fill="#FFFFFF" stroke="#E5E5E3" strokeWidth="1" />
          <text x="92" y="198" style={{ fontSize: 9, fontWeight: "600", fill: "#0A0A0A", fontFamily: "system-ui" }}>
            Gastos por categoria
          </text>
          {[
            { label: "Moradia", pct: 0.72, val: "R$ 2.400" },
            { label: "Alimentação", pct: 0.48, val: "R$ 1.620" },
            { label: "Transporte", pct: 0.30, val: "R$ 980" },
            { label: "Lazer", pct: 0.16, val: "R$ 540" },
          ].map((cat, i) => (
            <g key={cat.label}>
              <text x="92" y={218 + i * 26} style={{ fontSize: 7, fill: "#A3A3A3", fontFamily: "system-ui" }}>
                {cat.label}
              </text>
              <rect x="92" y={222 + i * 26} width="130" height="5" rx="2" fill="#F5F5F5" />
              <rect x="92" y={222 + i * 26} width={130 * cat.pct} height="5" rx="2" fill="#16A34A"
                opacity={0.4 + cat.pct * 0.5} />
              <text x="228" y={226 + i * 26} style={{ fontSize: 7, fill: "#A3A3A3", fontFamily: "system-ui" }}>
                {cat.val}
              </text>
            </g>
          ))}

          {/* Transações recentes */}
          <rect x="298" y="176" width="218" height="148" rx="10" fill="#FFFFFF" stroke="#E5E5E3" strokeWidth="1" />
          <text x="314" y="198" style={{ fontSize: 9, fontWeight: "600", fill: "#0A0A0A", fontFamily: "system-ui" }}>
            Transações recentes
          </text>
          {[
            { nome: "Supermercado", val: "-R$ 320", cor: "#EF4444" },
            { nome: "Salário", val: "+R$ 12.500", cor: "#16A34A" },
            { nome: "Netflix", val: "-R$ 44,90", cor: "#EF4444" },
            { nome: "Uber", val: "-R$ 38", cor: "#EF4444" },
          ].map((tx, i) => (
            <g key={tx.nome}>
              <rect x="314" y={210 + i * 26} width="186" height="22" rx="4"
                fill={i % 2 === 0 ? "#FAFAFA" : "#FFFFFF"} />
              <circle cx="326" cy={221 + i * 26} r="6" fill="#F5F5F5" />
              <text x="337" y={219 + i * 26} style={{ fontSize: 7, fontWeight: "600", fill: "#0A0A0A", fontFamily: "system-ui" }}>
                {tx.nome}
              </text>
              <text x="337" y={227 + i * 26} style={{ fontSize: 6, fill: "#A3A3A3", fontFamily: "system-ui" }}>hoje</text>
              <text x="492" y={223 + i * 26} textAnchor="end"
                style={{ fontSize: 8, fontWeight: "700", fill: tx.cor, fontFamily: "system-ui" }}>
                {tx.val}
              </text>
            </g>
          ))}

          {/* IA insight bar */}
          <rect x="76" y="336" width="440" height="32" rx="8"
            fill="rgba(22,163,74,0.06)" stroke="rgba(22,163,74,0.18)" strokeWidth="1" />
          <text x="92" y="357" style={{ fontSize: 8, fill: "#16A34A", fontFamily: "system-ui", fontWeight: "600" }}>
            ✦ IA detectou R$ 180 em gastos recorrentes que você pode cancelar →
          </text>
        </svg>
      </div>
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section style={{
      backgroundColor: "#FFFFFF",
      padding: "100px 24px 80px",
      fontFamily: "var(--font-body)",
      overflow: "hidden",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{ display: "grid", gap: 64, alignItems: "center" }}
          className="grid grid-cols-1 md:grid-cols-2"
        >
          {/* Esquerda */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#DCFCE7",
              border: "1px solid #BBF7D0",
              borderRadius: 20,
              padding: "6px 14px",
              marginBottom: 28,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#16A34A",
                animation: "pulse 2s infinite",
              }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "#15803D" }}>
                Beta aberto · Acesso antecipado
              </span>
            </div>

            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 4.5vw, 60px)",
              fontWeight: 700,
              color: "#0A0A0A",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 24,
            }}>
              Sua saúde financeira em{" "}
              <span style={{ color: "#16A34A" }}>tempo real.</span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 1.4vw, 18px)",
              color: "#525252",
              lineHeight: 1.7,
              marginBottom: 36,
              maxWidth: 500,
            }}>
              O primeiro app brasileiro com Score de Saúde Financeira de 0 a 1000. Relatórios com IA, metas gamificadas e plano família.
            </p>

            <WaitlistForm fonte="hero" showCounter />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 20 }}>
              {["Grátis por 14 dias", "Sem cartão de crédito", "Cancele quando quiser"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} color="#16A34A" />
                  <span style={{ fontSize: 13, color: "#A3A3A3" }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 36,
              paddingTop: 28,
              borderTop: "1px solid #F5F5F5",
            }}>
              <p style={{
                fontSize: 13,
                color: "#A3A3A3",
                marginBottom: 12,
              }}>
                Já tem conta?{" "}
                <Link to="/login" style={{ color: "#0A0A0A", fontWeight: 600, textDecoration: "none" }}>
                  Entrar →
                </Link>
              </p>
            </div>
          </motion.div>

          {/* Direita */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
