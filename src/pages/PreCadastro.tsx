import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

export default function PreCadastro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    company_name: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.whatsapp || !form.password) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (form.password !== form.password2) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("pre_registrations").insert({
      full_name: form.full_name,
      email: form.email,
      whatsapp: form.whatsapp,
      company_name: form.company_name || null,
      password_hash: form.password, // será hasheada pelo trigger no banco
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pré-cadastro recebido!", description: "Agora faça o pagamento via Pix." });
    navigate(`/pagamento?email=${encodeURIComponent(form.email)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Logo size={40} />
        <h1 className="text-2xl font-semibold">AutoIQ</h1>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-xl p-7">
        <h2 className="text-xl font-semibold text-center mb-1">Fazer pré-cadastro</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Crie sua conta e siga para o pagamento via Pix.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome completo *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp *</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(11) 99999-9999"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Empresa (opcional)</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Crie uma senha *</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-amber-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirme a senha *</label>
            <div className="relative">
              <input
                type={showPw2 ? "text" : "password"}
                value={form.password2}
                onChange={(e) => setForm({ ...form, password2: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-amber-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw2((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPw2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition-colors mt-2"
          >
            {loading ? "Enviando…" : "Continuar para pagamento Pix →"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            R$59,90/mês · Cancele quando quiser
          </p>
        </form>
      </div>

      <Link to="/sales" className="mt-8 text-sm text-muted-foreground hover:text-foreground">
        ← Voltar para página inicial
      </Link>
    </div>
  );
}
