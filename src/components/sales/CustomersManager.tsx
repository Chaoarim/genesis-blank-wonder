import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Phone, Mail, Edit2, ShoppingBag, Copy, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Customer, Sale } from '@/hooks/useSalesData';
import type { SellerUser } from '@/hooks/useSellerPermissions';

interface CustomersManagerProps {
  customers: Customer[];
  sales: Sale[];
  onAdd: (data: { name: string; phone?: string; email?: string; notes?: string }) => Promise<any>;
  onUpdate: (id: string, data: Partial<Customer>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isAdmin?: boolean;
  sellers?: SellerUser[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CustomersManager({ customers, sales, onAdd, onUpdate, onDelete, isAdmin, sellers }: CustomersManagerProps) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [sellerFilter, setSellerFilter] = useState<string>('all');

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (isAdmin && sellerFilter !== 'all') {
      if (sellerFilter === 'unassigned') return !c.seller_auth_id;
      return c.seller_auth_id === sellerFilter;
    }
    return true;
  });

  const getCustomerStats = (customerId: string) => {
    const custSales = sales.filter(s => s.customer_id === customerId && s.status === 'completed');
    const total = custSales.reduce((s, v) => s + Number(v.total), 0);
    return { count: custSales.length, total };
  };

  const getSellerName = (sellerAuthId: string | null) => {
    if (!sellerAuthId || !sellers) return null;
    return sellers.find(s => s.seller_auth_id === sellerAuthId)?.name || null;
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      await onUpdate(editId, { name, phone: phone || null, email: email || null, notes: notes || null });
    } else {
      await onAdd({ name, phone: phone || undefined, email: email || undefined, notes: notes || undefined });
    }
    setDialogOpen(false);
    resetForm();
  };

  const assignToSeller = async (customerId: string, sellerAuthId: string | null) => {
    const { error } = await supabase.from('customers').update({ seller_auth_id: sellerAuthId }).eq('id', customerId);
    if (error) { toast.error('Erro ao atribuir cliente'); return; }
    await onUpdate(customerId, { seller_auth_id: sellerAuthId } as any);
    toast.success(sellerAuthId ? 'Cliente atribuído ao vendedor!' : 'Cliente desvinculado');
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setDialogOpen(true);
  };

  const resetForm = () => { setEditId(null); setName(''); setPhone(''); setEmail(''); setNotes(''); };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, código ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isAdmin && sellers && sellers.length > 0 && (
          <Select value={sellerFilter} onValueChange={setSellerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unassigned">Sem vendedor</SelectItem>
              {sellers.filter(s => s.seller_auth_id).map(s => (
                <SelectItem key={s.id} value={s.seller_auth_id!}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="w-4 h-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar' : 'Novo'} Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Nome *" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <Input placeholder="Observações" value={notes} onChange={e => setNotes(e.target.value)} />
              <Button className="w-full" onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Nenhum cliente cadastrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const stats = getCustomerStats(c.id);
            const assignedSeller = getSellerName(c.seller_auth_id);
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.code && (
                        <Badge variant="outline" className="font-mono text-xs cursor-pointer shrink-0" onClick={() => copyCode(c.code!)}>
                          {c.code}
                          <Copy className="w-3 h-3 ml-1" />
                        </Badge>
                      )}
                      <p className="font-medium truncate">{c.name}</p>
                      {isAdmin && assignedSeller && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <UserCog className="w-3 h-3" />
                          {assignedSeller}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {c.phone && (
                        <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-green-500">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>
                      )}
                      <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {stats.count} vendas · {fmt(stats.total)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && sellers && sellers.length > 0 && (
                      <Select
                        value={c.seller_auth_id || 'none'}
                        onValueChange={(v) => assignToSeller(c.id, v === 'none' ? null : v)}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue placeholder="Vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem vendedor</SelectItem>
                          {sellers.filter(s => s.seller_auth_id).map(s => (
                            <SelectItem key={s.id} value={s.seller_auth_id!}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
