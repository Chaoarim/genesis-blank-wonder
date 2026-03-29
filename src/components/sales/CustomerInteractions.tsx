import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, MessageSquare, Phone, Mail, MapPin, Handshake, Trash2, Calendar, Search, Filter } from 'lucide-react';
import type { Customer } from '@/hooks/useSalesData';

interface Interaction {
  id: string;
  user_id: string;
  customer_id: string;
  type: string;
  channel: string;
  subject: string | null;
  description: string | null;
  seller_auth_id: string | null;
  seller_name: string | null;
  scheduled_at: string | null;
  created_at: string;
}

const TYPES = [
  { value: 'contact', label: 'Contato', icon: Phone },
  { value: 'visit', label: 'Visita', icon: MapPin },
  { value: 'negotiation', label: 'Negociação', icon: Handshake },
  { value: 'follow_up', label: 'Follow-up', icon: MessageSquare },
  { value: 'meeting', label: 'Reunião', icon: Calendar },
];

const CHANNELS = [
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'other', label: 'Outro' },
];

const TYPE_COLORS: Record<string, string> = {
  contact: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  visit: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  negotiation: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  follow_up: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  meeting: 'bg-primary/10 text-primary',
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  phone: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  presencial: MapPin,
  other: MessageSquare,
};

interface Props {
  adminUserId: string | null;
  customers: Customer[];
  sellerName?: string | null;
  sellerAuthId?: string | null;
}

export function CustomerInteractions({ adminUserId, customers, sellerName, sellerAuthId }: Props) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('all');

  const [form, setForm] = useState({
    customer_id: '',
    type: 'contact',
    channel: 'phone',
    subject: '',
    description: '',
    scheduled_at: '',
  });

  const fetchInteractions = useCallback(async () => {
    if (!adminUserId) return;
    const { data } = await supabase
      .from('customer_interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setInteractions(data as Interaction[]);
    setLoading(false);
  }, [adminUserId]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  const resetForm = () => {
    setForm({ customer_id: '', type: 'contact', channel: 'phone', subject: '', description: '', scheduled_at: '' });
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!adminUserId || !form.customer_id) {
      toast.error('Selecione um cliente');
      return;
    }

    const { error } = await supabase.from('customer_interactions').insert({
      user_id: adminUserId,
      customer_id: form.customer_id,
      type: form.type,
      channel: form.channel,
      subject: form.subject || null,
      description: form.description || null,
      seller_auth_id: sellerAuthId || null,
      seller_name: sellerName || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    });

    if (error) { toast.error('Erro ao registrar interação'); return; }
    toast.success('Interação registrada!');
    resetForm();
    fetchInteractions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('customer_interactions').delete().eq('id', id);
    setInteractions(prev => prev.filter(i => i.id !== id));
    toast.success('Interação excluída');
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Cliente removido';
  const getTypeLabel = (t: string) => TYPES.find(x => x.value === t)?.label || t;
  const getChannelLabel = (c: string) => CHANNELS.find(x => x.value === c)?.label || c;

  const filtered = interactions.filter(i => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterCustomer !== 'all' && i.customer_id !== filterCustomer) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = getCustomerName(i.customer_id).toLowerCase();
      return name.includes(s) || (i.subject || '').toLowerCase().includes(s) || (i.description || '').toLowerCase().includes(s);
    }
    return true;
  });

  // Stats
  const thisMonth = interactions.filter(i => {
    const d = new Date(i.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Histórico de Interações
          </h2>
          <p className="text-sm text-muted-foreground">Registro de contatos, visitas e negociações com clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Nova Interação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TYPES.map(t => {
          const count = thisMonth.filter(i => i.type === t.value).length;
          const Icon = t.icon;
          return (
            <Card key={t.value} className="border-border/50">
              <CardContent className="p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground">{t.label} (mês)</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar Interação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Agendada (opcional)</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Assunto</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Ex: Cotação de peças para Civic" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Detalhes da interação..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 max-w-xs" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos clientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {customers.slice(0, 50).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma interação registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(interaction => {
            const ChannelIcon = CHANNEL_ICONS[interaction.channel] || MessageSquare;
            return (
              <Card key={interaction.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{getCustomerName(interaction.customer_id)}</span>
                          <Badge className={`${TYPE_COLORS[interaction.type] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>
                            {getTypeLabel(interaction.type)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{getChannelLabel(interaction.channel)}</Badge>
                        </div>
                        {interaction.subject && <p className="text-sm mt-1">{interaction.subject}</p>}
                        {interaction.description && <p className="text-xs text-muted-foreground mt-1">{interaction.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{format(new Date(interaction.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                          {interaction.seller_name && <span>• {interaction.seller_name}</span>}
                          {interaction.scheduled_at && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              Agendado: {format(new Date(interaction.scheduled_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleDelete(interaction.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
