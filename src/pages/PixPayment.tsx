import { useEffect } from "react";

const PixPayment = () => {
  // Redirect to Kiwify checkout
  useEffect(() => {
    window.location.href = "https://pay.kiwify.com.br/ypjX6Fv";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando para o pagamento...</p>
    </div>
  );
};

export default PixPayment;
