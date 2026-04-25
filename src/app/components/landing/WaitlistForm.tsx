import { useState, useEffect, FormEvent } from "react"
import { supabase } from "../../../lib/supabase"

interface Props {
  variant?: "light" | "dark"
  showCounter?: boolean
  fonte?: string
}

export default function WaitlistForm({
  variant = "light",
  showCounter = false,
  fonte = "landing",
}: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "exists" | "error">("idle")
  const [message, setMessage] = useState("")
  const [contador, setContador] = useState<number | null>(null)
  const escuro = variant === "dark"

  useEffect(() => {
    if (!showCounter) return
    supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => { if (count !== null) setContador(count) })
  }, [showCounter])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus("loading")
    const { error } = await supabase.from("waitlist").insert({ email: email.trim(), fonte })
    if (!error) {
      setStatus("success")
      setMessage("Pronto. Você está na lista.")
    } else if (error.code === "23505") {
      setStatus("exists")
      setMessage("Esse email já está na lista.")
    } else {
      setStatus("error")
      setMessage("Algo deu errado. Tente novamente.")
    }
  }

  if (status === "success" || status === "exists") {
    return (
      <p style={{
        fontSize: 14,
        fontWeight: 500,
        color: status === "success"
          ? (escuro ? "#4ADE80" : "#16A34A")
          : (escuro ? "rgba(255,255,255,0.6)" : "#6B6B6B"),
      }}>
        {message}
      </p>
    )
  }

  return (
    <div>
      {showCounter && contador !== null && (
        <p style={{
          fontSize: 13,
          color: escuro ? "rgba(255,255,255,0.45)" : "#6B6B6B",
          marginBottom: 12,
        }}>
          {contador.toLocaleString("pt-BR")} pessoas já estão na lista.
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <label htmlFor={`waitlist-email-${fonte}`} className="sr-only">
          Endereço de email
        </label>
        <input
          id={`waitlist-email-${fonte}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor email"
          required
          autoComplete="email"
          style={{
            flex: 1,
            minWidth: 200,
            padding: "12px 16px",
            fontSize: 15,
            border: `1px solid ${escuro ? "#333333" : "#E5E5E3"}`,
            borderRadius: 6,
            outline: "none",
            backgroundColor: escuro ? "#1A1A1A" : "#FFFFFF",
            color: escuro ? "#FFFFFF" : "#1A1A1A",
            fontFamily: "var(--font-body)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            padding: "12px 22px",
            backgroundColor: escuro ? "#FFFFFF" : "#1A1A1A",
            color: escuro ? "#1A1A1A" : "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            borderRadius: 6,
            cursor: status === "loading" ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            opacity: status === "loading" ? 0.65 : 1,
            fontFamily: "var(--font-body)",
            transition: "opacity 0.2s",
          }}
        >
          {status === "loading" ? "Salvando..." : "Entrar na lista de espera"}
        </button>
      </form>
      {status === "error" && (
        <p style={{
          fontSize: 12,
          color: escuro ? "#FCA5A5" : "#DC2626",
          marginTop: 8,
        }}>
          {message}
        </p>
      )}
    </div>
  )
}
