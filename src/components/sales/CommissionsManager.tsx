import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, DollarSign } from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Commission {
  id: string;
  type: string;
  reference: string | null;
  commission_percent: number;
  commission_fixed: number;
}

interface Props {
  userId: string;
}

const TYPE_LABELS: Record<string, string> = {
  order: 'Por Pedido',
  product: 'Por Produto',
  supplier: 'Por Fornecedor',
};

export function CommissionsManager({ userId }: Props) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('order');
  const [reference, setReference] = useState('');
  const [percent, setPercent] = useState('');
  const [fixed, setFixed] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sales_commissions')
      .select('*')
      .eq('user_id', userId)
      .order('type');
    setCommissions((data || []) as Commission[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    const pct = parseFloat(percent) || 0;
    const fix = parseFloat(fixed) || 0;
    if (pct <= 0 && fix <= 0) { toast.error('Informe percentual ou valor fixo'); return; }
    if ((type === 'product' || type === 'supplier') && !reference.trim()) {
      toast.error(`Informe o ${type === 'product' ? 'código do produto' : 'nome do fornecedor'}`);
      return;
    }

    const { error } = await supabase.from('sales_commissions').insert({
      user_id: userId,
      type,
      reference: type === 'order' ? null : reference.trim(),
      commission_percent: pct,
      commission_fixed: fix,
    });

    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Comissão criada!');
    setReference('');
    setPercent('');
    setFixed('');
    fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('sales_commissions').delete().eq('id', id);
    setCommissions(prev => prev.filter(c => c.id !== id));
    toast.success('Comissão removida');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Nova Regra de Comissão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Por Pedido</SelectItem>
                <SelectItem value="product">Por Produto (código)</SelectItem>
                <SelectItem value="supplier">Por Fornecedor</SelectItem>
              </SelectContent>
            </Select>

            {type !== 'order' && (
              <Input
                placeholder={type === 'product' ? 'Código do produto' : 'Nome do fornecedor'}
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            )}

            <Input
              placeholder="Comissão %"
              type="number"
              value={percent}
              onChange={e => setPercent(e.target.value)}
            />

            <Input
              placeholder="Valor fixo R$"
              type="number"
              value={fixed}
              onChange={e => setFixed(e.target.value)}
            />
          </div>

          <Button onClick={handleAdd}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar Regra
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Comissão ({commissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma regra configurada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Fixo R$</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[c.type] || c.type}</Badge>
                    </TableCell>
                    <TableCell>{c.reference || '—'}</TableCell>
                    <TableCell>{Number(c.commission_percent) > 0 ? `${c.commission_percent}%` : '—'}</TableCell>
                    <TableCell>{Number(c.commission_fixed) > 0 ? `R$ ${Number(c.commission_fixed).toFixed(2)}` : '—'}</TableCell>
                    <TableCell>
                      <ConfirmDeleteDialog
                        description="Tem certeza que deseja excluir esta regra de comissão?"
                        onConfirm={() => handleDelete(c.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
