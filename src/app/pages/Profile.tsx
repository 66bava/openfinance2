import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Edit3, LogOut, Bell, Globe, DollarSign, Shield,
  ChevronRight, Check, X, Camera,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { getProfile, upsertProfile } from "../../lib/queries";
import type { Profile as ProfileType } from "../../lib/types";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user!.id;
  const userEmail = user?.email ?? "";

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [currency, setCurrency] = useState("BRL");
  const [language, setLanguage] = useState("Português");

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    data_nascimento: "",
  });
  const [tempForm, setTempForm] = useState(form);

  useEffect(() => {
    getProfile(userId).then((p) => {
      if (p) {
        setProfile(p);
        const f = {
          nome: p.nome || user?.user_metadata?.full_name || userEmail.split("@")[0] || "",
          telefone: p.telefone || "",
          data_nascimento: p.data_nascimento || "",
        };
        setForm(f);
        setTempForm(f);
      } else {
        const f = {
          nome: user?.user_metadata?.full_name || userEmail.split("@")[0] || "",
          telefone: user?.user_metadata?.phone || "",
          data_nascimento: user?.user_metadata?.birth_date || "",
        };
        setForm(f);
        setTempForm(f);
      }
    });
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await upsertProfile(userId, userEmail, {
        nome: tempForm.nome,
        telefone: tempForm.telefone || undefined,
        data_nascimento: tempForm.data_nascimento || null,
        plano: profile?.plano ?? "free",
        renda_mensal: profile?.renda_mensal ?? 0,
        meta_economia: profile?.meta_economia ?? 0,
      });
      setProfile(updated);
      setForm(tempForm);
      setEditing(false);
      toast.success("Perfil atualizado!", { duration: 3000 });
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempForm(form);
    setEditing(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const displayName = form.nome || userEmail.split("@")[0] || "Usuário";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const plano = profile?.plano ?? "free";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto">
      {/* Avatar */}
      <div
        className="bg-white rounded-lg border border-[#E0E0E0] p-6 mb-4 text-center"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto">
            <span style={{ fontSize: 28, fontWeight: 700 }}>{avatarLetter}</span>
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-[#E0E0E0] rounded-full flex items-center justify-center shadow-sm hover:bg-[#F5F5F5] transition-colors">
            <Camera size={13} className="text-[#555555]" />
          </button>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700 }} className="text-black">
          {displayName}
        </h2>
        <p style={{ fontSize: 13 }} className="text-[#777777]">{userEmail}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {memberSince && (
            <p style={{ fontSize: 11 }} className="text-[#BBBBBB]">
              Membro desde {memberSince}
            </p>
          )}
          <span
            className="inline-block px-2 py-0.5 rounded-full"
            style={{
              fontSize: 10,
              fontWeight: 600,
              backgroundColor: plano === "pro" ? "#111111" : "#F0F0F0",
              color: plano === "pro" ? "#FFFFFF" : "#555555",
            }}
          >
            {plano === "pro" ? "Plano Pro" : "Plano Free"}
          </span>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div
        className="bg-white rounded-lg border border-[#E0E0E0] mb-4 overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
          <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">
            Dados Pessoais
          </h3>
          {!editing ? (
            <button
              onClick={() => { setTempForm(form); setEditing(true); }}
              className="flex items-center gap-1.5 text-[#555555] hover:text-black transition-colors"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              <Edit3 size={13} />
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 border border-[#E0E0E0] rounded-md text-[#555555] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
                style={{ fontSize: 12 }}
              >
                <X size={12} />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
                style={{ fontSize: 12 }}
              >
                {saving ? (
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Salvar
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-[#F5F5F5]">
          {/* Nome */}
          <div className="px-5 py-4">
            <label style={{ fontSize: 11, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-1.5">
              Nome Completo
            </label>
            {editing ? (
              <input
                type="text"
                value={tempForm.nome}
                onChange={(e) => setTempForm({ ...tempForm, nome: e.target.value })}
                className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 outline-none focus:border-black transition-colors text-black"
                style={{ fontSize: 14 }}
              />
            ) : (
              <p style={{ fontSize: 14, fontWeight: 500 }} className="text-black">
                {form.nome || "—"}
              </p>
            )}
          </div>

          {/* Email (somente leitura) */}
          <div className="px-5 py-4">
            <label style={{ fontSize: 11, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <p style={{ fontSize: 14, fontWeight: 500 }} className="text-black">
              {userEmail}
            </p>
          </div>

          {/* Telefone */}
          <div className="px-5 py-4">
            <label style={{ fontSize: 11, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-1.5">
              Telefone
            </label>
            {editing ? (
              <input
                type="tel"
                value={tempForm.telefone}
                onChange={(e) => setTempForm({ ...tempForm, telefone: e.target.value })}
                placeholder="(11) 99999-0000"
                className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 outline-none focus:border-black transition-colors text-black"
                style={{ fontSize: 14 }}
              />
            ) : (
              <p style={{ fontSize: 14, fontWeight: 500 }} className="text-black">
                {form.telefone || "—"}
              </p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="px-5 py-4">
            <label style={{ fontSize: 11, fontWeight: 500 }} className="text-[#777777] uppercase tracking-wider block mb-1.5">
              Data de Nascimento
            </label>
            {editing ? (
              <input
                type="date"
                value={tempForm.data_nascimento}
                onChange={(e) => setTempForm({ ...tempForm, data_nascimento: e.target.value })}
                className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 outline-none focus:border-black transition-colors text-black"
                style={{ fontSize: 14 }}
              />
            ) : (
              <p style={{ fontSize: 14, fontWeight: 500 }} className="text-black">
                {form.data_nascimento
                  ? new Date(form.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Configurações */}
      <div
        className="bg-white rounded-lg border border-[#E0E0E0] mb-4 overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h3 style={{ fontSize: 14, fontWeight: 600 }} className="text-black">
            Configurações
          </h3>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
              <Bell size={15} className="text-[#555555]" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">Notificações</p>
              <p style={{ fontSize: 11 }} className="text-[#999999]">Alertas de gastos e limites</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNotifications(!notifications);
              toast.success(notifications ? "Notificações desativadas" : "Notificações ativadas", { duration: 2000 });
            }}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifications ? "bg-black" : "bg-[#E0E0E0]"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifications ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
              <DollarSign size={15} className="text-[#555555]" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">Moeda</p>
              <p style={{ fontSize: 11 }} className="text-[#999999]">Moeda padrão para exibição</p>
            </div>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border border-[#E0E0E0] rounded-md px-2 py-1 text-black outline-none focus:border-black bg-white"
            style={{ fontSize: 12 }}
          >
            <option value="BRL">R$ BRL</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
              <Globe size={15} className="text-[#555555]" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">Idioma</p>
              <p style={{ fontSize: 11 }} className="text-[#999999]">Idioma da interface</p>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-[#E0E0E0] rounded-md px-2 py-1 text-black outline-none focus:border-black bg-white"
            style={{ fontSize: 12 }}
          >
            <option>Português</option>
            <option>English</option>
            <option>Español</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
              <Shield size={15} className="text-[#555555]" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }} className="text-black">Segurança</p>
              <p style={{ fontSize: 11 }} className="text-[#999999]">Alterar senha e autenticação</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#BBBBBB]" />
        </div>
      </div>

      {/* Logout */}
      {!showLogoutConfirm ? (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 border border-[#E0E0E0] rounded-lg text-[#D32F2F] hover:bg-[#FFEBEE] hover:border-[#D32F2F] transition-colors flex items-center justify-center gap-2"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <LogOut size={16} />
          Sair da Conta
        </button>
      ) : (
        <div
          className="bg-white border border-[#E0E0E0] rounded-lg p-5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <p style={{ fontSize: 14, fontWeight: 600 }} className="text-black mb-1">
            Confirmar saída?
          </p>
          <p style={{ fontSize: 13 }} className="text-[#777777] mb-4">
            Você será desconectado da sua conta.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loggingOut}
              className="flex-1 py-2.5 border border-[#E0E0E0] rounded-lg text-[#333333] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              Cancelar
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 py-2.5 bg-[#D32F2F] text-white rounded-lg hover:bg-[#B71C1C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {loggingOut ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
              {loggingOut ? "Saindo..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11 }} className="text-center text-[#BBBBBB] mt-6">
        Open Finance v1.0.0 · © {new Date().getFullYear()}
      </p>
    </div>
  );
}
