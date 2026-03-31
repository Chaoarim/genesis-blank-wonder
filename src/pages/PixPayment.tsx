import { useEffect } from "react";
import { KIWIFY_CHECKOUT_URL } from "@/lib/kiwify";

const PixPayment = () => {
  // Redirect to Kiwify checkout
  useEffect(() => {
    window.location.href = KIWIFY_CHECKOUT_URL;
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando para o pagamento...</p>
    </div>
  );
};

export default PixPayment;
