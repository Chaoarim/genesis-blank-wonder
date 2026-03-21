import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function MarkupManager() {
  const [markup, setMarkup] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('markup_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setMarkup(Number(data.markup_revenda) || 0);
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveMarkup = useCallback(async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('markup_settings').upsert({
      user_id: user.id,
      markup_distribuidor: 0,
      markup_revenda: markup,
    }, { onConflict: 'user_id' });

    setSaving(false);
    toast.success('Markup salvo!');
  }, [markup]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          Markup de Venda
        </h3>
        <div className="flex items-end gap-3">
          <div className="space-y-1 flex-1 max-w-xs">
            <Label>Markup (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={markup || ''}
              onChange={e => setMarkup(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold"
            />
          </div>
          <Button onClick={handleSaveMarkup} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Preço Revenda = Preço Custo × (1 + {markup}%)
          {markup > 0 && ` — Ex: R$ 100,00 → ${fmt(100 * (1 + markup / 100))}`}
        </p>
      </Card>
    </div>
  );
}
