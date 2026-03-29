import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Tags, Users, Percent } from 'lucide-react';
import type { Customer } from '@/hooks/useSalesData';

const TIER_TYPES = [
  { value: 'oficina', label: 'Oficina', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { value: 'lojista', label: 'Lojista', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  { value: 'consumidor_final', label: 'Consumidor Final', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { value: 'distribuidor', label: 'Distribuidor', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  { value: 'custom', label: 'Personalizado', color: 'bg-muted text-muted-foreground' },
];

interface PriceTier {
  id: string;
  user_id: string;
  name: string;
  tier_type: string;
  markup_percent: number;
  discount_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  adminUserId: string | null;
  customers: Customer[];
  onUpdateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
}

export function CustomerPriceTiers({ adminUserId, customers, onUpdateCustomer }: Props) {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', tier_type: 'oficina', markup_percent: 0, discount_percent: 0, notes: '' });

  const fetchTiers = useCallback(async () => {
    if (!adminUserId) return;
    const { data } = await supabase.from('customer_price_tiers').select('*').order('name');
    if (data) setTiers(data as PriceTier[]);
    setLoading(false);
  }, [adminUserId]);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const resetForm = () => {
    setForm({ name: '', tier_type: 'oficina', markup_percent: 0, discount_percent: 0, notes: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!adminUserId || !form.name.trim()) {
      toast.error('Preencha o nome da tabela');
      return;
    }

    if (editingId) {
      const { error } = await supabase.from('customer_price_tiers')
        .update({ name: form.name, tier_type: form.tier_type, markup_percent: form.markup_percent, discount_percent: form.discount_percent, notes: form.notes || null, updated_at: new Date().toISOString() })
        .eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Tabela atualizada!');
    } else {
      const { error } = await supabase.from('customer_price_tiers')
        .insert({ user_id: adminUserId, name: form.name, tier_type: form.tier_type, markup_percent: form.markup_percent, discount_percent: form.discount_percent, notes: form.notes || null });
      if (error) { toast.error('Erro ao criar tabela'); return; }
      toast.success('Tabela criada!');
    }
    resetForm();
    fetchTiers();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('customer_price_tiers').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Tabela excluída!');
    fetchTiers();
  };

  const handleEdit = (tier: PriceTier) => {
    setForm({ name: tier.name, tier_type: tier.tier_type, markup_percent: tier.markup_percent, discount_percent: tier.discount_percent, notes: tier.notes || '' });
    setEditingId(tier.id);
    setShowForm(true);
  };

  const handleAssignCustomer = async (customerId: string, customerType: string) => {
    await onUpdateCustomer(customerId, { customer_type: customerType } as any);
  };

  const getTierColor = (type: string) => TIER_TYPES.find(t => t.value === type)?.color || 'bg-muted text-muted-foreground';
  const getTierLabel = (type: string) => TIER_TYPES.find(t => t.value === type)?.label || type;

  const customersByType = TIER_TYPES.map(t => ({
    ...t,
    count: customers.filter((c: any) => (c.customer_type || 'consumidor_final') === t.value).length,
  }));

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Tags className="w-5 h-5 text-primary" /> Tabela de Preços por Cliente</h2>
          <p className="text-sm text-muted-foreground">Preços diferenciados por tipo de cliente</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Nova Tabela
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {customersByType.map(t => (
          <Card key={t.value} className="border-border/50">
            <CardContent className="p-3 text-center">
              <Badge className={`${t.color} border-0 mb-1`}>{t.label}</Badge>
              <p className="text-2xl font-bold">{t.count}</p>
              <p className="text-[10px] text-muted-foreground">clientes</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingId ? 'Editar Tabela' : 'Nova Tabela de Preços'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome da Tabela</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Tabela Oficinas Premium" />
              </div>
              <div>
                <Label>Tipo de Cliente</Label>
                <Select value={form.tier_type} onValueChange={v => setForm(f => ({ ...f, tier_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Markup (%)</Label>
                <Input type="number" value={form.markup_percent} onChange={e => setForm(f => ({ ...f, markup_percent: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                <p className="text-[10px] text-muted-foreground mt-1">Acréscimo sobre preço base</p>
              </div>
              <div>
                <Label>Desconto (%)</Label>
                <Input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                <p className="text-[10px] text-muted-foreground mt-1">Desconto sobre preço final</p>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas sobre esta tabela..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {editingId ? 'Atualizar' : 'Salvar'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tiers table */}
      {tiers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Percent className="w-4 h-4" /> Tabelas Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Markup</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map(tier => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">{tier.name}</TableCell>
                    <TableCell><Badge className={`${getTierColor(tier.tier_type)} border-0`}>{getTierLabel(tier.tier_type)}</Badge></TableCell>
                    <TableCell className="text-right">{tier.markup_percent}%</TableCell>
                    <TableCell className="text-right">{tier.discount_percent}%</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{tier.notes || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(tier)}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(tier.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign customers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Classificar Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente cadastrado</p>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo Atual</TableHead>
                    <TableHead>Alterar Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.slice(0, 50).map(c => {
                    const currentType = (c as any).customer_type || 'consumidor_final';
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{c.phone || '—'}</TableCell>
                        <TableCell><Badge className={`${getTierColor(currentType)} border-0`}>{getTierLabel(currentType)}</Badge></TableCell>
                        <TableCell>
                          <Select value={currentType} onValueChange={v => handleAssignCustomer(c.id, v)}>
                            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIER_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {customers.length > 50 && <p className="text-xs text-muted-foreground text-center mt-2">Mostrando 50 de {customers.length} clientes</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
