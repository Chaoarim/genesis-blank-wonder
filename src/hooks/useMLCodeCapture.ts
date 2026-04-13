import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook that checks for ML OAuth ?code= param on mount.
 * If found, exchanges it via ml-callback and redirects to /radar-ml.
 */
export function useMLCodeCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Faça login antes de conectar o Mercado Livre.");
          navigate("/login", { replace: true });
          return;
        }

        toast.info("Conectando ao Mercado Livre...");

        const { data, error } = await supabase.functions.invoke("ml-callback", {
          body: { code },
        });

        if (error || !data?.ok) {
          toast.error(data?.error || error?.message || "Erro ao conectar ML");
          navigate("/radar-ml", { replace: true });
          return;
        }

        toast.success("Mercado Livre conectado com sucesso!");
        navigate("/radar-ml", { replace: true });
      } catch (e: any) {
        toast.error(e.message || "Erro ao conectar ML");
        navigate("/radar-ml", { replace: true });
      }
    })();
  }, [searchParams, navigate]);
}
