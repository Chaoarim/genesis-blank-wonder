import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Sales = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">AutoIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <a
              href="https://pay.kiwify.com.br/mOT3bbr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="bg-gradient-to-r from-primary to-amber-600 text-primary-foreground font-semibold">
                Assinar R$49,00
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Placeholder */}
      <main className="flex-1 flex items-center justify-center">
        <h1 className="text-4xl font-bold text-muted-foreground">
          LANDING PAGE AUTOIQ
        </h1>
      </main>
    </div>
  );
};

export default Sales;
