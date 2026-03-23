import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Users, BarChart3, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';

const STORAGE_KEY = 'saleshub_onboarding_done';

const STEPS = [
  {
    icon: PlusCircle,
    title: 'Crie sua primeira venda',
    description: 'Use o módulo "Nova Venda" para registrar pedidos com busca rápida de produtos do seu estoque.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Package,
    title: 'Importe seu estoque',
    description: 'Vá em Estoque → Importar e envie sua planilha Excel/CSV para cadastrar todos os produtos de uma vez.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Users,
    title: 'Cadastre seus clientes',
    description: 'Adicione clientes com telefone, endereço e limite de crédito para agilizar suas vendas futuras.',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Acompanhe pelo Dashboard',
    description: 'O Dashboard mostra faturamento, vendas do dia, ticket médio e metas em tempo real.',
    color: 'from-amber-500 to-orange-600',
  },
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setOpen(true);
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Guia de Início</DialogTitle>
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="p-6 text-center space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Passo {step + 1} de {STEPS.length}</p>
            <h3 className="text-lg font-bold">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {current.description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>

          {isLast ? (
            <Button size="sm" onClick={finish} className="gap-1">
              <Rocket className="w-4 h-4" /> Começar!
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
