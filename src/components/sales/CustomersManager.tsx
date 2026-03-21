import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Phone, Mail, Edit2, ShoppingBag, Copy, UserCog, Building2, MapPin, CreditCard, MessageCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCpfCnpj, formatWhatsapp } from '@/features/pre-registration/format';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import type { Customer, Sale } from '@/hooks/useSalesData';
import type { SellerUser } from '@/hooks/useSellerPermissions';

interface CustomersManagerProps {
  customers: Customer[];
  sales: Sale[];
  onAdd: (data: Partial<Customer> & { name: string }) => Promise<any>;
  onUpdate: (id: string, data: Partial<Customer>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isAdmin?: boolean;
  sellers?: SellerUser[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyForm = {
  name: '', phone: '', email: '', whatsapp: '', notes: '',
  cpf_cnpj: '', inscricao_estadual: '', endereco: '',
  limite_credito: '', empresa: '', comprador: '',
};

export function CustomersManager({ customers, sales, onAdd, onUpdate, onDelete, isAdmin, sellers }: CustomersManagerProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (field === 'cpf_cnpj') val = formatCpfCnpj(val);
    if (field === 'whatsapp' || field === 'phone') val = formatWhatsapp(val);
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.whatsapp || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.cpf_cnpj || '').includes(q) ||
      (c.empresa || '').toLowerCase().includes(q) ||
      (c.comprador || '').toLowerCase().includes(q);
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
    if (!form.name.trim()) return;
    const payload: any = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      notes: form.notes || null,
      cpf_cnpj: form.cpf_cnpj || null,
      inscricao_estadual: form.inscricao_estadual || null,
      endereco: form.endereco || null,
      limite_credito: form.limite_credito ? Number(form.limite_credito) : null,
      empresa: form.empresa || null,
      comprador: form.comprador || null,
    };
    if (editId) {
      await onUpdate(editId, payload);
    } else {
      const sellerForNew = isAdmin && sellerFilter !== 'all' && sellerFilter !== 'unassigned' ? sellerFilter : undefined;
      if (sellerForNew) payload.seller_auth_id = sellerForNew;
      await onAdd(payload);
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
    setForm({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      whatsapp: c.whatsapp || '',
      notes: c.notes || '',
      cpf_cnpj: c.cpf_cnpj || '',
      inscricao_estadual: c.inscricao_estadual || '',
      endereco: c.endereco || '',
      limite_credito: c.limite_credito ? String(c.limite_credito) : '',
      empresa: c.empresa || '',
      comprador: c.comprador || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => { setEditId(null); setForm(emptyForm); };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, código, CPF/CNPJ, empresa..." value={search} onChange={e => setSearch(e.target.value)} />
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
            <Button className="gap-1"><Plus className="w-4 h-4" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar' : 'Novo'} Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Identificação */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome do cliente *</Label>
                    <Input placeholder="Nome completo" value={form.name} onChange={set('name')} />
                  </div>
                  <div>
                    <Label className="text-xs">Nome do comprador</Label>
                    <Input placeholder="Responsável pela compra" value={form.comprador} onChange={set('comprador')} />
                  </div>
                  <div>
                    <Label className="text-xs">CPF / CNPJ</Label>
                    <Input placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={set('cpf_cnpj')} />
                  </div>
                  <div>
                    <Label className="text-xs">Inscrição Estadual</Label>
                    <Input placeholder="Inscrição estadual" value={form.inscricao_estadual} onChange={set('inscricao_estadual')} />
                  </div>
                </div>
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome da empresa</Label>
                    <Input placeholder="Razão social / fantasia" value={form.empresa} onChange={set('empresa')} />
                  </div>
                  <div>
                    <Label className="text-xs">Limite de crédito (R$)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0,00" value={form.limite_credito} onChange={set('limite_credito')} />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input placeholder="(00) 00000-0000" value={form.phone} onChange={set('phone')} />
                  </div>
                  <div>
                    <Label className="text-xs">WhatsApp</Label>
                    <Input placeholder="(00) 00000-0000" value={form.whatsapp} onChange={set('whatsapp')} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">E-mail</Label>
                    <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={set('email')} />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</p>
                <div>
                  <Label className="text-xs">Endereço completo</Label>
                  <Input placeholder="Rua, número, bairro, cidade - UF, CEP" value={form.endereco} onChange={set('endereco')} />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label className="text-xs">Observações</Label>
                <Input placeholder="Anotações internas..." value={form.notes} onChange={set('notes')} />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={!form.name.trim()}>Salvar</Button>
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
                      {c.empresa && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Building2 className="w-3 h-3" />
                          {c.empresa}
                        </Badge>
                      )}
                      {isAdmin && assignedSeller && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <UserCog className="w-3 h-3" />
                          {assignedSeller}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {c.cpf_cnpj && <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {c.cpf_cnpj}</span>}
                      {c.whatsapp && (
                        <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-green-500">
                          <MessageCircle className="w-3 h-3" /> {c.whatsapp}
                        </a>
                      )}
                      {c.phone && !c.whatsapp && (
                        <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-green-500">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </a>
                      )}
                      {c.phone && c.whatsapp && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                      )}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                      <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {stats.count} vendas · {fmt(stats.total)}</span>
                      {c.endereco && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.endereco}</span>}
                      {c.limite_credito && Number(c.limite_credito) > 0 && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <CreditCard className="w-3 h-3" /> Limite: {fmt(Number(c.limite_credito))}
                        </span>
                      )}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailCustomer(c)} title="Ver ficha completa">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
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

      <CustomerDetailDialog
        customer={detailCustomer}
        sales={sales}
        open={!!detailCustomer}
        onOpenChange={(v) => { if (!v) setDetailCustomer(null); }}
      />
    </div>
  );
}
