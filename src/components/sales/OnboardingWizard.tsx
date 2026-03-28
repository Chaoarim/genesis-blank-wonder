import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Percent, Users, PlusCircle, ChevronRight, ChevronLeft, Rocket, PartyPopper, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const STORAGE_KEY = 'saleshub_onboarding_done';

interface StepDef {
  icon: typeof FileSpreadsheet;
  title: string;
  description: string;
  cta: string;
  tab: string;
  color: string;
  tip: string;
}

const STEPS: StepDef[] = [
  {
    icon: FileSpreadsheet,
    title: 'Importe seu estoque',
    description: 'Envie sua planilha Excel ou CSV com todos os produtos para começar a vender rapidamente.',
    cta: 'Importar Planilha',
    tab: 'import-inventory',
    color: 'from-blue-500 to-cyan-600',
    tip: '💡 Aceita .xlsx, .xls e .csv — o sistema lê automaticamente.',
  },
  {
    icon: Percent,
    title: 'Configure seu markup',
    description: 'Defina as margens de lucro para distribuidores e revendas. Pode alterar depois.',
    cta: 'Configurar Markup',
    tab: 'markup',
    color: 'from-amber-500 to-orange-600',
    tip: '💡 Ex: 30% revenda, 15% distribuidor — ajuste quando quiser.',
  },
  {
    icon: Users,
    title: 'Cadastre seu primeiro cliente',
    description: 'Adicione clientes com telefone, endereço e limite de crédito para agilizar as vendas.',
    cta: 'Cadastrar Cliente',
    tab: 'customers',
    color: 'from-purple-500 to-violet-600',
    tip: '💡 Você pode importar clientes em lote depois também.',
  },
  {
    icon: PlusCircle,
    title: 'Faça sua primeira venda!',
    description: 'Pronto! Use a busca rápida de produtos do estoque para registrar seu primeiro pedido.',
    cta: 'Criar Venda',
    tab: 'new-sale',
    color: 'from-green-500 to-emerald-600',
    tip: '💡 Busque por código ou nome — o sistema encontra no seu estoque.',
  },
];

interface OnboardingWizardProps {
  onNavigate?: (tab: string) => void;
}

export function OnboardingWizard({ onNavigate }: OnboardingWizardProps) {
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

  const goToStep = () => {
    const target = STEPS[step].tab;
    finish();
    onNavigate?.(target);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Bem-vindo ao ConsultaParts</DialogTitle>

        {/* Header with welcome */}
        {step === 0 && (
          <div className="px-6 pt-6 pb-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <PartyPopper className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600">Bem-vindo ao ConsultaParts!</span>
            </div>
            <p className="text-xs text-muted-foreground">Vamos configurar seu sistema em 4 passos rápidos</p>
          </div>
        )}

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Passo {step + 1} de {STEPS.length}
            </span>
            <span className="text-xs font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step content */}
        <div className="p-6 text-center space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>

          <div>
            <h3 className="text-lg font-bold">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Tip */}
          <div className="bg-muted/50 rounded-lg px-4 py-2.5 text-xs text-muted-foreground text-left">
            {current.tip}
          </div>

          {/* CTA */}
          <Button
            onClick={goToStep}
            className={`w-full gap-2 bg-gradient-to-r ${current.color} text-white hover:opacity-90 transition-opacity`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {current.cta}
          </Button>
        </div>

        {/* Navigation */}
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

          <Button variant="link" size="sm" onClick={finish} className="text-muted-foreground text-xs">
            Pular tutorial
          </Button>

          {isLast ? (
            <Button size="sm" onClick={finish} className="gap-1">
              <Rocket className="w-4 h-4" /> Concluir
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStep(s => s + 1)} className="gap-1">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
