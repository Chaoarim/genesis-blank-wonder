import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, Mail, Lock, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAILS = ["mauricio.chaparim@gmail.com", "consultapecasai@gmail.com"];

function formatCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12)].filter(Boolean);
  return parts.join("-");
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const redirectTo = typeof location.state?.redirectTo === "string" ? location.state.redirectTo : null;

  const goAfterLogin = async (userId: string, userEmail: string | null) => {
    const { data: sellerData } = await supabase
      .from("seller_users").select("id")
      .eq("seller_auth_id", userId).eq("is_active", true).maybeSingle();
    const isAdmin = ADMIN_EMAILS.includes((userEmail ?? "").toLowerCase());
    if (redirectTo === "/admin" && isAdmin) return navigate("/admin", { replace: true });
    if (redirectTo && redirectTo !== "/admin") return navigate(redirectTo, { replace: true });
    if (isAdmin) return navigate("/admin", { replace: true });
    navigate("/autoiq", { replace: true });
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-with-code", { body: { code } });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Código inválido");
        return;
      }
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Acesso liberado!");
        await goAfterLogin(data.session.user.id, data.session.user.email);
      }
    } catch (err) {
      toast.error("Erro ao validar código");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (error) {
        toast.error(error.message.includes("Invalid") ? "Email ou senha incorretos" : error.message);
        return;
      }
      if (data.user) {
        toast.success("Login realizado com sucesso!");
        await goAfterLogin(data.user.id, data.user.email ?? null);
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/sales" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">ConsultaParts AI</span>
          </Link>
        </div>

        <Card className="p-8 glass-card">
          <h1 className="text-2xl font-bold text-center mb-6">Entrar na conta</h1>

          <form onSubmit={handleCodeLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de 12 dígitos</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="code"
                  placeholder="XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  className="pl-10 font-mono tracking-wider text-center"
                  maxLength={14}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Você recebeu o código por WhatsApp após o pagamento.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.replace(/-/g, "").length !== 12}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validando...</> : "Acessar sistema"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Ainda não tem código?{" "}
              <Link to="/pagamento" className="text-primary hover:underline font-medium">
                Pagar e receber acesso
              </Link>
            </p>
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/sales" className="hover:text-primary">← Voltar para página inicial</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
