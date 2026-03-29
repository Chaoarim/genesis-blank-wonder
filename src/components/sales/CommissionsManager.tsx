import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, DollarSign, Users } from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Commission {
  id: string;
  type: string;
  reference: string | null;
  commission_percent: number;
  commission_fixed: number;
  seller_auth_id: string | null;
  seller_name: string | null;
}

interface Seller {
  id: string;
  name: string;
  seller_auth_id: string | null;
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
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('order');
  const [reference, setReference] = useState('');
  const [percent, setPercent] = useState('');
  const [fixed, setFixed] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('global');
  const [filterSeller, setFilterSeller] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: commData }, { data: sellerData }] = await Promise.all([
      supabase
        .from('sales_commissions')
        .select('*')
        .eq('user_id', userId)
        .order('type'),
      supabase
        .from('seller_users')
        .select('id, name, seller_auth_id')
        .eq('admin_user_id', userId)
        .eq('is_active', true)
        .order('name'),
    ]);
    setCommissions((commData || []) as Commission[]);
    setSellers((sellerData || []) as Seller[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    const pct = parseFloat(percent) || 0;
    const fix = parseFloat(fixed) || 0;
    if (pct <= 0 && fix <= 0) { toast.error('Informe percentual ou valor fixo'); return; }
    if ((type === 'product' || type === 'supplier') && !reference.trim()) {
      toast.error(`Informe o ${type === 'product' ? 'código do produto' : 'nome do fornecedor'}`);
      return;
    }

    const seller = sellers.find(s => s.seller_auth_id === selectedSeller);

    const { error } = await supabase.from('sales_commissions').insert({
      user_id: userId,
      type,
      reference: type === 'order' ? null : reference.trim(),
      commission_percent: pct,
      commission_fixed: fix,
      seller_auth_id: selectedSeller === 'global' ? null : selectedSeller,
      seller_name: selectedSeller === 'global' ? null : (seller?.name || null),
    });

    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Comissão criada!');
    setReference('');
    setPercent('');
    setFixed('');
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('sales_commissions').delete().eq('id', id);
    setCommissions(prev => prev.filter(c => c.id !== id));
    toast.success('Comissão removida');
  };

  const filtered = filterSeller === 'all'
    ? commissions
    : filterSeller === 'global'
      ? commissions.filter(c => !c.seller_auth_id)
      : commissions.filter(c => c.seller_auth_id === filterSeller);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Seller selector */}
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger>
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Global (todos)
                  </span>
                </SelectItem>
                {sellers.map(s => (
                  <SelectItem key={s.seller_auth_id || s.id} value={s.seller_auth_id || s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Regras de Comissão ({filtered.length})</CardTitle>
            <Select value={filterSeller} onValueChange={setFilterSeller}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Regras</SelectItem>
                <SelectItem value="global">Globais</SelectItem>
                {sellers.map(s => (
                  <SelectItem key={s.seller_auth_id || s.id} value={s.seller_auth_id || s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma regra configurada</p>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="space-y-2 md:hidden">
                {filtered.map(c => (
                  <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{TYPE_LABELS[c.type] || c.type}</Badge>
                        <Badge variant={c.seller_auth_id ? 'default' : 'secondary'} className="text-[10px]">
                          {c.seller_name || 'Global'}
                        </Badge>
                        {c.reference && <span className="text-xs text-muted-foreground truncate">{c.reference}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {Number(c.commission_percent) > 0 && <span className="font-semibold">{c.commission_percent}%</span>}
                        {Number(c.commission_fixed) > 0 && <span className="font-semibold">R$ {Number(c.commission_fixed).toFixed(2)}</span>}
                      </div>
                    </div>
                    <ConfirmDeleteDialog
                      description="Tem certeza que deseja excluir esta regra de comissão?"
                      onConfirm={() => handleDelete(c.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Fixo R$</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Badge variant={c.seller_auth_id ? 'default' : 'secondary'} className="text-xs">
                            {c.seller_name || 'Global'}
                          </Badge>
                        </TableCell>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
