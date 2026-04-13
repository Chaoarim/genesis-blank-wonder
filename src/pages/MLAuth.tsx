import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { exchangeMLAuthorizationCode } from "@/features/ml/exchangeAuthorizationCode";

const ML_CLIENT_ID = "7461192017586183";
const REDIRECT_URI = "https://partsai.online/";
const AUTH_URL = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read`;

export default function MLAuth() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      exchangeCode(code);
    }
  }, []);

  async function exchangeCode(code: string) {
    setStatus("loading");
    try {
      console.log("[ML OAuth] Código recebido na rota /ml-auth, iniciando troca.");
      const result = await exchangeMLAuthorizationCode(code);

      if (!result.success) {
        setError(result.error || "Erro ao trocar código por token");
        setStatus("error");
        return;
      }

      console.log("Token ML salvo:", result.data);
      window.history.replaceState({}, "", "/ml-auth");
      setStatus("success");
      setTimeout(() => navigate("/radar-ml"), 2000);
    } catch (e: any) {
      setError(e.message || "Erro desconhecido");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Conectar Mercado Livre</CardTitle>
          <CardDescription>
            Autorize o acesso para usar o Radar de Mercado com dados em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "idle" && (
            <Button size="lg" className="w-full" asChild>
              <a href={AUTH_URL}>
                <ExternalLink className="mr-2 h-5 w-5" />
                Conectar com Mercado Livre
              </a>
            </Button>
          )}
          {status === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Trocando código por token...
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Conectado com sucesso! Redirecionando...
            </div>
          )}
          {status === "error" && (
            <div className="space-y-3 w-full text-center">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                {error}
              </div>
              <Button variant="outline" onClick={() => { setStatus("idle"); setError(""); }}>
                Tentar novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
