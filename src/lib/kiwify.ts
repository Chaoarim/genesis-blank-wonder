const supabaseFunctionBaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");

export const KIWIFY_CHECKOUT_URL = "https://pay.kiwify.com.br/jSs0cc0";
export const KIWIFY_WEBHOOK_URL = supabaseFunctionBaseUrl
  ? `${supabaseFunctionBaseUrl}/functions/v1/kiwify-webhook`
  : "";