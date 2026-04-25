import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { UtensilsCrossed, Bus, Heart, BookOpen, Clapperboard, Package, CalendarDays, CheckCircle2 } from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { addTransacao, getOrCreateCategoria, getProfile } from "../../lib/queries"
import { supabase } from "../../lib/supabase"
import { valorSchema } from "../../lib/validations"

type Category = "Alimentação" | "Transporte" | "Saúde" | "Educação" | "Entretenimento" | "Outros"

const categories: { name: Category; icon: React.ElementType; emoji: string }[] = [
  { name: "Alimentação", icon: UtensilsCrossed, emoji: "🍽️" },
  { name: "Transporte", icon: Bus, emoji: "🚌" },
  { name: "Saúde", icon: Heart, emoji: "🏥" },
  { name: "Educação", icon: BookOpen, emoji: "📚" },
  { name: "Entretenimento", icon: Clapperboard, emoji: "🎬" },
  { name: "Outros", icon: Package, emoji: "📦" },
]

export default function AddExpense() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<Category | "">("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "")
    setAmount(raw)
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }))
  }

  const displayAmount = amount
    ? (parseInt(amount) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : ""

  const validate = () => {
    const errs: Record<string, string> = {}

    const valorResult = valorSchema.safeParse(amount)
    if (!valorResult.success) errs.amount = valorResult.error.issues[0].message

    if (!category) errs.category = "Selecione uma categoria"
    if (!date) errs.date = "Selecione uma data"

    return errs
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

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

      const categoriaId = await getOrCreateCategoria(userId, category as string)

      await addTransacao(userId, {
        categoria_id: categoriaId,
        descricao: description || (category as string),
        valor: parseInt(amount) / 100,
        tipo: "despesa",
        data: date,
      })

      toast.success("Gasto registrado com sucesso!", {
        description: `${category} · R$ ${displayAmount}`,
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
          <div className="grid grid-cols-3 gap-2">
            {categories.map(({ name, emoji }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setCategory(name)
                  setErrors((prev) => ({ ...prev, category: "" }))
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                  category === name
                    ? "bg-black border-black text-white"
                    : "border-[#E0E0E0] text-[#333333] hover:border-[#999999] hover:bg-[#F5F5F5]"
                }`}
              >
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span style={{ fontSize: 11, fontWeight: category === name ? 600 : 400 }}>{name}</span>
              </button>
            ))}
          </div>
          {errors.category && (
            <p style={{ fontSize: 12 }} className="text-[#D32F2F] mt-2">{errors.category}</p>
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
              onChange={(e) => {
                setDate(e.target.value)
                setErrors((prev) => ({ ...prev, date: "" }))
              }}
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
    </div>
  )
}
