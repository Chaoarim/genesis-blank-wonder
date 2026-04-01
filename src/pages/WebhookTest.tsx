import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Play, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { KIWIFY_WEBHOOK_URL } from "@/lib/kiwify";

const WebhookTest = () => {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [evento, setEvento] = useState("compra aprovada");
  const [response, setResponse] = useState("");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const webhookUrl = KIWIFY_WEBHOOK_URL;

  const copyUrl = () => {
    if (!webhookUrl) {
      toast.error("URL do webhook indisponível");
      return;
    }

    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error("URL do webhook indisponível");
      return;
    }

    if (!token) {
      toast.error("Digite o token configurado no Kiwify");
      return;
    }
    if (!email) {
      toast.error("Digite o email do usuário");
      return;
    }

    setTesting(true);
    setResponse("");
    setStatus("idle");

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        evento: evento,
        token: token,
        Customer: {
          email: email.trim().toLowerCase()
        },
        timestamp: new Date().toISOString()
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
      if (res.ok && data.success) {
        setStatus("success");
        toast.success("Webhook processado com sucesso!");
      } else {
        setStatus("error");
        toast.error(`Erro: ${data.error || "Falha no processamento"}`);
      }
    } catch (error) {
      setStatus("error");
      setResponse(JSON.stringify({ error: String(error) }, null, 2));
      toast.error("Erro ao enviar requisição");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl py-8 space-y-6">
        <Link to="/sales" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">🔧 Teste de Webhook Kiwify</h1>
            <p className="text-muted-foreground text-sm">
              Use esta página para testar se o webhook está funcionando corretamente.
            </p>
          </div>

          {/* URL do Webhook */}
          <div className="space-y-2">
            <Label>URL do Webhook (copie para a Kiwify)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={copyUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <hr className="border-border" />

          {/* Token */}
          <div className="space-y-2">
            <Label htmlFor="token">Token de Segurança (KIWIFY_WEBHOOK_TOKEN)</Label>
            <Input
              id="token"
              type="password"
              placeholder="Digite o token configurado"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este é o token que você configurou na Kiwify e no Supabase.
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O email deve ser o MESMO usado no cadastro do app.
            </p>
          </div>

          {/* Evento */}
          <div className="space-y-2">
            <Label htmlFor="evento">Evento</Label>
            <select
              id="evento"
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="compra aprovada">compra aprovada (libera acesso)</option>
              <option value="order_paid">order_paid (libera acesso)</option>
              <option value="assinatura renovada">assinatura renovada (libera acesso)</option>
              <option value="assinatura cancelada">assinatura cancelada (remove acesso)</option>
              <option value="subscription_canceled">subscription_canceled (remove acesso)</option>
            </select>
          </div>

          {/* Botão de Teste */}
          <Button onClick={testWebhook} disabled={testing || !webhookUrl} className="w-full" size="lg">
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Testar Webhook
              </>
            )}
          </Button>

          {/* Resultado */}
          {response && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Resposta:</Label>
                {status === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
              <Textarea
                value={response}
                readOnly
                className={`font-mono text-xs min-h-[120px] ${
                  status === "success" ? "border-green-500" : status === "error" ? "border-red-500" : ""
                }`}
              />
            </div>
          )}
        </Card>

        {/* Instruções */}
        <Card className="p-6 space-y-4">
          <h2 className="font-bold text-lg">📋 Como configurar na Kiwify:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse o painel da Kiwify → Configurações → Webhooks</li>
            <li>Copie a URL acima e cole no campo "URL do Webhook"</li>
            <li>Configure o token de segurança (mesmo valor do KIWIFY_WEBHOOK_TOKEN)</li>
            <li>Selecione os eventos: "Compra aprovada", "Assinatura renovada", "Assinatura cancelada"</li>
            <li>Salve as configurações</li>
          </ol>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm">
            <strong>⚠️ Importante:</strong> O email usado na compra da Kiwify DEVE ser exatamente 
            o mesmo email usado no cadastro do app. Caso contrário, a liberação automática não funcionará.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WebhookTest;
