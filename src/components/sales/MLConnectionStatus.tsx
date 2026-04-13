import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function MLConnectionStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setConnected(false); return; }

      const { data } = await (supabase.from('ml_tokens') as any)
        .select('ml_nickname, expires_at')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const expired = new Date(data.expires_at).getTime() < Date.now();
        setConnected(!expired);
        setNickname(data.ml_nickname || '');
        setExpiresAt(data.expires_at);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }

  if (connected === null) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {connected ? (
        <>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
            <Wifi className="w-3 h-3" />
            ML Conectado{nickname ? ` — ${nickname}` : ''}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2"
            onClick={checkConnection}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </>
      ) : (
        <>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
            <WifiOff className="w-3 h-3" />
            ML Desconectado
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2"
            onClick={() => navigate('/ml-auth')}
          >
            Conectar
          </Button>
        </>
      )}
    </div>
  );
}
