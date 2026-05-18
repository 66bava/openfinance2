import { useMemo } from "react"
import { motion } from "motion/react"
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"
import { TrendingDown, PiggyBank, CreditCard, Zap } from "lucide-react"

function scoreColor(score: number): string {
  if (score >= 850) return "#16A34A"
  if (score >= 700) return "#84CC16"
  if (score >= 400) return "#F59E0B"
  return "#EF4444"
}

function scoreLabel(score: number): string {
  if (score >= 850) return "Excelente"
  if (score >= 700) return "Ótimo"
  if (score >= 400) return "Regular"
  return "Crítico"
}

function scoreDesc(score: number): string {
  if (score >= 850) return "Você está excelente! Continue assim."
  if (score >= 700) return "Boa saúde financeira. Há espaço para crescer."
  if (score >= 400) return "Atenção com seus gastos. Pequenas mudanças fazem diferença."
  return "Situação crítica. Priorize reduzir despesas agora."
}

function getNextAction(
  score: number,
  gastos: number,
  renda: number,
  poupancaPct: number,
  recurrentBurden: number
): { emoji: string; title: string; desc: string; accentColor: string } {
  if (renda > 0 && gastos > renda)
    return {
      emoji: "📉",
      title: "Reduza os gastos",
      desc: "Você está gastando mais do que ganha. Revise despesas não essenciais.",
      accentColor: "#EF4444",
    }
  if (recurrentBurden > 0.15)
    return {
      emoji: "✂️",
      title: "Revise assinaturas",
      desc: "Suas recorrências comprometem mais de 15% da renda. Cancele o que não usa.",
      accentColor: "#F59E0B",
    }
  if (poupancaPct < 10)
    return {
      emoji: "🎯",
      title: "Comece a poupar",
      desc: "Reserve pelo menos 10% da renda mensalmente para segurança financeira.",
      accentColor: "#F59E0B",
    }
  if (score < 700 && poupancaPct >= 15)
    return {
      emoji: "📈",
      title: "Hora de investir",
      desc: "Você tem margem para fazer o dinheiro crescer. Explore renda fixa.",
      accentColor: "#84CC16",
    }
  if (score >= 700 && score < 850)
    return {
      emoji: "🏦",
      title: "Diversifique",
      desc: "Excelente progresso! Diversifique para acelerar o crescimento do patrimônio.",
      accentColor: "#16A34A",
    }
  return {
    emoji: "🏆",
    title: "Mantenha o ritmo!",
    desc: "Saúde financeira excelente. Pense em metas de longo prazo.",
    accentColor: "#16A34A",
  }
}

interface ScorePanelProps {
  score: number
  totais: {
    totalGastos: number
    totalRenda: number
    percentualEconomia: number
  }
  subInfo: { totalMensal: number }
  finInfo: { totalMensal: number }
  evolucao: Array<{ month: string; income: number; expenses: number }>
  fmt: (v: number) => string
}

export function ScorePanel({ score, totais, subInfo, finInfo, evolucao, fmt }: ScorePanelProps) {
  const color = scoreColor(score)
  const label = scoreLabel(score)
  const desc = scoreDesc(score)

  const recurrentBurden =
    totais.totalRenda > 0 ? (subInfo.totalMensal + finInfo.totalMensal) / totais.totalRenda : 0

  const action = getNextAction(
    score,
    totais.totalGastos,
    totais.totalRenda,
    totais.percentualEconomia,
    recurrentBurden
  )

  const scoreTrend = useMemo(
    () =>
      evolucao.map((e) => {
        const pct = e.income > 0 ? Math.max(0, ((e.income - e.expenses) / e.income) * 100) : 0
        const poupanca = Math.min(pct * 20, 400)
        const eq = e.income > 0
          ? (e.expenses / e.income < 0.8 ? 300 : e.expenses / e.income < 1 ? 150 : 50)
          : 0
        return {
          month: e.month,
          score: Math.round(Math.min(Math.max(300 + poupanca + eq, 0), 1000)),
        }
      }),
    [evolucao]
  )

  // SVG semicircle gauge
  const pct = score / 1000
  const angle = pct * 180
  const rad = (angle * Math.PI) / 180
  const cx = 120, cy = 110, r = 88
  const x = cx + r * Math.cos(Math.PI - rad)
  const y = cy - r * Math.sin(Math.PI - rad)
  const largeArc = angle > 180 ? 1 : 0
  const burdenPct = Math.round(recurrentBurden * 100)

  const metricCards = [
    {
      Icon: TrendingDown,
      iconBg: "#FEE2E2",
      iconColor: "#EF4444",
      value: fmt(totais.totalGastos),
      label: "Gastos",
      valueColor: "var(--of-text)" as string,
    },
    {
      Icon: PiggyBank,
      iconBg: "#DCFCE7",
      iconColor: "#16A34A",
      value: `${totais.percentualEconomia.toFixed(0)}%`,
      label: "Poupança",
      valueColor: totais.percentualEconomia >= 20 ? "#16A34A" : "var(--of-text)",
    },
    {
      Icon: CreditCard,
      iconBg: burdenPct > 15 ? "#FEF3C7" : "var(--of-page-bg)",
      iconColor: burdenPct > 15 ? "#D97706" : "var(--of-text-secondary)",
      value: `${burdenPct}%`,
      label: "Fixos",
      valueColor: burdenPct > 15 ? "#D97706" : "var(--of-text)",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        background: "var(--of-surface)",
        borderRadius: 16,
        border: "1px solid var(--of-border)",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Gauge */}
      <div style={{ padding: "18px 18px 4px" }}>
        <p style={{
          fontSize: 10, fontWeight: 700,
          color: "var(--of-text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Score de Saúde Financeira
        </p>

        <svg viewBox="0 0 240 130" width="100%" style={{ display: "block", overflow: "visible" }}>
          <defs>
            <filter id="score-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="var(--of-border)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Filled arc */}
          {score > 0 && (
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="round"
              filter="url(#score-glow)"
            />
          )}

          {/* Needle dot */}
          <circle cx={x} cy={y} r="7" fill={color} filter="url(#score-glow)" />

          {/* Score number */}
          <text
            x={cx} y={cy - 18}
            textAnchor="middle"
            style={{ fontSize: 46, fontWeight: "800", fill: "var(--of-text)", fontFamily: "system-ui", letterSpacing: "-2" }}
          >
            {score}
          </text>
          <text
            x={cx} y={cy - 1}
            textAnchor="middle"
            style={{ fontSize: 10, fill: "var(--of-text-muted)", fontFamily: "system-ui" }}
          >
            de 1000
          </text>
          <text
            x={cx} y={cy + 17}
            textAnchor="middle"
            style={{ fontSize: 13, fontWeight: "800", fill: color, fontFamily: "system-ui" }}
          >
            {label}
          </text>

          <text x={cx - r + 2} y={cy + 23} style={{ fontSize: 9, fill: "var(--of-text-muted)", fontFamily: "system-ui" }}>0</text>
          <text x={cx + r - 18} y={cy + 23} style={{ fontSize: 9, fill: "var(--of-text-muted)", fontFamily: "system-ui" }}>1000</text>
        </svg>

        {/* Description phrase */}
        <p style={{
          fontSize: 12,
          color: "var(--of-text-muted)",
          textAlign: "center",
          lineHeight: 1.5,
          marginTop: -2,
          marginBottom: 14,
        }}>
          {desc}
        </p>

        {/* 3 Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
          {metricCards.map((card) => (
            <div
              key={card.label}
              style={{
                background: "var(--of-page-bg)",
                borderRadius: 10,
                padding: "10px 8px 8px",
                textAlign: "center",
              }}
            >
              <div style={{
                width: 26, height: 26,
                borderRadius: 7,
                background: card.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 6px",
              }}>
                <card.Icon size={13} color={card.iconColor} />
              </div>
              <p style={{
                fontSize: 11, fontWeight: 700,
                color: card.valueColor,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {card.value}
              </p>
              <p style={{ fontSize: 10, color: "var(--of-text-muted)", marginTop: 2 }}>
                {card.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Score trend sparkline */}
      {scoreTrend.length > 1 && (
        <div style={{ padding: "0 18px 12px" }}>
          <p style={{
            fontSize: 10, fontWeight: 700,
            color: "var(--of-text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            Tendência do score
          </p>
          <div style={{ height: 44 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={{
                        background: "var(--of-surface)",
                        border: "1px solid var(--of-border)",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 11,
                        color: "var(--of-text)",
                      }}>
                        Score: <strong>{payload[0].value}</strong>
                      </div>
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Next best action */}
      <div style={{
        margin: "0 14px 14px",
        background: action.accentColor + "14",
        border: `1px solid ${action.accentColor}33`,
        borderRadius: 12,
        padding: "11px 13px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 15 }}>{action.emoji}</span>
          <p style={{ fontSize: 12, fontWeight: 700, color: action.accentColor, flex: 1 }}>
            {action.title}
          </p>
          <Zap size={11} color={action.accentColor} style={{ opacity: 0.5, flexShrink: 0 }} />
        </div>
        <p style={{ fontSize: 11, color: "var(--of-text-muted)", lineHeight: 1.5 }}>
          {action.desc}
        </p>
      </div>
    </motion.div>
  )
}
