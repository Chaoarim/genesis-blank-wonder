import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Phone, MessageSquare, Mail, Building2, User, FileText, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from './ListSkeleton';

interface SupplierContact {
  id: string;
  distributor_name: string;
  seller_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
}

export function SupplierContactsManager({ userId }: { userId: string }) {
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    distributor_name: '',
    seller_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    notes: ''
  });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_contacts')
      .select('*')
      .order('distributor_name');
    
    if (error) {
      toast.error('Erro ao carregar contatos');
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.distributor_name) {
      toast.error('O nome da distribuidora é obrigatório');
      return;
    }

    const payload = {
      user_id: userId,
      distributor_name: formData.distributor_name,
      seller_name: formData.seller_name || null,
      phone: formData.phone || null,
      whatsapp: formData.whatsapp || null,
      email: formData.email || null,
      notes: formData.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from('supplier_contacts').update(payload).eq('id', editingId);
      if (error) toast.error('Erro ao atualizar contato');
      else {
        toast.success('Contato atualizado!');
        setIsOpen(false);
        fetchContacts();
      }
    } else {
      const { error } = await supabase.from('supplier_contacts').insert(payload);
      if (error) toast.error('Erro ao adicionar contato');
      else {
        toast.success('Contato adicionado!');
        setIsOpen(false);
        fetchContacts();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este fornecedor?')) return;
    const { error } = await supabase.from('supplier_contacts').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir contato');
    else {
      toast.success('Contato excluído');
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  const openEdit = (c: SupplierContact) => {
    setFormData({
      distributor_name: c.distributor_name,
      seller_name: c.seller_name || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      notes: c.notes || ''
    });
    setEditingId(c.id);
    setIsOpen(true);
  };

  const openNew = () => {
    setFormData({ distributor_name: '', seller_name: '', phone: '', whatsapp: '', email: '', notes: '' });
    setEditingId(null);
    setIsOpen(true);
  };

  const filtered = contacts.filter(c => 
    c.distributor_name.toLowerCase().includes(search.toLowerCase()) || 
    (c.seller_name && c.seller_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agenda de Fornecedores</h2>
          <p className="text-muted-foreground text-sm">Gerencie os contatos das suas distribuidoras.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Contato' : 'Adicionar Contato'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Distribuidora *</Label>
                <Input value={formData.distributor_name} onChange={e => setFormData({...formData, distributor_name: e.target.value})} placeholder="Ex: DPK, Sama..." required />
              </div>
              <div className="space-y-2">
                <Label>Vendedor / Representante</Label>
                <Input value={formData.seller_name} onChange={e => setFormData({...formData, seller_name: e.target.value})} placeholder="Nome de quem te atende" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone Fixo</Label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(00) 0000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="(00) 90000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="vendas@distribuidora.com" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Dias de visita, prazos, etc." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar distribuidora ou vendedor..." 
          className="pl-9" 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <ListSkeleton count={3} variant="card" />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(contact => (
            <Card key={contact.id} className="relative group">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      {contact.distributor_name}
                    </h3>
                    {contact.seller_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <User className="w-3.5 h-3.5" /> {contact.seller_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(contact)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contact.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                      <a href={`https://wa.me/55${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {contact.whatsapp}
                      </a>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${contact.email}`} className="hover:underline line-clamp-1">{contact.email}</a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="flex items-start gap-2 text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="text-xs line-clamp-2" title={contact.notes}>{contact.notes}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}