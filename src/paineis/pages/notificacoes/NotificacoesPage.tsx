import { useEffect, useMemo, useState } from "react"
import { Link, useOutletContext } from "react-router"
import { toast } from "sonner"
import { useAuth } from "../../../lib/auth-context"
import type { AppOutletContext } from "../../../app/components/Layout"
import { getNotifications, getUnreadNotificationsCount, markAllNotificationsRead, markNotificationRead, type NotificationRow } from "../../../lib/queries"

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  } catch {
    return "—"
  }
}

export default function NotificacoesPage() {
  const { user } = useAuth()
  const { requestSync, syncNonce } = useOutletContext<AppOutletContext>()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let ignore = false
    setLoading(true)
    Promise.all([getNotifications(user.id, { limit: 50 }), getUnreadNotificationsCount(user.id)])
      .then(([rows, unread]) => {
        if (ignore) return
        setItems(rows)
        setUnreadCount(unread)
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user?.id, syncNonce])

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  async function markOne(id: string) {
    if (!user) return
    if (markingId) return
    setMarkingId(id)
    try {
      await markNotificationRead(user.id, id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
      requestSync()
    } catch {
      toast.error("Não foi possível marcar como lida.")
    } finally {
      setMarkingId(null)
    }
  }

  async function markAll() {
    if (!user) return
    if (markingAll) return
    setMarkingAll(true)
    try {
      await markAllNotificationsRead(user.id)
      const now = new Date().toISOString()
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
      setUnreadCount(0)
      requestSync()
      toast.success("Notificações marcadas como lidas.")
    } catch {
      toast.error("Não foi possível marcar todas como lidas.")
    } finally {
      setMarkingAll(false)
    }
  }

  if (!user) return null

  return (
    <div className="ofx-notifs">
      <div className="page">
        <div className="page-header">
          <div className="page-title">Notificações</div>
          <div className="page-sub">Eventos importantes da sua conta e do seu financeiro.</div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              Caixa de entrada
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--t2)" }}>
                {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Tudo lido"}
              </span>
              <button
                type="button"
                className="card-action"
                onClick={markAll}
                disabled={markingAll || unread === 0}
                style={{ opacity: markingAll || unread === 0 ? 0.6 : 1 }}
              >
                Marcar todas como lidas
              </button>
            </div>
          </div>

          <div className="card-body">
            {loading ? (
              <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>Carregando…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 10, color: "var(--t2)", fontSize: 13 }}>
                Sem notificações ainda. Importações, score e eventos importantes aparecem aqui.
              </div>
            ) : (
              <div className="notif-list">
                {items.map((n) => {
                  const unreadItem = !n.read_at
                  return (
                    <div key={n.id} className={["notif-item", unreadItem ? "unread" : ""].filter(Boolean).join(" ")}>
                      <div className="notif-main">
                        <div className="notif-title">
                          {unreadItem ? <span className="notif-dot" aria-hidden="true" /> : null}
                          {n.title}
                        </div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-meta">
                          {fmtDateTime(n.created_at)} · <span className="muted">{n.type}</span>
                          {n.metadata?.["batch_id"] ? (
                            <>
                              {" "}·{" "}
                              <Link to="/app/importacao" className="notif-link">
                                Ver importação
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="notif-actions">
                        {unreadItem ? (
                          <button type="button" className="notif-action" onClick={() => void markOne(n.id)} disabled={markingId === n.id}>
                            {markingId === n.id ? "…" : "Marcar lida"}
                          </button>
                        ) : (
                          <span className="muted">Lida</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

