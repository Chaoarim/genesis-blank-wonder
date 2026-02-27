import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Search, FileSpreadsheet, X, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { useMemo } from 'react';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
}

interface InventoryImporterProps {
  items: InventoryItem[];
  setItems: (items: InventoryItem[]) => void;
  markup: number;
}

export function InventoryImporter({ items, setItems, markup }: InventoryImporterProps) {
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        toast.error('Planilha vazia');
        setImporting(false);
        return;
      }

      const keys = Object.keys(rows[0]);
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const findCol = (hints: string[]) => keys.find(k => hints.some(h => normalize(k).includes(h)));

      const colCodigo = findCol(['codigo', 'cod', 'ref', 'referencia', 'code']) || keys[0];
      const colProduto = findCol(['produto', 'descricao', 'desc', 'nome', 'name', 'peca']) || keys[1];
      const colFornecedor = findCol(['fornecedor', 'distribuidor', 'supplier', 'forn', 'marca']) || null;
      const colAplicacao = findCol(['aplicacao', 'veiculo', 'carro', 'modelo', 'vehicle']) || null;
      const colEstoque = findCol(['estoque', 'qtd', 'quantidade', 'stock', 'qty']) || null;
      const colPreco = findCol(['preco', 'custo', 'price', 'valor', 'cost']) || null;

      const parsed = rows
        .map(r => ({
          codigo: String(r[colCodigo] || '').trim(),
          produto: String(r[colProduto] || '').trim(),
          fornecedor: colFornecedor ? String(r[colFornecedor] || '').trim() : '',
          aplicacao: colAplicacao ? String(r[colAplicacao] || '').trim() : '',
          qtd_estoque: colEstoque ? (parseInt(String(r[colEstoque])) || 0) : 0,
          preco: colPreco ? (parseFloat(String(r[colPreco]).replace(',', '.')) || 0) : 0,
        }))
        .filter(r => r.codigo);

      if (parsed.length === 0) {
        toast.error('Nenhum item válido encontrado.');
        setImporting(false);
        return;
      }

      const batchSize = 500;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize).map(p => ({
          user_id: user.id,
          ...p,
        }));
        const { error } = await supabase.from('inventory_items').insert(batch);
        if (error) {
          console.error('Insert error:', error);
          toast.error('Erro ao importar lote');
        }
      }

      // Reload
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setItems(data.map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          produto: r.produto,
          fornecedor: r.fornecedor || '',
          aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0,
          preco: Number(r.preco) || 0,
        })));
      }

      toast.success(`${parsed.length} itens importados ao estoque!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler arquivo');
    }

    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [setItems]);

  const handleDeleteItem = useCallback(async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
  }, [items, setItems]);

  const handleClearAll = useCallback(async () => {
    if (!confirm('Apagar todo o estoque?')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('inventory_items').delete().eq('user_id', user.id);
    setItems([]);
    toast.success('Estoque limpo');
  }, [setItems]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const normalizeSearch = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = normalizeSearch(search);
    return items.filter(i =>
      normalizeSearch(`${i.codigo} ${i.produto} ${i.fornecedor} ${i.aplicacao}`).includes(q)
    );
  }, [items, search]);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Importar Estoque (Catálogo B2B)
        </h3>
        <p className="text-xs text-muted-foreground">
          Envie um arquivo CSV ou Excel com: Código, Produto, Fornecedor, Aplicação (veículo), Qtd Estoque e Preço
        </p>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2">
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Escolher Arquivo'}
          </Button>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={handleClearAll}>
              <X className="w-3 h-3" /> Limpar estoque
            </Button>
          )}
        </div>
      </Card>

      {items.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{items.length} itens no estoque</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por código, produto, fornecedor ou aplicação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-auto max-h-[500px] rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Aplicação</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-right">Preço Custo</TableHead>
                  {markup > 0 && <TableHead className="text-right">Preço Revenda</TableHead>}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="text-sm">{item.produto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.fornecedor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.aplicacao}</TableCell>
                    <TableCell className="text-center font-medium">{item.qtd_estoque}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.preco)}</TableCell>
                    {markup > 0 && (
                      <TableCell className="text-right font-bold text-primary">
                        {fmt(item.preco * (1 + markup / 100))}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 100 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                Mostrando 100 de {filtered.length} itens. Use o filtro.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
