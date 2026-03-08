import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Package, Printer, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { downloadHtmlAsPdf, printHtml } from '@/lib/htmlToPdf';

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

  const buildReportHtml = () => {
    const rows = items.map(item => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:600;font-family:monospace;font-size:12px">${item.codigo}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.produto}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666">${item.fornecedor}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666">${item.aplicacao}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:700;color:${item.qtd_estoque <= 0 ? '#dc2626' : '#f59e0b'}">${item.qtd_estoque}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Estoque Baixo</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:32px;max-width:800px;margin:auto}
      h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}
      th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:11px;text-transform:uppercase;color:#555}
      .meta{color:#666;font-size:13px;margin-top:4px}.footer{margin-top:24px;text-align:center;font-size:11px;color:#999}
      @media print{body{padding:16px}}</style></head><body>
      <h1>⚠ Relatório de Estoque Baixo</h1>
      <p class="meta">${items.length} itens com ≤ 2 unidades — Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <table><thead><tr><th>Código</th><th>Produto</th><th>Fornecedor</th><th>Aplicação</th><th style="text-align:center">Estoque</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Use este relatório para planejar suas compras.</div></body></html>`;
  };

  const handlePrint = () => {
    printHtml(buildReportHtml());
  };

  const handlePdf = () => {
    downloadHtmlAsPdf(buildReportHtml(), `Estoque_Baixo_${new Date().toISOString().slice(0, 10)}`);
  };

  if (loading) return <p className="text-center text-muted-foreground py-4">Carregando...</p>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          Relatório de Estoque Baixo ({items.length} itens com ≤ 2 un.)
        </h3>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
              <Printer className="w-3 h-3" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdf} className="gap-1">
              <FileText className="w-3 h-3" /> PDF
            </Button>
          </div>
        )}
      </div>
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
