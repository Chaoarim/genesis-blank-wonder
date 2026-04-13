import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Faça login antes de conectar o Mercado Livre.");
          setDone(true);
          return;
        }

        toast.info("Conectando ao Mercado Livre...");
        const { data, error } = await supabase.functions.invoke("ml-callback", {
          body: { code },
        });

        if (error || !data?.ok) {
          toast.error(data?.error || error?.message || "Erro ao conectar ML");
        } else {
          toast.success("Mercado Livre conectado com sucesso!");
        }
      } catch (e: any) {
        toast.error(e.message || "Erro ao conectar ML");
      } finally {
        setDone(true);
      }
    })();
  }, [code]);

  if (!code) {
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
