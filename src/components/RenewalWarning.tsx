import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface SubscriptionInfo {
  expires_at: string | null;
  status: string | null;
  plan: string | null;
}

export function RenewalWarning() {
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try by user_id first, then by email via profile
      const { data } = await supabase
        .from('user_subscriptions')
        .select('expires_at, status, plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        setSub(data);
        return;
      }

      // Fallback: match by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.email) {
        const { data: subByEmail } = await supabase
          .from('user_subscriptions')
          .select('expires_at, status, plan')
          .eq('email', profile.email)
          .eq('status', 'active')
          .maybeSingle();

        if (subByEmail) setSub(subByEmail);
      }
    };

    fetch();
  }, []);

  if (dismissed || !sub?.expires_at) return null;

  const expiresAt = new Date(sub.expires_at);
  const now = new Date();
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Show warning when 7 days or less remaining
  if (daysLeft > 7) return null;

  const isExpired = daysLeft <= 0;

  return (
    <Card className={`p-4 border-2 ${isExpired ? 'border-destructive bg-destructive/10' : 'border-amber-500 bg-amber-500/10'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isExpired ? 'bg-destructive/20' : 'bg-amber-500/20'}`}>
          <AlertTriangle className={`w-5 h-5 ${isExpired ? 'text-destructive' : 'text-amber-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm ${isExpired ? 'text-destructive' : 'text-amber-500'}`}>
            {isExpired ? '⚠️ Assinatura Expirada!' : `⏰ Sua assinatura vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}!`}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isExpired
              ? 'Renove agora para continuar usando o sistema sem interrupções.'
              : `Vencimento: ${expiresAt.toLocaleDateString('pt-BR')}. Renove para não perder o acesso.`}
          </p>
          <Button
            size="sm"
            className="mt-3 gap-2"
            variant={isExpired ? 'destructive' : 'default'}
            onClick={() => navigate('/renovacao-pix')}
          >
            <RefreshCw className="w-4 h-4" />
            Renovar Agora
          </Button>
        </div>
        {!isExpired && (
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setDismissed(true)}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
