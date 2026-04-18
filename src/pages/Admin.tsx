import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AccessCodesPanel } from "@/components/admin/AccessCodesPanel";

const ADMIN_EMAILS = ["mauricio.chaparim@gmail.com", "consultapecasai@gmail.com"];

type PreReg = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  company_name: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
};

type Subscription = {
  id: string;
  email: string;
  status: string | null;
  plan: string | null;
  started_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function Admin() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [pres, setPres] = useState<PreReg[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"pendentes" | "ativos" | "codigos">("codigos");

  useEffect(() => {
    const check = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        await supabase.auth.signOut();
        navigate("/login", { state: { redirectTo: "/admin" }, replace: true });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const isAllowedAdminEmail = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
      if (!roleRow && !isAllowedAdminEmail) {
        toast({ title: "Acesso negado", description: "Apenas o administrador pode acessar.", variant: "destructive" });
        navigate("/sales");
        return;
      }
      setAuthChecked(true);
      loadAll();
    };
    check();
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("pre_registrations").select("*").order("created_at", { ascending: false }),
      supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    setPres((p as PreReg[]) || []);
    setSubs((s as Subscription[]) || []);
    setLoading(false);
  };

  const approve = async (pr: PreReg) => {
    if (!confirm(`Liberar acesso para ${pr.email}?`)) return;
    // 1. Marca pré-cadastro como aprovado
    const { error: e1 } = await supabase
      .from("pre_registrations")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", pr.id);
    if (e1) return toast({ title: "Erro", description: e1.message, variant: "destructive" });

    // 2. Cria/atualiza assinatura ativa
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const { error: e2 } = await supabase.from("user_subscriptions").upsert(
      {
        email: pr.email,
        status: "active",
        plan: "mensal_5990",
        started_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
      },
      { onConflict: "email" }
    );
    if (e2) return toast({ title: "Erro assinatura", description: e2.message, variant: "destructive" });

    toast({ title: "Acesso liberado!", description: `${pr.email} pode entrar agora.` });
    loadAll();
  };

  const block = async (sub: Subscription) => {
    if (!confirm(`Bloquear acesso de ${sub.email}?`)) return;
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status: "blocked" })
      .eq("id", sub.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Acesso bloqueado" });
    loadAll();
  };

  const unblock = async (sub: Subscription) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status: "active", expires_at: expires.toISOString() })
      .eq("id", sub.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Acesso reativado" });
    loadAll();
  };

  const reject = async (pr: PreReg) => {
    if (!confirm(`Rejeitar pré-cadastro de ${pr.email}?`)) return;
    const { error } = await supabase
      .from("pre_registrations")
      .update({ status: "rejected" })
      .eq("id", pr.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Pré-cadastro rejeitado" });
    loadAll();
  };

  const removeSub = async (sub: Subscription) => {
    if (!confirm(`Excluir definitivamente ${sub.email}?\n\nIsto remove o assinante e o pré-cadastro.`)) return;
    const { error } = await supabase.from("user_subscriptions").delete().eq("id", sub.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await supabase.from("pre_registrations").delete().eq("email", sub.email);
    toast({ title: "Usuário excluído" });
    loadAll();
  };

  const resetPassword = async (sub: Subscription) => {
    if (!confirm(`Enviar link de redefinição de senha para ${sub.email}?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(sub.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Link enviado", description: `${sub.email} receberá o e-mail para criar nova senha.` });
  };

  const saveNotes = async (sub: Subscription, notes: string) => {
    const { error } = await supabase.from("user_subscriptions").update({ notes }).eq("id", sub.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Observação salva" });
    loadAll();
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Verificando acesso…</div>;
  }

  const pendentes = pres.filter((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Administração</h1>
            <p className="text-sm text-muted-foreground">Controle de acesso de assinantes AutoIQ</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/login"))}
            className="text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg"
          >
            Sair
          </button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-border">
          <button
            onClick={() => setTab("pendentes")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "pendentes" ? "border-amber-600 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pendentes ({pendentes.length})
          </button>
          <button
            onClick={() => setTab("ativos")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "ativos" ? "border-amber-600 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Assinantes ({subs.length})
          </button>
          <button
            onClick={() => setTab("codigos")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "codigos" ? "border-amber-600 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Códigos de acesso
          </button>
        </div>

        {tab === "codigos" && <AccessCodesPanel />}

        {loading && tab !== "codigos" && <div className="text-center text-muted-foreground py-8">Carregando…</div>}

        {tab === "pendentes" && !loading && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum pré-cadastro pendente</td></tr>
                ) : pendentes.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3">{p.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.email}</td>
                    <td className="px-4 py-3">
                      <a href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                        {p.whatsapp}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.company_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => approve(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-md">
                        ✓ Liberar
                      </button>
                      <button onClick={() => reject(p)} className="bg-muted hover:bg-muted/70 text-foreground text-xs px-3 py-1.5 rounded-md">
                        Rejeitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "ativos" && !loading && (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Ativação</th>
                  <th className="px-3 py-3 font-medium">Inativo desde</th>
                  <th className="px-3 py-3 font-medium">Expira</th>
                  <th className="px-3 py-3 font-medium">Observações</th>
                  <th className="px-3 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum assinante</td></tr>
                ) : subs.map((s) => {
                  const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
                  const statusColor =
                    s.status === "active" && !isExpired ? "bg-emerald-100 text-emerald-700" :
                    s.status === "blocked" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700";
                  const statusLabel = isExpired && s.status === "active" ? "Em atraso" : s.status || "—";
                  const inactiveDate = s.status === "blocked" ? s.updated_at : null;
                  return (
                    <tr key={s.id} className="border-t border-border align-top">
                      <td className="px-3 py-3 font-mono text-xs">{s.email}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {inactiveDate ? new Date(inactiveDate).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          defaultValue={s.notes || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (s.notes || "")) saveNotes(s, e.target.value);
                          }}
                          placeholder="Anotações…"
                          className="w-48 min-h-[40px] text-xs bg-background border border-border rounded px-2 py-1 resize-y"
                        />
                      </td>
                      <td className="px-3 py-3 text-right space-y-1 whitespace-nowrap">
                        {s.status === "blocked" ? (
                          <button onClick={() => unblock(s)} className="block ml-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-md">
                            Reativar
                          </button>
                        ) : (
                          <button onClick={() => block(s)} className="block ml-auto bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md">
                            Bloquear
                          </button>
                        )}
                        <button onClick={() => resetPassword(s)} className="block ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md">
                          Resetar senha
                        </button>
                        <button onClick={() => removeSub(s)} className="block ml-auto bg-muted hover:bg-muted/70 text-foreground text-xs px-3 py-1.5 rounded-md">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
