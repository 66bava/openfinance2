import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  CalendarDays, CheckCircle2, Banknote, QrCode, ArrowLeftRight, CreditCard, Smartphone,
  ChevronDown, Plus, Layers,
} from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { useLanguage } from "../../lib/language-context"
import { addTransacao, getProfile } from "../../lib/queries"
import { getCartoes, getFaturaAtual, recalcularFatura } from "../../lib/queries/cartoes"
import { getCategoriasAtivas, criarCategoria } from "../../lib/queries/categorias"
import { supabase } from "../../lib/supabase"
import { valorSchema } from "../../lib/validations"
import ModalNovaCategoria from "../components/categorias/ModalNovaCategoria"
import type { Cartao, MetodoPagamento, Categoria } from "../../lib/types"

const METODOS: { valor: MetodoPagamento; icon: React.ElementType; labelKey: string }[] = [
  { valor: "dinheiro", icon: Banknote, labelKey: "Dinheiro" },
  { valor: "pix", icon: QrCode, labelKey: "PIX" },
  { valor: "transferencia", icon: ArrowLeftRight, labelKey: "Transferência" },
  { valor: "debito", icon: CreditCard, labelKey: "Débito" },
  { valor: "credito", icon: Smartphone, labelKey: "Crédito" },
]

const sectionStyle: React.CSSProperties = {
  background: "var(--of-surface)",
  borderRadius: 12,
  border: "1px solid var(--of-border)",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--of-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 10,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--of-border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--of-text)",
  background: "transparent",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
}

export default function AddExpense() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [metodo, setMetodo] = useState<MetodoPagamento | "">("")
  const [cartaoId, setCartaoId] = useState<string>("")
  const [confirmado, setConfirmado] = useState(true)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parcelado, setParcelado] = useState(false)
  const [numParcelas, setNumParcelas] = useState(2)

  const [cats, setCats] = useState<Categoria[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [catsOpen, setCatsOpen] = useState(false)
  const [modalNovaCat, setModalNovaCat] = useState(false)
  const [plano, setPlano] = useState("free")
  const catRef = useRef<HTMLDivElement>(null)

  const carregarCats = useCallback(async () => {
    if (!user) return
    setLoadingCats(true)
    try {
      const lista = await getCategoriasAtivas(user.id)
      setCats(lista)
    } catch {
      // silent
    } finally {
      setLoadingCats(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    getCartoes(user.id).then(setCartoes).catch(console.error)
    getProfile(user.id).then((p) => setPlano(p?.plano ?? "free")).catch(console.error)
    carregarCats()
  }, [user, carregarCats])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatsOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const catsFiltradas = cats.filter((c) => c.tipo === "despesa")
  const catsPadrao = catsFiltradas.filter((c) => c.is_padrao)
  const catsMinhas = catsFiltradas.filter((c) => !c.is_padrao && c.user_id === user?.id)
  const catSelecionada = cats.find((c) => c.id === categoriaId)

  useEffect(() => {
    if (metodo === "credito") {
      setConfirmado(false)
    } else if (metodo === "debito") {
      setConfirmado(true)
    }
    if (metodo !== "credito" && metodo !== "debito") {
      setCartaoId("")
    }
  }, [metodo])

  const cartoesDoTipo = cartoes.filter((c) =>
    metodo === "credito" ? c.tipo === "credito" : c.tipo === "debito"
  )

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "")
    setAmount(raw)
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }))
  }

  const displayAmount = amount
    ? (parseInt(amount) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : ""

  const handleSalvarNovaCat = async (dados: { nome: string; tipo: "receita" | "despesa"; icone: string; cor: string }) => {
    try {
      const nova = await criarCategoria(user!.id, plano, dados)
      setModalNovaCat(false)
      await carregarCats()
      setCategoriaId(nova.id)
      setErrors((prev) => ({ ...prev, category: "" }))
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "LIMITE_ATINGIDO") {
        setModalNovaCat(false)
        toast.error("Limite de categorias atingido", {
          description: "Faça upgrade para Pro para criar categorias ilimitadas.",
          action: { label: "Ver planos", onClick: () => navigate("/app/perfil") },
        })
      } else {
        toast.error("Erro ao criar categoria.")
      }
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const valorResult = valorSchema.safeParse(amount)
    if (!valorResult.success) errs.amount = valorResult.error.issues[0].message
    if (!categoriaId) errs.category = t("modalErroCategoria")
    if (!date) errs.date = t("modalErroData")
    if ((metodo === "credito" || metodo === "debito") && !cartaoId && cartoesDoTipo.length > 0) {
      errs.cartao = t("addSelectCard")
    }
    return errs
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setIsSubmitting(true)
    try {
      const userId = user!.id

      const profile = await getProfile(userId)
      if (!profile || profile.plano === "free") {
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const { count } = await supabase
          .from("transacoes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("data", inicioMes.toISOString().split("T")[0])
        const slots = parcelado ? numParcelas : 1
        if ((count ?? 0) + slots > 30) {
          toast.error("Limite de transações atingido", {
            description: `Criação de ${slots} parcela(s) ultrapassaria o limite de 30/mês. Faça upgrade para Pro.`,
            duration: 5000,
            action: { label: "Ver planos", onClick: () => navigate("/app/perfil") },
          })
          setIsSubmitting(false)
          return
        }
      }

      let faturaId: string | null = null
      if (metodo === "credito" && cartaoId) {
        const agora = new Date()
        const fatura = await getFaturaAtual(cartaoId, agora.getMonth() + 1, agora.getFullYear(), userId)
        faturaId = fatura.id
      }

      const baseDate = new Date(date + "T12:00:00")
      const valorTotal = parseInt(amount) / 100

      if (parcelado && numParcelas > 1) {
        const grupoId = crypto.randomUUID()
        const valorParcela = parseFloat((valorTotal / numParcelas).toFixed(2))
        const descBase = description || catSelecionada?.nome || ""

        for (let i = 0; i < numParcelas; i++) {
          const d = new Date(baseDate)
          d.setMonth(d.getMonth() + i)
          const dataStr = d.toISOString().split("T")[0]
          await addTransacao(userId, {
            categoria_id: categoriaId,
            descricao: `${descBase} (${i + 1}/${numParcelas})`,
            valor: valorParcela,
            tipo: "despesa",
            data: dataStr,
            metodo_pagamento: metodo || null,
            cartao_id: cartaoId || null,
            fatura_id: i === 0 ? faturaId : null,
            confirmado: i === 0 ? confirmado : false,
            grupo_parcela: grupoId,
            parcela_atual: i + 1,
            total_parcelas: numParcelas,
          })
        }
        if (faturaId) await recalcularFatura(faturaId, userId)
        toast.success(`${numParcelas}x criadas com sucesso!`, {
          description: `${catSelecionada?.nome ?? ""} · R$ ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${t("addParcelaDeLabel")}`,
          duration: 3500,
        })
      } else {
        await addTransacao(userId, {
          categoria_id: categoriaId,
          descricao: description || catSelecionada?.nome || "",
          valor: valorTotal,
          tipo: "despesa",
          data: date,
          metodo_pagamento: metodo || null,
          cartao_id: cartaoId || null,
          fatura_id: faturaId,
          confirmado,
        })
        if (faturaId) await recalcularFatura(faturaId, userId)
        toast.success("Gasto registrado com sucesso!", {
          description: `${catSelecionada?.nome ?? ""} · R$ ${displayAmount}`,
          duration: 3500,
        })
      }

      navigate("/app")
    } catch (err) {
      console.error("Erro ao registrar gasto:", err)
      toast.error("Erro ao registrar gasto. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ padding: "16px", maxWidth: 572, margin: "0 auto" }} className="lg:p-6">
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: "var(--of-text-muted)" }}>
          {t("addExpenseSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Valor */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t("modalValor")}</label>
          <div style={{
            display: "flex", alignItems: "center",
            border: `1px solid ${errors.amount ? "#EF4444" : amount ? "var(--of-text)" : "var(--of-border)"}`,
            borderRadius: 8, padding: "12px 14px", transition: "border-color 0.15s",
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text-muted)", marginRight: 8 }}>R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="0,00"
              style={{ flex: 1, outline: "none", border: "none", background: "transparent", fontSize: 32, fontWeight: 700, color: "var(--of-text)" }}
            />
          </div>
          {errors.amount && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.amount}</p>}
        </div>

        {/* Categoria */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t("modalCategoria")}</label>
          <div ref={catRef} style={{ position: "relative" }}>
            <button
              type="button"
              disabled={loadingCats}
              onClick={() => { if (!loadingCats) setCatsOpen((v) => !v) }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                border: `1px solid ${errors.category ? "#EF4444" : catsOpen ? "var(--of-text)" : "var(--of-border)"}`,
                borderRadius: 8, padding: "10px 12px", fontSize: 14, textAlign: "left",
                background: loadingCats ? "var(--of-hover)" : "transparent",
                color: "var(--of-text)", cursor: loadingCats ? "not-allowed" : "pointer",
                transition: "border-color 0.15s",
              }}
            >
              {loadingCats ? (
                <span style={{ color: "var(--of-text-muted)" }}>{t("addLoadingCats")}</span>
              ) : catSelecionada ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{catSelecionada.icone}</span>
                  <span>{catSelecionada.nome}</span>
                </span>
              ) : (
                <span style={{ color: "var(--of-text-muted)" }}>{t("addSelectCat")}</span>
              )}
              <ChevronDown size={16} style={{ color: "var(--of-text-muted)", flexShrink: 0, transform: catsOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {catsOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--of-surface)", border: "1px solid var(--of-border)", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 280, overflowY: "auto",
              }}>
                {catsPadrao.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "var(--of-text-muted)", padding: "10px 12px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {t("addCatPadrao")}
                    </p>
                    {catsPadrao.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCategoriaId(c.id); setErrors((p) => ({ ...p, category: "" })); setCatsOpen(false) }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", border: "none", cursor: "pointer", fontSize: 14,
                          color: "var(--of-text)", textAlign: "left", transition: "background 0.1s",
                          background: categoriaId === c.id ? "var(--of-hover)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (categoriaId !== c.id) e.currentTarget.style.background = "var(--of-hover)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = categoriaId === c.id ? "var(--of-hover)" : "transparent" }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.icone}</span>
                        <span style={{ flex: 1 }}>{c.nome}</span>
                        {categoriaId === c.id && <span style={{ fontSize: 12, color: "#16A34A" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {catsMinhas.length > 0 && (
                  <div style={{ borderTop: catsPadrao.length > 0 ? "1px solid var(--of-border-light)" : "none" }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "var(--of-text-muted)", padding: "10px 12px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {t("addMyCats")}
                    </p>
                    {catsMinhas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCategoriaId(c.id); setErrors((p) => ({ ...p, category: "" })); setCatsOpen(false) }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", border: "none", cursor: "pointer", fontSize: 14,
                          color: "var(--of-text)", textAlign: "left", transition: "background 0.1s",
                          background: categoriaId === c.id ? "var(--of-hover)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (categoriaId !== c.id) e.currentTarget.style.background = "var(--of-hover)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = categoriaId === c.id ? "var(--of-hover)" : "transparent" }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.icone}</span>
                        <span style={{ flex: 1 }}>{c.nome}</span>
                        {categoriaId === c.id && <span style={{ fontSize: 12, color: "#16A34A" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {catsFiltradas.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--of-text-muted)", padding: "14px 12px", textAlign: "center" }}>
                    {t("addNoCats")}
                  </p>
                )}

                <div style={{ borderTop: "1px solid var(--of-border-light)", padding: "6px" }}>
                  <button
                    type="button"
                    onClick={() => { setCatsOpen(false); setModalNovaCat(true) }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 10px", background: "none", border: "none", borderRadius: 8,
                      cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#16A34A",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#DCFCE7" }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
                  >
                    <Plus size={14} />
                    {t("addNewCat")}
                  </button>
                </div>
              </div>
            )}
          </div>
          {errors.category && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.category}</p>}
        </div>

        {/* Parcelado */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t("addParcelado")} / {t("addAvista")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            {([false, true] as const).map((isParc) => (
              <button
                key={String(isParc)}
                type="button"
                onClick={() => setParcelado(isParc)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  background: parcelado === isParc ? "var(--of-btn-bg)" : "var(--of-hover)",
                  color: parcelado === isParc ? "var(--of-btn-text)" : "var(--of-text-secondary)",
                }}
              >
                {isParc ? <Layers size={14} /> : null}
                {isParc ? t("addParcelado") : t("addAvista")}
              </button>
            ))}
          </div>

          {parcelado && (
            <div style={{ marginTop: 14 }}>
              <label style={{ ...labelStyle, marginBottom: 6 }}>{t("addNParcelas")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="number"
                  min={2}
                  max={48}
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(Math.max(2, Math.min(48, parseInt(e.target.value) || 2)))}
                  style={{ ...inputStyle, width: 80, textAlign: "center", fontSize: 15, fontWeight: 700 }}
                />
                <span style={{ fontSize: 13, color: "var(--of-text-muted)" }}>
                  × {amount ? `R$ ${((parseInt(amount) / 100) / numParcelas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} {t("addParcelaDeLabel")}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--of-text-muted)", marginTop: 6 }}>{t("addParcelaHint")}</p>
            </div>
          )}
        </div>

        {/* Método de pagamento */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t("addPaymentMethod")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }} className="sm:grid-cols-5">
            {METODOS.map(({ valor, labelKey, icon: Icon }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setMetodo(valor)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: metodo === valor ? 600 : 400,
                  transition: "all 0.15s",
                  background: metodo === valor ? "var(--of-btn-bg)" : "var(--of-hover)",
                  color: metodo === valor ? "var(--of-btn-text)" : "var(--of-text-secondary)",
                }}
              >
                <Icon size={18} />
                <span style={{ textAlign: "center" }}>{labelKey}</span>
              </button>
            ))}
          </div>

          {(metodo === "credito" || metodo === "debito") && cartoesDoTipo.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <label style={{ ...labelStyle, marginBottom: 6 }}>{t("addWhichCard")}</label>
              <select
                value={cartaoId}
                onChange={(e) => { setCartaoId(e.target.value); setErrors((p) => ({ ...p, cartao: "" })) }}
                style={{
                  ...inputStyle,
                  borderColor: errors.cartao ? "#EF4444" : "var(--of-border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <option value="">{t("addSelectCard")}</option>
                {cartoesDoTipo.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.cartao && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.cartao}</p>}
            </div>
          )}

          {metodo === "credito" && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "var(--of-page-bg)", borderRadius: 10,
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{t("addConfirmed")}</p>
                <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{t("addCreditPending")}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmado((v) => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: confirmado ? "#16A34A" : "var(--of-border)",
                  border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 2,
                  left: confirmado ? 22 : 2,
                  width: 20, height: 20, borderRadius: "50%", background: "var(--of-surface)",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          )}
        </div>

        {/* Descrição */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t("modalDescricao")}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("addDescPlaceholder")}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--of-text)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--of-border)" }}
          />
        </div>

        {/* Data */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t("modalData")}</label>
          <div style={{
            display: "flex", alignItems: "center",
            border: `1px solid ${errors.date ? "#EF4444" : "var(--of-border)"}`,
            borderRadius: 8, padding: "10px 12px", transition: "border-color 0.15s",
          }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--of-text)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = errors.date ? "#EF4444" : "var(--of-border)" }}
          >
            <CalendarDays size={16} style={{ color: "var(--of-text-muted)", marginRight: 8, flexShrink: 0 }} />
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setErrors((prev) => ({ ...prev, date: "" })) }}
              style={{ flex: 1, outline: "none", border: "none", background: "transparent", fontSize: 14, color: "var(--of-text)" }}
            />
          </div>
          {errors.date && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.date}</p>}
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate("/app")}
            style={{
              flex: 1, padding: "13px 0", borderRadius: 10,
              border: "1px solid var(--of-border)", fontSize: 14, fontWeight: 600,
              color: "var(--of-text-secondary)", background: "var(--of-surface)",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "var(--of-hover)"; e.currentTarget.style.borderColor = "var(--of-text)" }}
            onMouseOut={(e) => { e.currentTarget.style.background = "var(--of-surface)"; e.currentTarget.style.borderColor = "var(--of-border)" }}
          >
            {t("addCancelar")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 1, padding: "13px 0", borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 600,
              background: isSubmitting ? "var(--of-border)" : "var(--of-btn-bg)",
              color: isSubmitting ? "var(--of-text-muted)" : "var(--of-btn-text)",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.background = "#262626" }}
            onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.background = "var(--of-btn-bg)" }}
          >
            {isSubmitting ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                {t("addRegistering")}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {t("addRegisterExpense")}
              </>
            )}
          </button>
        </div>
      </form>

      {modalNovaCat && (
        <ModalNovaCategoria
          onClose={() => setModalNovaCat(false)}
          onSalvar={handleSalvarNovaCat}
        />
      )}
    </div>
  )
}
