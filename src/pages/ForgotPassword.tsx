import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, ArrowLeft, MessageCircle, Phone, User } from "lucide-react";

const ForgotPassword = () => {
  const openWhatsApp = () => {
    const message = encodeURIComponent(
      "Olá Mauricio! Esqueci minha senha e preciso de ajuda para recuperar o acesso à minha conta no ConsultaParts AI."
    );
    window.open(`https://wa.me/5519981878489?text=${message}`, "_blank");
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
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Esqueceu sua senha?</h1>
          <p className="text-center text-muted-foreground mb-6">
            Entre em contato com nosso suporte para recuperar o acesso à sua conta.
          </p>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Responsável</p>
                <p className="font-semibold">Mauricio Chaparim</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suporte WhatsApp</p>
                <p className="font-semibold">(19) 98187-8489</p>
              </div>
            </div>
          </div>

          <Button onClick={openWhatsApp} className="w-full" size="lg">
            <MessageCircle className="w-5 h-5 mr-2" />
            Entrar em Contato pelo WhatsApp
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="text-primary hover:underline">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Voltar para o login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
