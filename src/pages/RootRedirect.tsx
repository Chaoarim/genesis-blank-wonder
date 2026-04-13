import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { exchangeMLAuthorizationCode } from "@/features/ml/exchangeAuthorizationCode";

/**
 * Root route handler. If ML OAuth ?code= is present, exchanges it.
 * Otherwise redirects to /sales.
 */
export default function RootRedirect() {
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) return;
    setProcessing(true);
    let cancelled = false;

    (async () => {
      try {
        console.log("[ML OAuth] Código recebido na URL principal, iniciando troca.");
        toast.info("Conectando ao Mercado Livre...");

        const result = await exchangeMLAuthorizationCode(code);
        if (cancelled) {
          return;
        }

        if (!result.success) {
          toast.error(result.error || "Erro ao conectar ML");
        } else {
          console.log("Token ML salvo:", result.data);
          window.history.replaceState({}, "", "/");
          toast.success("Mercado Livre conectado com sucesso!");
        }
      } catch (e: any) {
        if (!cancelled) {
          toast.error(e.message || "Erro ao conectar ML");
        }
      } finally {
        if (!cancelled) {
          setDone(true);
          setProcessing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code && !processing) {
    return <Navigate to="/sales" replace />;
  }

  if (done) {
    return <Navigate to="/radar-ml" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground animate-pulse">Conectando ao Mercado Livre...</p>
    </div>
  );
}
