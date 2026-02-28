import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LowStockItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
}

export function LowStockReport() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('inventory_items')
        .select('id, codigo, produto, fornecedor, aplicacao, qtd_estoque')
        .eq('user_id', user.id)
        .lte('qtd_estoque', 2)
        .order('qtd_estoque', { ascending: true });

      if (data) {
        setItems(data.map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          produto: r.produto,
          fornecedor: r.fornecedor || '',
          aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0,
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-center text-muted-foreground py-4">Carregando...</p>;

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2 text-amber-600">
        <AlertTriangle className="w-5 h-5" />
        Relatório de Estoque Baixo ({items.length} itens com ≤ 2 un.)
      </h3>
      <p className="text-xs text-muted-foreground">
        Produtos com 2 ou menos unidades em estoque. Use este relatório para planejar suas compras.
      </p>

      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Nenhum item com estoque baixo 🎉</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[400px] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-bold">{item.codigo}</TableCell>
                  <TableCell className="text-sm">{item.produto}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.fornecedor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.aplicacao}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${item.qtd_estoque <= 0 ? 'text-destructive' : 'text-amber-500'}`}>
                      {item.qtd_estoque}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
