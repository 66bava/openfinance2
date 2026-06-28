import { useState, useEffect } from "react"
import { useAuth } from "../../lib/auth-context"
import { getProfile } from "../../lib/queries"
import { FeatureLock } from "../components/FeatureLock"
import {
  getMyGrupo, createGrupo, updateGrupoNome,
  getMembros, getMinhaMembresia, getAdminPerfil,
  buscarPerfilPorEmail, convidarMembro,
  responderConvite, removerMembro, sairDaFamilia,
} from "../../lib/queries/familia"
import type { FamiliaGrupo, MembroComPerfil } from "../../lib/queries/familia"
import { Users, UserPlus, Crown, Trash2, Check, X, LogOut, Edit2, Search, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"

const MAX_MEMBROS = 4

// ─── Loading ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 28, height: 28,
        border: "2.5px solid #16A34A",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  )
}

// ─── Avatar genérico ──────────────────────────────────────────────────────────

function Avatar({ nome, size = 36 }: { nome: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--of-btn-bg)", color: "var(--of-btn-text)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {nome.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    aceito: { label: "Ativo", color: "#16A34A", bg: "#DCFCE7" },
    pendente: { label: "Pendente", color: "#D97706", bg: "#FEF3C7" },
    rejeitado: { label: "Recusado", color: "#DC2626", bg: "#FEE2E2" },
  }
  const s = map[status] ?? map.pendente
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 10,
      color: s.color, background: s.bg,
    }}>
      {s.label}
    </span>
  )
}

// ─── Criar grupo ──────────────────────────────────────────────────────────────

function CreateGroupView({ onCreate }: { onCreate: (nome: string) => Promise<void> }) {
  const [nome, setNome] = useState("Nossa Família")
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!nome.trim()) return
    setLoading(true)
    try {
      await onCreate(nome.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "32px 20px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "var(--of-upgrade-bg)", border: "2px solid var(--of-upgrade-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <Users size={32} style={{ color: "#16A34A" }} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text)", marginBottom: 8 }}>
        Crie seu grupo familiar
      </h2>
      <p style={{ fontSize: 14, color: "var(--of-text-secondary)", marginBottom: 28, lineHeight: 1.6 }}>
        Convide até {MAX_MEMBROS} familiares para compartilhar o Finance App. Eles verão o convite direto no dashboard.
      </p>

      <div style={{ textAlign: "left", marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--of-text-muted)", display: "block", marginBottom: 6 }}>
          Nome do grupo
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Família Silva"
          style={{
            width: "100%", padding: "10px 14px",
            border: "1px solid var(--of-border)", borderRadius: 9,
            fontSize: 14, color: "var(--of-text)", background: "var(--of-surface)",
            outline: "none", boxSizing: "border-box",
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      <button
        onClick={submit}
        disabled={loading || !nome.trim()}
        style={{
          width: "100%", padding: "12px",
          background: "#16A34A", color: "#fff",
          fontWeight: 700, fontSize: 14, border: "none", borderRadius: 9,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#15803D" }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#16A34A" }}
      >
        {loading ? "Criando…" : "Criar grupo familiar"}
      </button>
    </div>
  )
}

// ─── Painel do admin ──────────────────────────────────────────────────────────

function AdminPanel({
  grupo, membros, onRefresh,
}: {
  grupo: FamiliaGrupo
  membros: MembroComPerfil[]
  onRefresh: () => void
}) {
  const [nomeGrupo, setNomeGrupo] = useState(grupo.nome)
  const [editingNome, setEditingNome] = useState(false)
  const [emailConvite, setEmailConvite] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState<string | null>(null)

  const membrosAtivos = membros.filter((m) => m.status !== "rejeitado")
  const vagasRestantes = MAX_MEMBROS - membrosAtivos.length

  async function salvarNome() {
    try {
      await updateGrupoNome(grupo.id, nomeGrupo.trim() || grupo.nome)
      setEditingNome(false)
      toast.success("Nome atualizado!")
      onRefresh()
    } catch {
      toast.error("Erro ao atualizar nome")
    }
  }

  async function convidar() {
    if (!emailConvite.trim()) return
    if (vagasRestantes <= 0) {
      toast.error("Grupo já está cheio (máx. 4 membros)")
      return
    }
    setInviteLoading(true)
    try {
      const perfil = await buscarPerfilPorEmail(emailConvite.trim())
      if (!perfil) {
        toast.error("Usuário não encontrado. O email deve estar cadastrado no Finance App.")
        return
      }
      if (perfil.id === grupo.admin_id) {
        toast.error("Você não pode se convidar.")
        return
      }
      if (membros.some((m) => m.user_id === perfil.id && m.status !== "rejeitado")) {
        toast.error("Este usuário já está no grupo ou tem um convite pendente.")
        return
      }
      await convidarMembro(grupo.id, perfil.id)
      toast.success(`Convite enviado para ${perfil.nome || perfil.email}!`)
      setEmailConvite("")
      onRefresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar convite")
    } finally {
      setInviteLoading(false)
    }
  }

  async function remover(membroId: string, nome: string) {
    setRemoveLoading(membroId)
    try {
      await removerMembro(membroId)
      toast.success(`${nome} removido do grupo`)
      onRefresh()
    } catch {
      toast.error("Erro ao remover membro")
    } finally {
      setRemoveLoading(null)
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: 640, margin: "0 auto", fontFamily: "var(--font-body)" }}
      className="lg:p-8">

      {/* Header do grupo */}
      <div style={{
        background: "var(--of-surface)", border: "1px solid var(--of-border)",
        borderRadius: 14, padding: "20px 20px", marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={20} style={{ color: "#fff" }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Administrador do grupo
            </p>
            {editingNome ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <input
                  value={nomeGrupo}
                  onChange={(e) => setNomeGrupo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") salvarNome() }}
                  autoFocus
                  style={{
                    fontSize: 18, fontWeight: 700, color: "var(--of-text)",
                    background: "var(--of-page-bg)", border: "1px solid var(--of-border)",
                    borderRadius: 6, padding: "3px 8px", outline: "none",
                  }}
                />
                <button onClick={salvarNome} style={{ background: "none", border: "none", cursor: "pointer", color: "#16A34A" }}>
                  <Check size={16} />
                </button>
                <button onClick={() => { setNomeGrupo(grupo.nome); setEditingNome(false) }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--of-text-muted)" }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text)" }}>{grupo.nome}</h2>
                <button onClick={() => setEditingNome(true)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--of-text-muted)", padding: 2 }}>
                  <Edit2 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text)" }}>{membrosAtivos.length}</p>
            <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>membros</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: vagasRestantes > 0 ? "#16A34A" : "#D97706" }}>{vagasRestantes}</p>
            <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>vagas livres</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text)" }}>{MAX_MEMBROS}</p>
            <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>máx. membros</p>
          </div>
        </div>
      </div>

      {/* Convidar */}
      <div style={{
        background: "var(--of-surface)", border: "1px solid var(--of-border)",
        borderRadius: 14, padding: "20px", marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <UserPlus size={16} style={{ color: "#16A34A" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--of-text)" }}>Convidar familiar</h3>
          {vagasRestantes <= 0 && (
            <span style={{ fontSize: 11, color: "#D97706", background: "#FEF3C7", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
              Grupo cheio
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--of-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
          O familiar precisa ter uma conta no Finance App. O convite aparecerá no dashboard dele.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={14} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "var(--of-text-muted)",
            }} />
            <input
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && convidar()}
              placeholder="email@exemplo.com"
              disabled={vagasRestantes <= 0 || inviteLoading}
              style={{
                width: "100%", padding: "10px 14px 10px 34px",
                border: "1px solid var(--of-border)", borderRadius: 9,
                fontSize: 13, color: "var(--of-text)", background: "var(--of-page-bg)",
                outline: "none", boxSizing: "border-box",
                opacity: vagasRestantes <= 0 ? 0.5 : 1,
              }}
            />
          </div>
          <button
            onClick={convidar}
            disabled={inviteLoading || vagasRestantes <= 0 || !emailConvite.trim()}
            style={{
              padding: "10px 18px", background: "#16A34A", color: "#fff",
              fontWeight: 700, fontSize: 13, border: "none", borderRadius: 9,
              cursor: inviteLoading || vagasRestantes <= 0 ? "not-allowed" : "pointer",
              opacity: inviteLoading || vagasRestantes <= 0 ? 0.6 : 1,
              whiteSpace: "nowrap", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!inviteLoading) e.currentTarget.style.background = "#15803D" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#16A34A" }}
          >
            {inviteLoading ? "…" : "Convidar"}
          </button>
        </div>
      </div>

      {/* Lista de membros */}
      <div style={{
        background: "var(--of-surface)", border: "1px solid var(--of-border)",
        borderRadius: 14, padding: "20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Users size={16} style={{ color: "var(--of-text-muted)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--of-text)" }}>
            Membros ({membrosAtivos.length}/{MAX_MEMBROS})
          </h3>
        </div>

        {membrosAtivos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--of-text-muted)" }}>
            <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nenhum membro ainda. Convide um familiar acima.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {membrosAtivos.map((m) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10,
                background: "var(--of-page-bg)", border: "1px solid var(--of-border-light)",
              }}>
                <Avatar nome={m.nome} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.nome}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--of-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.email}
                  </p>
                </div>
                <StatusBadge status={m.status} />
                <button
                  onClick={() => remover(m.id, m.nome)}
                  disabled={removeLoading === m.id}
                  title="Remover membro"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 6, borderRadius: 6, color: "#DC2626",
                    opacity: removeLoading === m.id ? 0.5 : 1,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Convite pendente ─────────────────────────────────────────────────────────

function PendingInviteView({
  membresia, adminPerfil, onAceitar, onRejeitar,
}: {
  membresia: any
  adminPerfil: any
  onAceitar: () => void
  onRejeitar: () => void
}) {
  const [loadingAceitar, setLoadingAceitar] = useState(false)
  const [loadingRejeitar, setLoadingRejeitar] = useState(false)

  const adminNome = adminPerfil?.nome || adminPerfil?.email || "Alguém"
  const grupoNome = membresia?.grupo?.nome || "Família"

  return (
    <div style={{ padding: "32px 20px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "#DCFCE7", border: "2px solid #86EFAC",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <Users size={32} style={{ color: "#16A34A" }} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--of-text)", marginBottom: 8 }}>
        Convite para o grupo família
      </h2>
      <p style={{ fontSize: 15, color: "var(--of-text-secondary)", marginBottom: 6, lineHeight: 1.6 }}>
        <strong style={{ color: "var(--of-text)" }}>{adminNome}</strong> convidou você para o grupo
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: "#16A34A", marginBottom: 28 }}>
        "{grupoNome}"
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={async () => {
            setLoadingRejeitar(true)
            try { await onRejeitar() } finally { setLoadingRejeitar(false) }
          }}
          disabled={loadingRejeitar || loadingAceitar}
          style={{
            flex: 1, padding: "12px",
            background: "var(--of-page-bg)", color: "var(--of-text)",
            fontWeight: 600, fontSize: 14,
            border: "1px solid var(--of-border)", borderRadius: 9,
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--of-hover)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--of-page-bg)" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <UserX size={15} />
            {loadingRejeitar ? "Recusando…" : "Recusar"}
          </div>
        </button>
        <button
          onClick={async () => {
            setLoadingAceitar(true)
            try { await onAceitar() } finally { setLoadingAceitar(false) }
          }}
          disabled={loadingAceitar || loadingRejeitar}
          style={{
            flex: 1, padding: "12px",
            background: "#16A34A", color: "#fff",
            fontWeight: 700, fontSize: 14, border: "none", borderRadius: 9,
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { if (!loadingAceitar) e.currentTarget.style.background = "#15803D" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#16A34A" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <UserCheck size={15} />
            {loadingAceitar ? "Entrando…" : "Aceitar convite"}
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Painel do membro ─────────────────────────────────────────────────────────

function MemberView({
  membresia, adminPerfil, membros, onSair,
}: {
  membresia: any
  adminPerfil: any
  membros: MembroComPerfil[]
  onSair: () => void
}) {
  const [loading, setLoading] = useState(false)
  const grupoNome = membresia?.grupo?.nome || "Família"
  const adminNome = adminPerfil?.nome || adminPerfil?.email || "Admin"

  return (
    <div style={{ padding: "20px", maxWidth: 560, margin: "0 auto" }} className="lg:p-8">

      <div style={{
        background: "var(--of-surface)", border: "1px solid var(--of-border)",
        borderRadius: 14, padding: "20px", marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Users size={20} style={{ color: "#fff" }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--of-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Você é membro de
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--of-text)" }}>{grupoNome}</h2>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--of-text-secondary)", marginBottom: 0 }}>
          Grupo administrado por <strong style={{ color: "var(--of-text)" }}>{adminNome}</strong>
        </p>
      </div>

      {/* Outros membros */}
      {membros.length > 0 && (
        <div style={{
          background: "var(--of-surface)", border: "1px solid var(--of-border)",
          borderRadius: 14, padding: "20px", marginBottom: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--of-text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={15} style={{ color: "var(--of-text-muted)" }} />
            Membros do grupo ({membros.filter(m => m.status === "aceito").length + 1})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Admin row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10,
              background: "var(--of-page-bg)", border: "1px solid var(--of-border-light)",
            }}>
              <Avatar nome={adminNome} size={36} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{adminNome}</p>
                <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{adminPerfil?.email || ""}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 10, color: "#16A34A", background: "#DCFCE7" }}>
                Admin
              </span>
            </div>
            {/* Other members */}
            {membros.filter(m => m.status === "aceito").map((m) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10,
                background: "var(--of-page-bg)", border: "1px solid var(--of-border-light)",
              }}>
                <Avatar nome={m.nome} size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--of-text)" }}>{m.nome}</p>
                  <p style={{ fontSize: 11, color: "var(--of-text-muted)" }}>{m.email}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sair do grupo */}
      <div style={{
        background: "var(--of-surface)", border: "1px solid var(--of-border)",
        borderRadius: 14, padding: "18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <p style={{ fontSize: 13, color: "var(--of-text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          Ao sair do grupo, você perderá o acesso ao plano família compartilhado.
        </p>
        <button
          onClick={async () => {
            setLoading(true)
            try { await onSair() } finally { setLoading(false) }
          }}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", background: "none",
            color: "#DC2626", fontWeight: 600, fontSize: 13,
            border: "1px solid #FECACA", borderRadius: 9,
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
        >
          <LogOut size={14} />
          {loading ? "Saindo…" : "Sair do grupo"}
        </button>
      </div>
    </div>
  )
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function Familia() {
  const { user } = useAuth()
  const userId = user!.id

  const [loading, setLoading] = useState(true)
  const [plano, setPlano] = useState<string>("free")
  const [grupo, setGrupo] = useState<FamiliaGrupo | null>(null)
  const [membros, setMembros] = useState<MembroComPerfil[]>([])
  const [membresia, setMembresia] = useState<any>(null)
  const [adminPerfil, setAdminPerfil] = useState<any>(null)

  async function load() {
    setLoading(true)
    try {
      const [profile, myGrupo, myMembresia] = await Promise.all([
        getProfile(userId),
        getMyGrupo(userId),
        getMinhaMembresia(userId),
      ])
      setPlano(profile?.plano ?? "free")

      if (myGrupo) {
        setGrupo(myGrupo)
        const m = await getMembros(myGrupo.id)
        setMembros(m)
        setMembresia(null)
        setAdminPerfil(null)
      } else if (myMembresia) {
        setGrupo(null)
        setMembros([])
        setMembresia(myMembresia)
        if (myMembresia.grupo?.admin_id) {
          const admin = await getAdminPerfil(myMembresia.grupo.admin_id)
          setAdminPerfil(admin)
          // load other members too for member view
          const m = await getMembros(myMembresia.grupo_id)
          setMembros(m.filter((mm) => mm.user_id !== userId))
        }
      } else {
        setGrupo(null)
        setMembros([])
        setMembresia(null)
        setAdminPerfil(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  async function handleCreateGrupo(nome: string) {
    const novoGrupo = await createGrupo(userId, nome)
    toast.success("Grupo criado com sucesso!")
    setGrupo(novoGrupo)
    setMembros([])
  }

  async function handleAceitar() {
    if (!membresia) return
    await responderConvite(membresia.id, true)
    toast.success("Bem-vindo ao grupo familiar!")
    load()
  }

  async function handleRejeitar() {
    if (!membresia) return
    await responderConvite(membresia.id, false)
    toast.success("Convite recusado.")
    load()
  }

  async function handleSair() {
    await sairDaFamilia(userId)
    toast.success("Você saiu do grupo.")
    load()
  }

  if (loading) return <Spinner />

  if (plano !== "familia") {
    return (
      <FeatureLock
        requiredPlan="familia"
        message="O painel Família está disponível apenas no plano Família. Faça upgrade para convidar até 4 familiares e compartilhar o Finance App."
      />
    )
  }

  if (grupo) {
    return <AdminPanel grupo={grupo} membros={membros} onRefresh={load} />
  }

  if (membresia) {
    if (membresia.status === "pendente") {
      return (
        <PendingInviteView
          membresia={membresia}
          adminPerfil={adminPerfil}
          onAceitar={handleAceitar}
          onRejeitar={handleRejeitar}
        />
      )
    }
    return (
      <MemberView
        membresia={membresia}
        adminPerfil={adminPerfil}
        membros={membros}
        onSair={handleSair}
      />
    )
  }

  return <CreateGroupView onCreate={handleCreateGrupo} />
}
