import { supabase } from "@/integrations/supabase/client";

interface MLCallbackSuccessPayload {
  ok?: boolean;
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface MLAuthorizationExchangeResult {
  success: boolean;
  error?: string;
  data?: MLCallbackSuccessPayload;
}

let pendingExchange:
  | {
      code: string;
      promise: Promise<MLAuthorizationExchangeResult>;
    }
  | null = null;

export function isMLCallbackSuccess(data: unknown): data is MLCallbackSuccessPayload {
  return Boolean(
    data &&
      typeof data === "object" &&
      (Boolean((data as MLCallbackSuccessPayload).ok) ||
        Boolean((data as MLCallbackSuccessPayload).success))
  );
}

export async function exchangeMLAuthorizationCode(
  code: string
): Promise<MLAuthorizationExchangeResult> {
  if (pendingExchange?.code === code) {
    return pendingExchange.promise;
  }

  const promise = (async (): Promise<MLAuthorizationExchangeResult> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: "Faça login antes de conectar o Mercado Livre.",
        };
      }

      const { data, error } = await supabase.functions.invoke("ml-callback", {
        body: { code },
      });

      if (error || !isMLCallbackSuccess(data)) {
        return {
          success: false,
          error:
            (data as MLCallbackSuccessPayload | null)?.error ||
            error?.message ||
            "Erro ao conectar ML",
          data: (data as MLCallbackSuccessPayload | null) || undefined,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao conectar ML",
      };
    } finally {
      pendingExchange = null;
    }
  })();

  pendingExchange = { code, promise };
  return promise;
}