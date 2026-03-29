import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Edit2, Save, X, Search, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface KitItem {
  id: string;
  kit_id: string;
  codigo: string;
  produto: string;
  fornecedor: string | null;
  preco_unitario: number;
  quantidade: number;
}

interface Kit {
  id: string;
  user_id: string;
  name: string;
  vehicle: string | null;
  description: string | null;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  items: KitItem[];
}

interface InventoryMatch {
  codigo: string;
  produto: string;
  fornecedor: string | null;
  preco: number;
  qtd_estoque: number;
}

interface Props {
  adminUserId: string | null;
}

export function ProductKitsManager({ adminUserId }: Props) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [form, setForm] = useState({ name: '', vehicle: '', description: '', discount_percent: 0 });
  const [formItems, setFormItems] = useState<{ codigo: string; produto: string; fornecedor: string; preco_unitario: number; quantidade: number }[]>([]);

  // Inventory search for adding items
  const [invSearch, setInvSearch] = useState('');
  const [invResults, setInvResults] = useState<InventoryMatch[]>([]);
  const [searchingInv, setSearchingInv] = useState(false);

  const fetchKits = useCallback(async () => {
    if (!adminUserId) return;
    const { data: kitsData } = await supabase.from('product_kits').select('*').order('name');
    if (!kitsData) { setLoading(false); return; }

    const kitIds = kitsData.map((k: any) => k.id);
    const { data: itemsData } = await supabase.from('product_kit_items').select('*').in('kit_id', kitIds.length > 0 ? kitIds : ['_']);

    const kitsWithItems: Kit[] = kitsData.map((k: any) => ({
      ...k,
      items: (itemsData || []).filter((i: any) => i.kit_id === k.id) as KitItem[],
    }));

    setKits(kitsWithItems);
    setLoading(false);
  }, [adminUserId]);

  useEffect(() => { fetchKits(); }, [fetchKits]);

  const resetForm = () => {
    setForm({ name: '', vehicle: '', description: '', discount_percent: 0 });
    setFormItems([]);
    setEditingKit(null);
    setShowForm(false);
    setInvSearch('');
    setInvResults([]);
  };

  const handleEdit = (kit: Kit) => {
    setForm({ name: kit.name, vehicle: kit.vehicle || '', description: kit.description || '', discount_percent: kit.discount_percent });
    setFormItems(kit.items.map(i => ({ codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor || '', preco_unitario: i.preco_unitario, quantidade: i.quantidade })));
    setEditingKit(kit);
    setShowForm(true);
  };

  const handleSearchInventory = async () => {
    if (!invSearch.trim() || !adminUserId) return;
    setSearchingInv(true);
    const { data } = await supabase.from('inventory_items')
      .select('codigo, produto, fornecedor, preco, qtd_estoque')
      .or(`codigo.ilike.%${invSearch}%,produto.ilike.%${invSearch}%`)
      .limit(10);
    setInvResults((data || []) as InventoryMatch[]);
    setSearchingInv(false);
  };

  const addItemFromInventory = (inv: InventoryMatch) => {
    if (formItems.some(i => i.codigo === inv.codigo)) { toast.error('Item já adicionado'); return; }
    setFormItems(prev => [...prev, { codigo: inv.codigo, produto: inv.produto, fornecedor: inv.fornecedor || '', preco_unitario: inv.preco, quantidade: 1 }]);
  };

  const addManualItem = () => {
    setFormItems(prev => [...prev, { codigo: '', produto: '', fornecedor: '', preco_unitario: 0, quantidade: 1 }]);
  };

  const updateFormItem = (idx: number, field: string, value: string | number) => {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeFormItem = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!adminUserId || !form.name.trim()) { toast.error('Preencha o nome do kit'); return; }
    if (formItems.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    if (editingKit) {
      // Update kit
      const { error } = await supabase.from('product_kits')
        .update({ name: form.name, vehicle: form.vehicle || null, description: form.description || null, discount_percent: form.discount_percent, updated_at: new Date().toISOString() })
        .eq('id', editingKit.id);
      if (error) { toast.error('Erro ao atualizar kit'); return; }

      // Delete old items and re-insert
      await supabase.from('product_kit_items').delete().eq('kit_id', editingKit.id);
      const items = formItems.map(i => ({ kit_id: editingKit.id, codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor || null, preco_unitario: i.preco_unitario, quantidade: i.quantidade }));
      await supabase.from('product_kit_items').insert(items);

      toast.success('Kit atualizado!');
    } else {
      // Create kit
      const { data: kit, error } = await supabase.from('product_kits')
        .insert({ user_id: adminUserId, name: form.name, vehicle: form.vehicle || null, description: form.description || null, discount_percent: form.discount_percent })
        .select().single();
      if (error || !kit) { toast.error('Erro ao criar kit'); return; }

      const items = formItems.map(i => ({ kit_id: kit.id, codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor || null, preco_unitario: i.preco_unitario, quantidade: i.quantidade }));
      await supabase.from('product_kit_items').insert(items);

      toast.success('Kit criado!');
    }

    resetForm();
    fetchKits();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('product_kits').delete().eq('id', id);
    setKits(prev => prev.filter(k => k.id !== id));
    toast.success('Kit excluído');
  };

  const handleToggleActive = async (kit: Kit) => {
    const newActive = !kit.is_active;
    await supabase.from('product_kits').update({ is_active: newActive }).eq('id', kit.id);
    setKits(prev => prev.map(k => k.id === kit.id ? { ...k, is_active: newActive } : k));
  };

  const handleDuplicate = (kit: Kit) => {
    setForm({ name: `${kit.name} (cópia)`, vehicle: kit.vehicle || '', description: kit.description || '', discount_percent: kit.discount_percent });
    setFormItems(kit.items.map(i => ({ codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor || '', preco_unitario: i.preco_unitario, quantidade: i.quantidade })));
    setEditingKit(null);
    setShowForm(true);
  };

  const getKitTotal = (items: { preco_unitario: number; quantidade: number }[], discount: number) => {
    const subtotal = items.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0);
    return subtotal * (1 - discount / 100);
  };

  const filtered = kits.filter(k => {
    if (!search) return true;
    const s = search.toLowerCase();
    return k.name.toLowerCase().includes(s) || (k.vehicle || '').toLowerCase().includes(s) || k.items.some(i => i.codigo.toLowerCase().includes(s));
  });

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Kits de Peças
          </h2>
          <p className="text-sm text-muted-foreground">Agrupamento de peças por veículo para venda rápida</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo Kit
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{kits.length}</p>
            <p className="text-xs text-muted-foreground">Total de Kits</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{kits.filter(k => k.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{kits.reduce((s, k) => s + k.items.length, 0)}</p>
            <p className="text-xs text-muted-foreground">Peças em Kits</p>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingKit ? 'Editar Kit' : 'Novo Kit de Peças'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Kit *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Kit Embreagem Gol G5" />
              </div>
              <div>
                <Label>Veículo</Label>
                <Input value={form.vehicle} onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))} placeholder="Ex: Gol G5 1.0" />
              </div>
              <div>
                <Label>Desconto do Kit (%)</Label>
                <Input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descrição opcional do kit..." />
            </div>

            {/* Add items from inventory */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <Label className="text-sm font-medium">Adicionar Peças do Estoque</Label>
              <div className="flex gap-2">
                <Input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Buscar por código ou produto..." className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleSearchInventory()} />
                <Button variant="outline" size="sm" onClick={handleSearchInventory} disabled={searchingInv}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {invResults.length > 0 && (
                <div className="max-h-[200px] overflow-auto border border-border rounded">
                  <Table>
                    <TableBody>
                      {invResults.map(inv => (
                        <TableRow key={inv.codigo} className="cursor-pointer hover:bg-muted/50" onClick={() => addItemFromInventory(inv)}>
                          <TableCell className="font-mono text-xs py-2">{inv.codigo}</TableCell>
                          <TableCell className="text-sm py-2">{inv.produto}</TableCell>
                          <TableCell className="text-right py-2">R$ {inv.preco.toFixed(2)}</TableCell>
                          <TableCell className="text-right py-2 text-muted-foreground">{inv.qtd_estoque} un</TableCell>
                          <TableCell className="py-2"><Plus className="w-4 h-4 text-primary" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={addManualItem} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item manual
              </Button>
            </div>

            {/* Kit items list */}
            {formItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Itens do Kit ({formItems.length})</Label>
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end border border-border rounded-lg p-2">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <Input value={item.codigo} onChange={e => updateFormItem(idx, 'codigo', e.target.value)} placeholder="Código" className="text-xs h-8" />
                      <Input value={item.produto} onChange={e => updateFormItem(idx, 'produto', e.target.value)} placeholder="Produto" className="text-xs h-8 sm:col-span-2" />
                      <Input type="number" value={item.preco_unitario || ''} onChange={e => updateFormItem(idx, 'preco_unitario', parseFloat(e.target.value) || 0)} placeholder="Preço" className="text-xs h-8" />
                      <Input type="number" value={item.quantidade} onChange={e => updateFormItem(idx, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))} placeholder="Qtde" className="text-xs h-8" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeFormItem(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Subtotal: R$ {formItems.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0).toFixed(2)}</span>
                  <span className="text-sm font-bold">Total com desconto: R$ {getKitTotal(formItems, form.discount_percent).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {editingKit ? 'Atualizar' : 'Salvar Kit'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {!showForm && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar kits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 max-w-sm" />
        </div>
      )}

      {/* Kits list */}
      {filtered.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum kit cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie kits de peças para agilizar as vendas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(kit => {
            const isExpanded = expandedId === kit.id;
            const total = getKitTotal(kit.items, kit.discount_percent);

            return (
              <Card key={kit.id} className={`border-border/50 ${!kit.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button onClick={() => setExpandedId(isExpanded ? null : kit.id)} className="shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="min-w-0">
                        <p className="font-medium flex items-center gap-2">
                          {kit.name}
                          {!kit.is_active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {kit.vehicle && <span className="mr-2">{kit.vehicle}</span>}
                          {kit.items.length} {kit.items.length === 1 ? 'peça' : 'peças'}
                          {kit.discount_percent > 0 && <span className="ml-2 text-primary">-{kit.discount_percent}%</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm">R$ {total.toFixed(2)}</span>
                      <Switch checked={kit.is_active} onCheckedChange={() => handleToggleActive(kit)} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {kit.description && <p className="text-sm text-muted-foreground">{kit.description}</p>}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead className="text-right">Qtde</TableHead>
                            <TableHead className="text-right">Preço Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kit.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                              <TableCell className="text-sm">{item.produto}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.fornecedor || '—'}</TableCell>
                              <TableCell className="text-right">{item.quantidade}</TableCell>
                              <TableCell className="text-right">R$ {Number(item.preco_unitario).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">R$ {(item.quantidade * Number(item.preco_unitario)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(kit)} className="gap-1.5">
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDuplicate(kit)} className="gap-1.5">
                          <Copy className="w-3.5 h-3.5" /> Duplicar
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => handleDelete(kit.id)}>
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
