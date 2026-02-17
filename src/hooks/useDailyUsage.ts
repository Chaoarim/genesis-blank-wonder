import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyUsage {
  remaining: number;
  used: number;
  limit: number;
}

export function useDailyUsage() {
  const [usage, setUsage] = useState<DailyUsage>({ remaining: 200, used: 0, limit: 200 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_daily_usage', { p_user_id: user.id });
      
      if (error) {
        console.error('Error fetching usage:', error);
        return;
      }

      if (data && typeof data === 'object' && 'remaining' in data) {
        setUsage(data as unknown as DailyUsage);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const refreshUsage = useCallback(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    isLoading,
    refreshUsage,
    isLimitReached: usage.remaining <= 0,
  };
}
