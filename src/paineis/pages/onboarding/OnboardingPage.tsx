import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "../../../lib/auth-context"
import { upsertProfile } from "../../../lib/queries"
import {
  defaultFinancialSettings,
  getUserFinancialSettings,
  upsertUserFinancialSettings,
} from "../../../lib/queries/financial-settings"
import { getTransactionProvider } from "../../../services/open-finance"

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function formatMoneyInputBRL(value: string) {
  const digits = onlyDigits(value)
  if (!digits) return ""
  const n = Number.parseInt(digits, 10) / 100
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMoneyInputBRL(value: string): number {
  if (!value) return 0
  const normalized = value.replace(/\./g, "").replace(",", ".")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

function clampDay(day: number) {
  if (!Number.isFinite(day)) return 5
  return Math.max(1, Math.min(31, Math.trunc(day)))
}

type Objective =
  | "organizar"
  | "economizar"
  | "quitar_dividas"
  | "investir"
  | "comprar_bem"
  | "reserva_emergencia"

type FinancialProfile =
  | "iniciante"
  | "equilibrado"
  | "planejador"
  | "investidor"

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [connections, setConnections] = useState<Array<{ name: string; detail: string; status: "connected" | "pending" }>>([])
  const [syncing, setSyncing] = useState(false)

  const [nome, setNome] = useState(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""
  )
  const [telefone, setTelefone] = useState("")
  const [rendaRaw, setRendaRaw] = useState("")
  const [paydayDay, setPaydayDay] = useState(5)
  const [objective, setObjective] = useState<Objective>("organizar")
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>("equilibrado")

  const stepsLabel = useMemo(
    () => [
      { n: 2, title: "Dados básicos" },
      { n: 3, title: "Renda mensal" },
      { n: 4, title: "Dia de pagamento" },
      { n: 5, title: "Objetivo financeiro" },
      { n: 6, title: "Perfil financeiro" },
      { n: 7, title: "Finalização" },
    ],
    []
  )

  useEffect(() => {
    if (!user) return

    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        if (step === 0) setStep(1)
        else if (step === 1 && !syncing) setStep(2)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, syncing, user])

  useEffect(() => {
    if (!user) return
    if (step !== 1) return

    const provider = getTransactionProvider()
    setSyncing(true)

    provider
      .listConnections(user.id)
      .then((conns) => {
        setConnections(
          conns.map((c) => ({
            name: c.institution.name,
            detail: "Conta · 90 dias · transações importadas",
            status: c.status === "pending" ? "pending" : "connected",
          }))
        )
      })
      .catch(() => setConnections([]))
      .finally(() => {
        window.setTimeout(() => setSyncing(false), 1800)
      })
  }, [step, user?.id])

  if (!user) return null

  async function skip() {
    setLoading(true)
    try {
      await upsertProfile(user.id, user.email!, { onboarding_completo: true })
    } finally {
      navigate("/app", { replace: true })
      setLoading(false)
    }
  }

  async function saveAndNext(next: Step) {
    setError(null)
    setLoading(true)
    try {
      if (step === 2) {
        await upsertProfile(user.id, user.email!, {
          nome: nome.trim() || undefined,
          telefone: telefone.trim() || undefined,
          meta_economia: 20,
        })
      }

      if (step === 3) {
        const renda = parseMoneyInputBRL(rendaRaw)
        if (renda <= 0) throw new Error("Informe sua renda mensal para continuar.")
        await upsertProfile(user.id, user.email!, { renda_mensal: renda })
      }

      if (step === 4) {
        const payday = clampDay(paydayDay)
        const current =
          (await getUserFinancialSettings(user.id).catch(() => defaultFinancialSettings(user.id)))
        await upsertUserFinancialSettings(user.id, {
          payday_day: payday,
          reset_day: current.reset_day,
          recurring_post_day: current.recurring_post_day,
          cycle_start_day: payday,
          timezone: current.timezone || "America/Sao_Paulo",
        })
      }

      if (step === 5) {
        await upsertProfile(user.id, user.email!, { objetivo_financeiro: objective })
      }

      if (step === 6) {
        await upsertProfile(user.id, user.email!, { perfil_financeiro: financialProfile })
      }

      if (step === 7) {
        await upsertProfile(user.id, user.email!, { onboarding_completo: true })
        navigate("/app", { replace: true })
        return
      }

      setStep(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--of-page-bg)" }}>
      <div className="mx-auto w-full max-w-[960px]">
        <div className="rounded-[28px] border p-6 md:p-10" style={{ background: "var(--of-surface)", borderColor: "var(--of-border)" }}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step <= 1 ? navigate("/login", { replace: true }) : setStep((s) => (Math.max(0, (s - 1) as Step) as Step)))}
              className="text-[13px] font-extrabold"
              style={{ color: "var(--of-text-secondary)" }}
              disabled={loading}
            >
              ← {step <= 1 ? "Sair" : "Voltar"}
            </button>
            <button
              type="button"
              onClick={skip}
              className="text-[13px] font-extrabold"
              style={{ color: "var(--of-text-secondary)" }}
              disabled={loading}
            >
              Pular
            </button>
          </div>

          {step <= 1 ? null : (
            <div className="mt-6 flex flex-wrap gap-2">
              {stepsLabel.map((s) => {
                const active = s.n === step
                const done = s.n < step
                return (
                  <span
                    key={s.n}
                    className="rounded-full border px-3 py-1.5 text-[11px] font-extrabold"
                    style={{
                      borderColor: "var(--of-border)",
                      background: active ? "rgba(22,163,74,0.12)" : done ? "rgba(22,163,74,0.06)" : "var(--of-page-bg)",
                      color: active ? "var(--of-text)" : "var(--of-text-secondary)",
                    }}
                  >
                    {s.title}
                  </span>
                )
              })}
            </div>
          )}

          {step === 0 && (
            <div className="mt-12">
              <div className="text-[13px] font-semibold" style={{ color: "var(--of-text-secondary)" }}>
                Olá, {nome || "Pedro"}.
              </div>
              <div className="mt-2 text-[44px] font-semibold tracking-[-0.04em]" style={{ color: "var(--of-text)" }}>
                Bem-vindo.
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-10 w-full rounded-2xl px-4 py-4 text-[14px] font-extrabold"
                style={{ background: "#16A34A", color: "#fff" }}
              >
                Conectar minhas contas
              </button>
              <div className="mt-5 text-center text-[12px] font-semibold" style={{ color: "var(--of-text-muted)" }}>
                Pressione <span className="rounded-md border px-2 py-0.5" style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)", color: "var(--of-text-secondary)" }}>Enter</span> para continuar
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-10">
              <div className="text-[14px] font-extrabold" style={{ color: "var(--of-text)" }}>
                Conexões bancárias
              </div>
              <div className="mt-6 space-y-3">
                {connections.map((c) => (
                  <div key={c.name} className="rounded-2xl border px-4 py-3"
                    style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-extrabold" style={{ color: "var(--of-text)" }}>{c.name}</div>
                        <div className="mt-1 text-[12px] font-semibold" style={{ color: "var(--of-text-muted)" }}>{c.detail}</div>
                      </div>
                      <div className="shrink-0 text-[12px] font-extrabold" style={{ color: c.status === "connected" ? "#16A34A" : "var(--of-text-muted)" }}>
                        {c.status === "connected" ? "OK" : "..." }
                      </div>
                    </div>
                  </div>
                ))}
                {!connections.length ? (
                  <div
                    className="rounded-2xl border px-4 py-4"
                    style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)" }}
                  >
                    <div className="text-[13px] font-extrabold" style={{ color: "var(--of-text)" }}>
                      Open Finance (em breve)
                    </div>
                    <div className="mt-2 text-[12px] font-semibold" style={{ color: "var(--of-text-muted)", lineHeight: 1.6 }}>
                      Ainda não temos conexão bancária automática ativa neste ambiente. Quando liberarmos, você nunca vai compartilhar senha bancária com a Openfy:
                      o acesso acontece por autorização (consentimento) no seu próprio banco.
                    </div>
                    <div className="mt-3 text-[12px] font-semibold" style={{ color: "var(--of-text-muted)" }}>
                      Por enquanto, registre por texto, foto de recibo ou manual — e continue normalmente.
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 text-[12px] font-semibold" style={{ color: "var(--of-text-muted)" }}>
                {connections.length ? (syncing ? "Aguarde, quase pronto…" : "Conexão pronta.") : "Nenhuma conta conectada."}
              </div>
              <div className="mt-2 text-[12px]" style={{ color: "var(--of-text-muted)" }}>
                Você pode revogar o acesso a qualquer momento
              </div>

              <button
                type="button"
                disabled={syncing || loading}
                onClick={() => setStep(2)}
                className="mt-8 w-full rounded-2xl px-4 py-4 text-[14px] font-extrabold disabled:opacity-60"
                style={{ background: "#16A34A", color: "#fff" }}
              >
                {syncing ? "Sincronizando..." : "Continuar"}
              </button>
            </div>
          )}

          {step >= 2 && (
            <div className="mt-10">
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[12px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>Nome</label>
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                      style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)", color: "var(--of-text)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>Telefone (opcional)</label>
                    <input
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                      style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)", color: "var(--of-text)" }}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <label className="text-[12px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>Renda mensal</label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border px-4 py-3"
                    style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)" }}
                  >
                    <span className="text-[13px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>R$</span>
                    <input
                      value={rendaRaw}
                      onChange={(e) => setRendaRaw(formatMoneyInputBRL(e.target.value))}
                      placeholder="0,00"
                      inputMode="numeric"
                      className="w-full bg-transparent text-[13px] font-semibold outline-none"
                      style={{ color: "var(--of-text)" }}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <label className="text-[12px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>Dia de pagamento</label>
                  <input
                    value={paydayDay}
                    onChange={(e) => setPaydayDay(clampDay(Number.parseInt(e.target.value || "5", 10) || 5))}
                    type="number"
                    min={1}
                    max={31}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-[13px] font-semibold outline-none"
                    style={{ borderColor: "var(--of-border)", background: "var(--of-page-bg)", color: "var(--of-text)" }}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-2">
                  <div className="text-[12px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>Objetivo financeiro</div>
                  {([
                    { id: "organizar", title: "Organizar minhas finanças" },
                    { id: "economizar", title: "Economizar mais" },
                    { id: "quitar_dividas", title: "Quitar dívidas" },
                    { id: "investir", title: "Começar/otimizar investimentos" },
                    { id: "comprar_bem", title: "Comprar um bem (carro/casa/etc.)" },
                    { id: "reserva_emergencia", title: "Montar reserva de emergência" },
                  ] as Array<{ id: Objective; title: string }>).map((o) => {
                    const selected = objective === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setObjective(o.id)}
                        className="w-full rounded-2xl border px-4 py-3 text-left text-[13px] font-extrabold"
                        style={{
                          borderColor: selected ? "#16A34A" : "var(--of-border)",
                          background: selected ? "rgba(22,163,74,0.10)" : "var(--of-page-bg)",
                          color: "var(--of-text)",
                        }}
                      >
                        {o.title}
                      </button>
                    )
                  })}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-2">
                  <div className="text-[12px] font-extrabold" style={{ color: "var(--of-text-muted)" }}>Perfil financeiro</div>
                  {([
                    { id: "iniciante", title: "Iniciante (quero simplificar e começar do zero)" },
                    { id: "equilibrado", title: "Equilibrado (tenho controle parcial, quero melhorar)" },
                    { id: "planejador", title: "Planejador (metas claras e foco em consistência)" },
                    { id: "investidor", title: "Investidor (quero otimizar e acompanhar evolução)" },
                  ] as Array<{ id: FinancialProfile; title: string }>).map((p) => {
                    const selected = financialProfile === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFinancialProfile(p.id)}
                        className="w-full rounded-2xl border px-4 py-3 text-left text-[13px] font-extrabold"
                        style={{
                          borderColor: selected ? "#16A34A" : "var(--of-border)",
                          background: selected ? "rgba(22,163,74,0.10)" : "var(--of-page-bg)",
                          color: "var(--of-text)",
                        }}
                      >
                        {p.title}
                      </button>
                    )
                  })}
                </div>
              )}

              {step === 7 && (
                <div>
                  <div className="text-[20px] font-extrabold" style={{ color: "var(--of-text)" }}>Finalização</div>
                  <div className="mt-2 text-[13px]" style={{ color: "var(--of-text-secondary)" }}>
                    Pronto. Vamos para o dashboard.
                  </div>
                </div>
              )}

              {error ? (
                <div className="mt-4 text-[12px] font-semibold" style={{ color: "#EF4444" }}>{error}</div>
              ) : null}

              <button
                type="button"
                onClick={() => saveAndNext((Math.min(7, (step + 1) as number) as Step))}
                disabled={loading}
                className="mt-8 w-full rounded-2xl px-4 py-4 text-[14px] font-extrabold disabled:opacity-60"
                style={{ background: "#16A34A", color: "#fff" }}
              >
                {loading ? "Salvando..." : step === 7 ? "Finalizar" : "Continuar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
