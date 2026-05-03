import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  CalendarDays, CheckCircle2, Banknote, QrCode, ArrowLeftRight, CreditCard, Smartphone,
  ChevronDown, Plus,
} from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { addTransacao, getProfile } from "../../lib/queries"
import { getCartoes, getFaturaAtual, recalcularFatura } from "../../lib/queries/cartoes"
import { getCategoriasAtivas, criarCategoria } from "../../lib/queries/categorias"
import { supabase } from "../../lib/supabase"
import { valorSchema } from "../../lib/validations"
import ModalNovaCategoria from "../components/categorias/ModalNovaCategoria"
import type { Cartao, MetodoPagamento, Categoria } from "../../lib/types"

const METODOS: { valor: MetodoPagamento; label: string; icon: React.ElementType }[] = [
  { valor: "dinheiro", label: "Dinheiro", icon: Banknote },
  { valor: "pix", label: "PIX", icon: QrCode },
  { valor: "transferencia", label: "Transferência", icon: ArrowLeftRight },
  { valor: "debito", label: "Débito", icon: CreditCard },
  { valor: "credito", label: "Crédito", icon: Smartphone },
]

export default function AddExpense() {
  const navigate = useNavigate()
  const { user } = useAuth()

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

  // Carregar cartões, plano e categorias do usuário
  useEffect(() => {
    if (!user) return
    getCartoes(user.id).then(setCartoes).catch(console.error)
    getProfile(user.id).then((p) => setPlano(p?.plano ?? "free")).catch(console.error)
    carregarCats()
  }, [user, carregarCats])

  // Fechar dropdown ao clicar fora
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

  // Quando muda o método, ajusta o cartão e confirmado padrão
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
    if (!categoriaId) errs.category = "Selecione uma categoria"
    if (!date) errs.date = "Selecione uma data"
    if ((metodo === "credito" || metodo === "debito") && !cartaoId && cartoesDoTipo.length > 0) {
      errs.cartao = "Selecione o cartão"
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

      // Verificar limite de transações para plano Free
      const profile = await getProfile(userId)
      if (!profile || profile.plano === "free") {
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const { count } = await supabase
          .from("transacoes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("data", inicioMes.toISOString().split("T")[0])
        if ((count ?? 0) >= 30) {
          toast.error("Limite de 30 transações/mês atingido", {
            description: "Faça upgrade para Pro para transações ilimitadas.",
            duration: 5000,
            action: { label: "Ver planos", onClick: () => navigate("/app/perfil") },
          })
          setIsSubmitting(false)
          return
        }
      }

      // Buscar fatura se for crédito com cartão selecionado
      let faturaId: string | null = null
      if (metodo === "credito" && cartaoId) {
        const agora = new Date()
        const fatura = await getFaturaAtual(cartaoId, agora.getMonth() + 1, agora.getFullYear(), userId)
        faturaId = fatura.id
      }

      await addTransacao(userId, {
        categoria_id: categoriaId,
        descricao: description || catSelecionada?.nome || "",
        valor: parseInt(amount) / 100,
        tipo: "despesa",
        data: date,
        metodo_pagamento: metodo || null,
        cartao_id: cartaoId || null,
        fatura_id: faturaId,
        confirmado,
      })

      // Recalcular fatura se vinculada
      if (faturaId) {
        await recalcularFatura(faturaId, userId)
      }

      toast.success("Gasto registrado com sucesso!", {
        description: `${catSelecionada?.nome ?? ""} · R$ ${displayAmount}`,
        duration: 3500,
      })

      navigate("/app")
    } catch (err) {
      console.error("Erro ao registrar gasto:", err)
      toast.error("Erro ao registrar gasto. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <p style={{ fontSize: 13 }} className="text-[#777777]">
          Registre suas despesas de forma simples e rápida
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Valor */}
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <label style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-3">
            Valor *
          </label>
          <div
            className={`flex items-center border rounded-md px-4 py-3 transition-colors focus-within:border-black ${
              errors.amount ? "border-[#D32F2F]" : amount ? "border-black" : "border-[#E0E0E0]"
            }`}
          >
            <span style={{ fontSize: 22, fontWeight: 700 }} className="text-[#999999] mr-2">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="0,00"
              className="flex-1 outline-none bg-transparent text-black"
              style={{ fontSize: 32, fontWeight: 700 }}
            />
          </div>
          {errors.amount && (
            <p style={{ fontSize: 12 }} className="text-[#D32F2F] mt-1.5">{errors.amount}</p>
          )}
        </div>

        {/* Categoria */}
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <label style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-3">
            Categoria *
          </label>

          <div ref={catRef} style={{ position: "relative" }}>
            {/* Trigger */}
            <button
              type="button"
              disabled={loadingCats}
              onClick={() => { if (!loadingCats) setCatsOpen((v) => !v) }}
              className={`w-full flex items-center justify-between border rounded-md px-3 py-2.5 transition-colors text-left ${
                errors.category ? "border-[#D32F2F]" : catsOpen ? "border-black" : "border-[#E0E0E0] hover:border-[#999999]"
              } ${loadingCats ? "bg-[#F5F5F5] cursor-not-allowed" : "bg-white cursor-pointer"}`}
              style={{ fontSize: 14 }}
            >
              {loadingCats ? (
                <span className="text-[#BBBBBB]">Carregando categorias...</span>
              ) : catSelecionada ? (
                <span className="flex items-center gap-2 text-[#0A0A0A]">
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{catSelecionada.icone}</span>
                  <span>{catSelecionada.nome}</span>
                </span>
              ) : (
                <span className="text-[#BBBBBB]">Selecione uma categoria...</span>
              )}
              <ChevronDown
                size={16}
                className="text-[#999999] flex-shrink-0"
                style={{ transform: catsOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </button>

            {/* Dropdown panel */}
            {catsOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--of-surface)", border: "1px solid #E0E0E0", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 280, overflowY: "auto",
              }}>
                {/* Grupo: Padrão */}
                {catsPadrao.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "var(--of-text-muted)", padding: "10px 12px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Padrão
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
                          background: categoriaId === c.id ? "#F5F5F0" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (categoriaId !== c.id) e.currentTarget.style.background = "#F9F9F9" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = categoriaId === c.id ? "#F5F5F0" : "transparent" }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.icone}</span>
                        <span style={{ flex: 1 }}>{c.nome}</span>
                        {categoriaId === c.id && <span style={{ fontSize: 12, color: "#16A34A" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grupo: Minhas categorias */}
                {catsMinhas.length > 0 && (
                  <div style={{ borderTop: catsPadrao.length > 0 ? "1px solid var(--of-border-light)" : "none" }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "var(--of-text-muted)", padding: "10px 12px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Minhas categorias
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
                          background: categoriaId === c.id ? "#F5F5F0" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (categoriaId !== c.id) e.currentTarget.style.background = "#F9F9F9" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = categoriaId === c.id ? "#F5F5F0" : "transparent" }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.icone}</span>
                        <span style={{ flex: 1 }}>{c.nome}</span>
                        {categoriaId === c.id && <span style={{ fontSize: 12, color: "#16A34A" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {catsFiltradas.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--of-text-muted)", padding: "14px 12px", textAlign: "center" }}>
                    Nenhuma categoria encontrada
                  </p>
                )}

                {/* Footer: Nova categoria */}
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
                    Criar nova categoria
                  </button>
                </div>
              </div>
            )}
          </div>

          {errors.category && (
            <p style={{ fontSize: 12 }} className="text-[#D32F2F] mt-2">{errors.category}</p>
          )}
        </div>

        {/* Método de pagamento */}
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <label style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-3">
            Método de pagamento
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {METODOS.map(({ valor, label, icon: Icon }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setMetodo(valor)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 ${
                  metodo === valor
                    ? "bg-black border-black text-white"
                    : "border-[#E0E0E0] text-[#333333] hover:border-[#999999] hover:bg-[#F5F5F5]"
                }`}
              >
                <Icon size={18} />
                <span style={{ fontSize: 11, fontWeight: metodo === valor ? 600 : 400, textAlign: "center" }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Seletor de cartão */}
          {(metodo === "credito" || metodo === "debito") && cartoesDoTipo.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#777777", display: "block", marginBottom: 6 }}>
                Qual cartão?
              </label>
              <select
                value={cartaoId}
                onChange={(e) => { setCartaoId(e.target.value); setErrors((p) => ({ ...p, cartao: "" })) }}
                className={`w-full border rounded-md px-3 py-2.5 outline-none text-black text-sm focus:border-black transition-colors ${
                  errors.cartao ? "border-[#D32F2F]" : "border-[#E0E0E0]"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                <option value="">Selecione o cartão...</option>
                {cartoesDoTipo.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.cartao && <p style={{ fontSize: 12 }} className="text-[#D32F2F] mt-1">{errors.cartao}</p>}
            </div>
          )}

          {/* Toggle confirmado (só para crédito) */}
          {metodo === "credito" && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "var(--of-page-bg)", borderRadius: 10,
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>Confirmado?</p>
                <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>Transações de crédito são pendentes por padrão</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmado((v) => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: confirmado ? "#16A34A" : "#E5E5E3",
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
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <label style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-3">
            Descrição (opcional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Supermercado, Uber, Academia..."
            className="w-full border border-[#E0E0E0] rounded-md px-3 py-2.5 outline-none focus:border-black transition-colors text-black placeholder:text-[#BBBBBB]"
            style={{ fontSize: 14 }}
          />
        </div>

        {/* Data */}
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <label style={{ fontSize: 12, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-3">
            Data *
          </label>
          <div
            className={`flex items-center border rounded-md px-3 py-2.5 transition-colors ${
              errors.date ? "border-[#D32F2F]" : "border-[#E0E0E0] focus-within:border-black"
            }`}
          >
            <CalendarDays size={16} className="text-[#999999] mr-2" />
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setErrors((prev) => ({ ...prev, date: "" })) }}
              className="flex-1 outline-none bg-transparent text-black"
              style={{ fontSize: 14 }}
            />
          </div>
          {errors.date && (
            <p style={{ fontSize: 12 }} className="text-[#D32F2F] mt-1.5">{errors.date}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="flex-1 py-3 border border-[#E0E0E0] rounded-lg text-[#333333] hover:bg-[#F5F5F5] transition-colors"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-[#333333] transition-colors disabled:bg-[#E0E0E0] disabled:text-[#999999] flex items-center justify-center gap-2"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Registrar Gasto
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
