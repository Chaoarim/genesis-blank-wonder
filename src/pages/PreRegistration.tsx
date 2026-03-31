import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Zap, ArrowLeft, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { preRegistrationSchema, passwordSchema } from "@/features/pre-registration/schema";
import { digitsOnly, formatWhatsapp } from "@/features/pre-registration/format";
import { KIWIFY_CHECKOUT_URL } from "@/lib/kiwify";

const PreRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    full_name: "",
    email: "",
    whatsapp: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string) => {
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      return result.error.errors.map(e => e.message);
    }
    return [];
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, password: value }));
    setPasswordErrors(validatePassword(value));
    setErrors(prev => ({ ...prev, password: "" }));
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { label: "", color: "" };
    if (password.length < 8) return { label: "Fraca", color: "text-destructive" };
    if (passwordErrors.length === 0) return { label: "Forte", color: "text-green-500" };
    if (passwordErrors.length <= 2) return { label: "Média", color: "text-yellow-500" };
    return { label: "Fraca", color: "text-destructive" };
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let formattedValue = value;

    if (name === "whatsapp") {
      formattedValue = formatWhatsapp(value);
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = preRegistrationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("pre_registrations").insert({
        company_name: formData.company_name.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        whatsapp: digitsOnly(formData.whatsapp),
        password_hash: formData.password,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          if (error.message.includes("email")) {
            setErrors({ email: "Este email já está cadastrado" });
          } else {
            toast.error("Dados já cadastrados");
          }
          return;
        }

        // RLS / validação server-side
        if (
          error.code === "42501" ||
          error.message.toLowerCase().includes("row-level security")
        ) {
          toast.error("Dados inválidos. Confira os campos e tente novamente.");
          return;
        }

        throw error;
      }

      toast.success("Pré-cadastro realizado com sucesso! Redirecionando para o pagamento...");
      window.location.href = KIWIFY_CHECKOUT_URL;
    } catch (error) {
      console.error("Erro ao fazer pré-cadastro:", error);
      toast.error("Erro ao realizar pré-cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ConsultaParts AI</span>
          </Link>
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card className="p-8 glass-card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Pré-Cadastro</h1>
            <p className="text-muted-foreground">
              Preencha seus dados para solicitar acesso à plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa *</Label>
              <Input
                id="company_name"
                name="company_name"
                type="text"
                placeholder="Digite o nome da sua empresa"
                value={formData.company_name}
                onChange={handleChange}
                autoComplete="organization"
                className={errors.company_name ? "border-destructive" : ""}
              />
              {errors.company_name && (
                <p className="text-sm text-destructive">{errors.company_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Seu Nome *</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Digite seu nome"
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                className={errors.full_name ? "border-destructive" : ""}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                value={formData.whatsapp}
                onChange={handleChange}
                maxLength={15}
                autoComplete="tel"
                className={errors.whatsapp ? "border-destructive" : ""}
              />
              {errors.whatsapp && (
                <p className="text-sm text-destructive">{errors.whatsapp}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie uma senha forte"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Força:</span>
                    <span className={`text-sm font-medium ${getPasswordStrength().color}`}>
                      {getPasswordStrength().label}
                    </span>
                  </div>
                  <ul className="text-xs space-y-1">
                    <li className={formData.password.length >= 8 ? "text-green-500" : "text-muted-foreground"}>
                      ✓ Mínimo 8 caracteres
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? "text-green-500" : "text-muted-foreground"}>
                      ✓ Uma letra maiúscula
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? "text-green-500" : "text-muted-foreground"}>
                      ✓ Uma letra minúscula
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? "text-green-500" : "text-muted-foreground"}>
                      ✓ Um número
                    </li>
                  </ul>
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Pré-Cadastro"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default PreRegistration;
