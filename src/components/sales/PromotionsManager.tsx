import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Percent, Trash2, Plus, Clock, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  preco: number;
}

interface Promotion {
  id: string;
  inventory_item_id: string;
  discount_percent: number;
  expires_at: string;
  codigo?: string;
  produto?: string;
  preco?: number;
}

export function PromotionsManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New promotion form
  const [selectedItemId, setSelectedItemId] = useState('');
  const [discount, setDiscount] = useState('');
  const [hours, setHours] = useState('24');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [invRes, promoRes] = await Promise.all([
      supabase.from('inventory_items').select('id, codigo, produto, preco').eq('user_id', user.id).order('produto'),
      supabase.from('inventory_promotions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (invRes.data) setItems(invRes.data);
    if (promoRes.data) {
      // Enrich promotions with item data
      const itemMap = new Map((invRes.data || []).map(i => [i.id, i]));
      setPromotions(promoRes.data.map(p => ({
        ...p,
        codigo: itemMap.get(p.inventory_item_id)?.codigo,
        produto: itemMap.get(p.inventory_item_id)?.produto,
        preco: itemMap.get(p.inventory_item_id)?.preco,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPromotion = async () => {
    if (!selectedItemId || !discount || !hours) {
      toast.error('Selecione o produto, desconto e duração');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('inventory_promotions').insert({
      user_id: user.id,
      inventory_item_id: selectedItemId,
      discount_percent: Number(discount),
      expires_at: expiresAt,
    });

    if (error) {
      toast.error('Erro ao criar promoção');
      return;
    }

    toast.success('Promoção criada!');
    setSelectedItemId('');
    setDiscount('');
    setHours('24');
    load();
  };

  const deletePromotion = async (id: string) => {
    await supabase.from('inventory_promotions').delete().eq('id', id);
    toast.success('Promoção removida');
    load();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredItems = search.trim()
    ? items.filter(i => `${i.codigo} ${i.produto}`.toLowerCase().includes(search.toLowerCase()))
    : [];

  const activePromos = promotions.filter(p => new Date(p.expires_at) > new Date());
  const expiredPromos = promotions.filter(p => new Date(p.expires_at) <= new Date());

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-6">
      {/* Create Promotion */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Criar Oferta / Promoção
        </h3>
        <p className="text-xs text-muted-foreground">
          Defina um desconto temporário em um produto. O cliente verá o preço original riscado, o desconto e um contador regressivo no catálogo B2B.
        </p>

        {/* Search product */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por código ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search results */}
        {filteredItems.length > 0 && (
          <div className="max-h-40 overflow-auto border rounded-md divide-y">
            {filteredItems.slice(0, 10).map(item => (
              <button
                key={item.id}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between items-center ${selectedItemId === item.id ? 'bg-primary/10' : ''}`}
                onClick={() => { setSelectedItemId(item.id); setSearch(`${item.codigo} - ${item.produto}`); }}
              >
                <span><span className="font-mono text-xs text-muted-foreground">{item.codigo}</span> — {item.produto}</span>
                <span className="text-xs font-bold">{fmt(item.preco)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected item indicator */}
        {selectedItemId && (
          <Badge variant="secondary" className="gap-1">
            <Percent className="w-3 h-3" />
            Produto selecionado: {items.find(i => i.id === selectedItemId)?.codigo}
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Desconto (%)</label>
            <Input
              type="number"
              placeholder="Ex: 15"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              min="1"
              max="90"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duração (horas)</label>
            <Input
              type="number"
              placeholder="Ex: 24"
              value={hours}
              onChange={e => setHours(e.target.value)}
              min="1"
              max="720"
            />
          </div>
        </div>

        {/* Preview */}
        {selectedItemId && discount && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Preview no catálogo:</p>
            {(() => {
              const item = items.find(i => i.id === selectedItemId);
              if (!item) return null;
              const d = Number(discount) / 100;
              const finalPrice = item.preco * (1 - d);
              return (
                <div className="flex items-center gap-3">
                  <span className="text-sm line-through text-muted-foreground">{fmt(item.preco)}</span>
                  <Badge variant="destructive" className="text-xs">-{discount}%</Badge>
                  <span className="text-lg font-bold text-primary">{fmt(finalPrice)}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {hours}h
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        <Button onClick={addPromotion} className="w-full gap-2" disabled={!selectedItemId || !discount}>
          <Plus className="w-4 h-4" /> Criar Promoção
        </Button>
      </Card>

      {/* Active Promotions */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Promoções Ativas ({activePromos.length})
        </h3>

        {activePromos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma promoção ativa</p>
        )}

        {activePromos.map(p => {
          const finalPrice = (p.preco || 0) * (1 - p.discount_percent / 100);
          const remaining = Math.max(0, new Date(p.expires_at).getTime() - Date.now());
          const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
          const minsLeft = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          return (
            <div key={p.id} className="flex items-center gap-3 border rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.produto || 'Produto'}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.codigo}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs line-through text-muted-foreground">{fmt(p.preco || 0)}</span>
                  <Badge variant="destructive" className="text-[10px]">-{p.discount_percent}%</Badge>
                  <span className="text-sm font-bold text-primary">{fmt(finalPrice)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {hoursLeft}h {minsLeft}min
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive mt-1" onClick={() => deletePromotion(p.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Expired */}
      {expiredPromos.length > 0 && (
        <Card className="p-5 space-y-3 opacity-60">
          <h3 className="font-bold text-sm">Promoções Expiradas ({expiredPromos.length})</h3>
          {expiredPromos.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center gap-3 text-sm border rounded-lg p-2">
              <div className="flex-1">
                <p className="text-xs">{p.codigo} — {p.produto}</p>
                <p className="text-[10px] text-muted-foreground">-{p.discount_percent}% • Expirou em {new Date(p.expires_at).toLocaleString('pt-BR')}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deletePromotion(p.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
