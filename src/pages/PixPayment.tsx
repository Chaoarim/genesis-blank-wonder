import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, ArrowLeft, CheckCircle, Copy, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";
import pixQrCode from "@/assets/pix-qrcode.png";

const PixPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [spotsLeft, setSpotsLeft] = useState(23);

  // Check if user came from pre-registration
  useEffect(() => {
    if (!location.state?.fromPreRegistration) {
      navigate("/pre-cadastro", { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    // Simulate scarcity counter - random between 12 and 28
    const randomSpots = Math.floor(Math.random() * 17) + 12;
    setSpotsLeft(randomSpots);
    
    // Occasionally decrease the counter for urgency effect
    const interval = setInterval(() => {
      setSpotsLeft(prev => {
        if (prev > 8) {
          return prev - 1;
        }
        return prev;
      });
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, []);

  const copyPixKey = () => {
    navigator.clipboard.writeText("consultapecasai@gmail.com");
    toast.success("Chave PIX copiada!");
  };

  const openWhatsApp = () => {
    window.open("https://wa.me/5519981878489?text=Olá! Realizei o pré-cadastro e estou enviando o comprovante de pagamento PIX.", "_blank");
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
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card className="p-8 glass-card">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-6">
            Pré-cadastro Realizado!
          </h1>
          
          <div className="space-y-6">
            {/* Plan Banner */}
            <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide font-semibold mb-1 text-center">🎯 Plano Anual Profissional</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg line-through opacity-70">R$ 480,00</span>
                <span className="text-3xl font-bold">R$ 297,00</span>
                <span className="text-sm opacity-80">/ano</span>
              </div>
              <p className="text-xs text-center opacity-80 mt-1">equivale a R$ 24,75/mês — menos de R$ 1 por dia</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-primary-foreground/15 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold">PIX à vista</p>
                  <p className="text-sm font-bold">R$ 297,00</p>
                </div>
                <div className="bg-primary-foreground/15 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold">Cartão 12x</p>
                  <p className="text-sm font-bold">12x R$ 29,66</p>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm text-center">
              Seu pré-cadastro foi recebido com sucesso. Agora faça o pagamento pelo QR Code PIX abaixo ou se preferir pela chave PIX:
            </p>
            
            {/* PIX Key */}
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">consultapecasai@gmail.com</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyPixKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            {/* QR Code */}
            <div className="border rounded-lg p-6 bg-white">
              <img 
                src={pixQrCode} 
                alt="QR Code PIX para pagamento" 
                className="w-full max-w-[280px] mx-auto"
              />
            </div>
            
            {/* Instructions */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                Após o pagamento, encaminhe o comprovante no WhatsApp{" "}
                <strong>(19) 98187-8489</strong> aos cuidados de{" "}
                <strong>Mauricio Chaparim</strong> para a liberação do seu acesso e concluir sua ativação.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={openWhatsApp} className="w-full" size="lg">
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar Comprovante no WhatsApp
              </Button>
              <Link to="/" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PixPayment;
