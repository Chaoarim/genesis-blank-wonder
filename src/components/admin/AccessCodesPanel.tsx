import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2, KeyRound, Ban, MessageCircle, RefreshCw } from "lucide-react";

type AccessCode = {
  id: string;
  code: string;
  status: string;
  recovery_email: string | null;
  notes: string | null;
  created_at: string;
  last_login_at: string | null;
  revoked_at: string | null;
  is_admin: boolean;
};

export function AccessCodesPanel() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_codes")
      .select("id,code,status,recovery_email,notes,created_at,last_login_at,revoked_at,is_admin")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar códigos");
    else setCodes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-access-code", {
        body: { recovery_email: recoveryEmail || null, notes: notes || null },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao gerar código");
        return;
      }
      toast.success(`Código gerado: ${data.code}`);
      setRecoveryEmail(""); setNotes("");
      await load();
    } finally { setGenerating(false); }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const sendWhatsApp = (code: string, notesText: string | null) => {
    const msg = encodeURIComponent(
      `Olá${notesText ? ` ${notesText}` : ""}! 🎉\n\nPagamento confirmado. Aqui está seu código de acesso ao AutoIQ:\n\n*${code}*\n\nAcesse: https://novopecai.lovable.app/login\nCole o código e clique em "Acessar sistema".\n\nGuarde esse código com cuidado — ele é único e seu acesso permanente.`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const revoke = async (id: string) => {
    if (!confirm("Revogar este código? O cliente perderá o acesso.")) return;
    const { error } = await supabase.from("access_codes")
      .update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Erro ao revogar");
    else { toast.success("Código revogado"); load(); }
  };

  const reactivate = async (id: string) => {
    const { error } = await supabase.from("access_codes")
      .update({ status: "active", revoked_at: null }).eq("id", id);
    if (error) toast.error("Erro ao reativar");
    else { toast.success("Código reativado"); load(); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Gerar novo código de acesso</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="rec-email">E-mail de recuperação (opcional)</Label>
            <Input id="rec-email" type="email" placeholder="cliente@email.com"
              value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="notes">Identificação (opcional)</Label>
            <Input id="notes" placeholder="Ex: João Silva — pagou R$ 59,90"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button onClick={generate} disabled={generating} className="mt-4">
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</> : <><KeyRound className="w-4 h-4 mr-2" />Gerar código</>}
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Códigos gerados ({codes.length})</h2>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum código gerado ainda.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-3">
                <code className="font-mono text-base font-semibold tracking-wider">{c.code}</code>
                <Badge variant={c.status === "active" ? "default" : "secondary"}>
                  {c.status === "active" ? "Ativo" : "Revogado"}
                </Badge>
                {c.notes && <span className="text-sm text-muted-foreground">{c.notes}</span>}
                {c.recovery_email && <span className="text-xs text-muted-foreground">📧 {c.recovery_email}</span>}
                <span className="text-xs text-muted-foreground ml-auto">
                  {c.last_login_at ? `Último acesso: ${new Date(c.last_login_at).toLocaleDateString("pt-BR")}` : "Nunca usado"}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => copyCode(c.code)}><Copy className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => sendWhatsApp(c.code, c.notes)}>
                    <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
                  </Button>
                  {c.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => revoke(c.id)}>
                      <Ban className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => reactivate(c.id)}>Reativar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
