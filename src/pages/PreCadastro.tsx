import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function PreCadastro() {
  const [form, setForm] = useState({ full_name: "", email: "", whatsapp: "", company_name: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.whatsapp) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("pre_registrations").insert({
      full_name: form.full_name,
      email: form.email,
      whatsapp: form.whatsapp,
      company_name: form.company_name || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    // Redireciona para o pagamento Pix (Kiwify)
    setTimeout(() => {
      window.location.href = "https://pay.kiwify.com.br/jSs0cc0";
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center text-white text-lg">⚡</div>
        <h1 className="text-2xl font-semibold">ConsultaParts AI</h1>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-xl p-7">
        <h2 className="text-xl font-semibold text-center mb-1">Fazer pré-cadastro</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Preencha seus dados e siga para o pagamento via Pix.
        </p>

        {submitted ? (
          <div className="text-center py-6">
            <p className="text-amber-600 font-medium mb-2">✓ Pré-cadastro recebido!</p>
            <p className="text-sm text-muted-foreground">Redirecionando para o pagamento Pix…</p>
          </div>
        ) : (
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
        )}
      </div>

      <Link to="/sales" className="mt-8 text-sm text-muted-foreground hover:text-foreground">
        ← Voltar para página inicial
      </Link>
    </div>
  );
}
