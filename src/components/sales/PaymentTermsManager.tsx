import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calendar, DollarSign, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentTermRule {
  id: string;
  user_id: string;
  name: string;
  min_amount: number;
  max_amount: number | null;
  installments: number;
  day_intervals: string; // e.g. "35/63" or "30/60/90"
  created_at: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PaymentTermsManager({ userId }: { userId: string | null }) {
  const [rules, setRules] = useState<PaymentTermRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [installments, setInstallments] = useState('2');
  const [dayIntervals, setDayIntervals] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchRules = useCallback(async () => {
    const { data } = await supabase
      .from('payment_term_rules')
      .select('*')
      .order('min_amount', { ascending: true });
    if (data) setRules(data.map((d: any) => ({ ...d, min_amount: Number(d.min_amount), max_amount: d.max_amount ? Number(d.max_amount) : null })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const generateIntervals = (numInstallments: number) => {
    if (numInstallments <= 1) return '30';
    return Array.from({ length: numInstallments }, (_, i) => (i + 1) * 30).join('/');
  };

  const handleInstallmentsChange = (val: string) => {
    setInstallments(val);
    const num = parseInt(val) || 2;
    if (!dayIntervals || dayIntervals.split('/').length !== num) {
      setDayIntervals(generateIntervals(num));
    }
  };

  const resetForm = () => {
    setName('');
    setMinAmount('');
    setMaxAmount('');
    setInstallments('2');
    setDayIntervals('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!userId) return;
    const numInstallments = parseInt(installments) || 1;
    const intervals = dayIntervals.trim() || generateIntervals(numInstallments);

    const daysArr = intervals.split('/').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    if (daysArr.length !== numInstallments) {
      toast.error(`Informe exatamente ${numInstallments} prazo(s) separados por /`);
      return;
    }

    const payload = {
      user_id: userId,
      name: name.trim() || `${numInstallments}x - ${intervals} dias`,
      min_amount: parseFloat(minAmount) || 0,
      max_amount: maxAmount ? parseFloat(maxAmount) : null,
      installments: numInstallments,
      day_intervals: intervals,
    };

    if (editingId) {
      const { error } = await supabase.from('payment_term_rules').update(payload).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar regra'); return; }
      toast.success('Regra atualizada!');
    } else {
      const { error } = await supabase.from('payment_term_rules').insert(payload);
      if (error) { toast.error('Erro ao criar regra'); return; }
      toast.success('Regra criada!');
    }

    resetForm();
    fetchRules();
  };

  const handleEdit = (rule: PaymentTermRule) => {
    setName(rule.name);
    setMinAmount(String(rule.min_amount));
    setMaxAmount(rule.max_amount ? String(rule.max_amount) : '');
    setInstallments(String(rule.installments));
    setDayIntervals(rule.day_intervals);
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra de prazo?')) return;
    await supabase.from('payment_term_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Regra excluída!');
  };

  const parseDays = (intervals: string) => intervals.split('/').map(d => d.trim());

  if (loading) return <p className="text-center text-muted-foreground py-6">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Tabela de Prazos — Faturamento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure regras de parcelamento automático conforme o valor do pedido
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Nova Regra
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-4 space-y-4 border-primary/30">
          <p className="text-sm font-semibold">{editingId ? 'Editar Regra' : 'Nova Regra de Prazo'}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome da Regra</Label>
              <Input placeholder="Ex: 2x para pedidos médios" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Nº de Parcelas</Label>
              <Input type="number" min={1} max={12} value={installments} onChange={e => handleInstallmentsChange(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor Mínimo (R$)</Label>
              <Input type="number" min={0} step={0.01} placeholder="0,00" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Valor Máximo (R$) <span className="text-muted-foreground">(vazio = sem limite)</span></Label>
              <Input type="number" min={0} step={0.01} placeholder="Sem limite" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Prazos em dias (separados por /)</Label>
            <Input
              placeholder="Ex: 35/63 ou 30/60/90"
              value={dayIntervals}
              onChange={e => setDayIntervals(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Informe {installments} prazo(s). Ex: pedido faturado em {dayIntervals || '30/60'} dias
            </p>
          </div>

          {/* Preview */}
          {dayIntervals && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Pré-visualização</p>
              <p className="text-sm">
                Pedido {minAmount ? `a partir de ${fmt(parseFloat(minAmount))}` : ''}{maxAmount ? ` até ${fmt(parseFloat(maxAmount))}` : ''} → <strong>{installments} parcela(s)</strong>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {parseDays(dayIntervals).map((d, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {i + 1}ª parcela: {d} dias
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="gap-1">
              <Save className="w-3 h-3" /> {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm} className="gap-1">
              <X className="w-3 h-3" /> Cancelar
            </Button>
          </div>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <DollarSign className="w-8 h-8 mx-auto mb-2" />
          <p>Nenhuma regra de prazo cadastrada</p>
          <p className="text-xs mt-1">Crie regras para automatizar os prazos de faturamento</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regra</TableHead>
                <TableHead>Faixa de Valor</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Prazos (dias)</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                  <TableCell className="text-sm">
                    {fmt(rule.min_amount)}
                    {rule.max_amount ? ` — ${fmt(rule.max_amount)}` : ' +'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.installments}x</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {parseDays(rule.day_intervals).map((d, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{d}d</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(rule)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
