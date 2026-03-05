import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ticket, Trash2, Plus, Clock, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  supplier_filter: string | null;
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
}

export function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [hours, setHours] = useState('48');
  const [maxUses, setMaxUses] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
    setCode(result);
  };

  const createCoupon = async () => {
    if (!code.trim() || !discountValue) {
      toast.error('Preencha o código e o valor do desconto');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('discount_coupons').insert({
      user_id: user.id,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrder) || 0,
      supplier_filter: supplierFilter.trim().toUpperCase() || null,
      expires_at: expiresAt,
      max_uses: maxUses ? Number(maxUses) : null,
    });

    if (error) {
      toast.error('Erro ao criar cupom');
      return;
    }

    toast.success('Cupom criado!');
    setCode('');
    setDiscountValue('');
    setMinOrder('');
    setSupplierFilter('');
    setMaxUses('');
    load();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('discount_coupons').delete().eq('id', id);
    toast.success('Cupom removido');
    load();
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success(`Código ${c} copiado!`);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const activeCoupons = coupons.filter(c => c.is_active && new Date(c.expires_at) > new Date());
  const expiredCoupons = coupons.filter(c => !c.is_active || new Date(c.expires_at) <= new Date());

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-6">
      {/* Create Coupon */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          Criar Cupom de Desconto
        </h3>
        <p className="text-xs text-muted-foreground">
          Crie cupons que seus clientes podem usar no catálogo B2B ao finalizar o pedido. Defina condições como valor mínimo ou fornecedor específico.
        </p>

        {/* Code */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Código do Cupom</label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: DESCONTO10"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="uppercase font-mono"
            />
            <Button variant="outline" size="sm" onClick={generateCode} className="shrink-0">
              Gerar
            </Button>
          </div>
        </div>

        {/* Discount type & value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de Desconto</label>
            <div className="flex gap-1">
              <Button
                variant={discountType === 'percent' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setDiscountType('percent')}
              >
                %
              </Button>
              <Button
                variant={discountType === 'fixed' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setDiscountType('fixed')}
              >
                R$
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}
            </label>
            <Input
              type="number"
              placeholder={discountType === 'percent' ? 'Ex: 10' : 'Ex: 150'}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              min="1"
            />
          </div>
        </div>

        {/* Conditions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pedido mínimo (R$)</label>
            <Input
              type="number"
              placeholder="Ex: 1500"
              value={minOrder}
              onChange={e => setMinOrder(e.target.value)}
              min="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fornecedor (opcional)</label>
            <Input
              placeholder="Ex: AUTHOMIX"
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duração (horas)</label>
            <Input
              type="number"
              placeholder="Ex: 48"
              value={hours}
              onChange={e => setHours(e.target.value)}
              min="1"
              max="720"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Limite de usos (vazio = ilimitado)</label>
            <Input
              type="number"
              placeholder="Ex: 50"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              min="1"
            />
          </div>
        </div>

        {/* Preview */}
        {code && discountValue && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Preview do cupom:</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="font-mono text-sm">{code.toUpperCase() || '???'}</Badge>
              <span className="text-sm font-bold">
                {discountType === 'percent' ? `${discountValue}% de desconto` : `${fmt(Number(discountValue))} de desconto`}
              </span>
              {minOrder && Number(minOrder) > 0 && (
                <span className="text-xs text-muted-foreground">• Mín. {fmt(Number(minOrder))}</span>
              )}
              {supplierFilter && (
                <Badge variant="outline" className="text-[10px]">Fornecedor: {supplierFilter.toUpperCase()}</Badge>
              )}
            </div>
          </div>
        )}

        <Button onClick={createCoupon} className="w-full gap-2" disabled={!code.trim() || !discountValue}>
          <Plus className="w-4 h-4" /> Criar Cupom
        </Button>
      </Card>

      {/* Active Coupons */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Cupons Ativos ({activeCoupons.length})
        </h3>

        {activeCoupons.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum cupom ativo</p>
        )}

        {activeCoupons.map(c => {
          const remaining = Math.max(0, new Date(c.expires_at).getTime() - Date.now());
          const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
          return (
            <div key={c.id} className="flex items-center gap-3 border rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="font-mono">{c.code}</Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(c.code)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm font-medium mt-1">
                  {c.discount_type === 'percent' ? `${c.discount_value}%` : fmt(c.discount_value)} de desconto
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {c.min_order_amount > 0 && (
                    <span className="text-[10px] text-muted-foreground">Mín: {fmt(c.min_order_amount)}</span>
                  )}
                  {c.supplier_filter && (
                    <Badge variant="outline" className="text-[10px]">{c.supplier_filter}</Badge>
                  )}
                  {c.max_uses && (
                    <span className="text-[10px] text-muted-foreground">Usos: {c.used_count}/{c.max_uses}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {hoursLeft}h
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive mt-1" onClick={() => deleteCoupon(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Expired */}
      {expiredCoupons.length > 0 && (
        <Card className="p-5 space-y-3 opacity-60">
          <h3 className="font-bold text-sm">Cupons Expirados ({expiredCoupons.length})</h3>
          {expiredCoupons.slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center gap-3 text-sm border rounded-lg p-2">
              <div className="flex-1">
                <p className="text-xs font-mono">{c.code}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.discount_type === 'percent' ? `${c.discount_value}%` : fmt(c.discount_value)} • Expirou em {new Date(c.expires_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCoupon(c.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
