import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const ML_CLIENT_ID = '7461192017586183';
const REDIRECT_URI = 'https://partsai.online/';
const ML_AUTH_URL = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

export default function MLAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      exchangeCode(code);
    }
  }, [code]);

  async function exchangeCode(authCode: string) {
    setStatus('processing');
    setMessage('Trocando código por token de acesso...');

    try {
      const { data, error } = await supabase.functions.invoke('ml-callback', {
        body: { code: authCode },
      });

      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Falha na autorização');

      setStatus('success');
      setMessage(`Conectado como ${data.ml_nickname || 'Mercado Livre'}!`);
      toast.success('Mercado Livre conectado com sucesso!');

      // Redirect to radar after 2s
      setTimeout(() => navigate('/radar-ml'), 2000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Erro ao conectar com Mercado Livre');
      toast.error('Falha ao conectar com Mercado Livre');
    }
  }

  function handleConnect() {
    window.location.href = ML_AUTH_URL;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Conectar Mercado Livre</CardTitle>
          <CardDescription>
            Autorize sua conta do Mercado Livre para acessar dados de mercado em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && !code && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Ao conectar, o sistema poderá consultar preços, vendas e concorrência
                diretamente da API oficial do Mercado Livre.
              </p>
              <Button onClick={handleConnect} className="w-full" size="lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar com Mercado Livre
              </Button>
              <Button variant="ghost" onClick={() => navigate('/radar-ml')} className="w-full">
                Voltar ao Radar
              </Button>
            </>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-sm font-medium text-green-600">{message}</p>
              <p className="text-xs text-muted-foreground">Redirecionando para o Radar...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm font-medium text-red-600">{message}</p>
              <Button onClick={handleConnect} className="w-full mt-2">
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={() => navigate('/radar-ml')} className="w-full">
                Voltar ao Radar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
