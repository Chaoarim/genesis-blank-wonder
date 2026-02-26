import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Percent, Upload, Trash2, Search, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface PriceItem {
  id: string;
  codigo: string;
  descricao: string;
  fornecedor: string;
  preco_custo: number;
}

export function MarkupManager() {
  const [markup, setMarkup] = useState(0);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load markup setting + items
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [markupRes, itemsRes] = await Promise.all([
        supabase.from('markup_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('price_list_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (markupRes.data) {
        setMarkup(Number(markupRes.data.markup_revenda) || 0);
      }
      if (itemsRes.data) {
        setItems(itemsRes.data.map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          descricao: r.descricao,
          fornecedor: r.fornecedor || '',
          preco_custo: Number(r.preco_custo) || 0,
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveMarkup = useCallback(async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('markup_settings').upsert({
      user_id: user.id,
      markup_distribuidor: 0,
      markup_revenda: markup,
    }, { onConflict: 'user_id' });

    setSaving(false);
    toast.success('Markup salvo!');
  }, [markup]);

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

      // Try to detect columns
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

      const findCol = (hints: string[]) => keys.find(k => hints.some(h => normalize(k).includes(h)));
      const colCodigo = findCol(['codigo', 'cod', 'ref', 'referencia', 'code']) || keys[0];
      const colDescricao = findCol(['descricao', 'desc', 'produto', 'nome', 'name']) || keys[1];
      const colPreco = findCol(['preco', 'custo', 'price', 'valor', 'cost']) || keys[2];
      const colFornecedor = findCol(['fornecedor', 'distribuidor', 'supplier', 'forn']) || null;

      const parsed = rows
        .map(r => ({
          codigo: String(r[colCodigo] || '').trim(),
          descricao: String(r[colDescricao] || '').trim(),
          preco_custo: parseFloat(String(r[colPreco]).replace(',', '.')) || 0,
          fornecedor: colFornecedor ? String(r[colFornecedor] || '').trim() : '',
        }))
        .filter(r => r.codigo && r.preco_custo > 0);

      if (parsed.length === 0) {
        toast.error('Nenhum item válido encontrado. Verifique se a planilha tem código e preço.');
        setImporting(false);
        return;
      }

      // Insert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize).map(p => ({
          user_id: user.id,
          codigo: p.codigo,
          descricao: p.descricao,
          preco_custo: p.preco_custo,
          fornecedor: p.fornecedor,
        }));
        const { error } = await supabase.from('price_list_items').insert(batch);
        if (error) {
          console.error('Insert error:', error);
          toast.error('Erro ao importar lote');
        }
      }

      // Reload items
      const { data } = await supabase
        .from('price_list_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setItems(data.map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          descricao: r.descricao,
          fornecedor: r.fornecedor || '',
          preco_custo: Number(r.preco_custo) || 0,
        })));
      }

      toast.success(`${parsed.length} itens importados!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler arquivo');
    }

    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    await supabase.from('price_list_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!confirm('Apagar toda a tabela de preços?')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('price_list_items').delete().eq('user_id', user.id);
    setItems([]);
    toast.success('Tabela limpa');
  }, []);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const normalizeSearch = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = normalizeSearch(search);
    return items.filter(i =>
      normalizeSearch(`${i.codigo} ${i.descricao} ${i.fornecedor}`).includes(q)
    );
  }, [items, search]);

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      {/* Markup config */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          Markup Global de Revenda
        </h3>
        <div className="flex items-end gap-3">
          <div className="space-y-1 flex-1 max-w-xs">
            <Label>Markup (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={markup || ''}
              onChange={e => setMarkup(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold"
            />
          </div>
          <Button onClick={handleSaveMarkup} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Preço Revenda = Preço Distribuidor × (1 + {markup}%) 
          {markup > 0 && ` — Ex: R$ 100,00 → ${fmt(100 * (1 + markup / 100))}`}
        </p>
      </Card>

      {/* Upload */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Importar Tabela de Preços
        </h3>
        <p className="text-xs text-muted-foreground">
          Envie um arquivo CSV ou Excel com colunas: Código, Descrição, Preço de Custo e Fornecedor (opcional)
        </p>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2">
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Escolher Arquivo'}
          </Button>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={handleClearAll}>
              <X className="w-3 h-3" /> Limpar tudo
            </Button>
          )}
        </div>
      </Card>

      {/* Price table */}
      {items.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{items.length} itens na tabela</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por código, descrição ou fornecedor..."
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
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Preço Distrib.</TableHead>
                  <TableHead className="text-right">Preço Revenda</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="text-sm">{item.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.fornecedor}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.preco_custo)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {fmt(item.preco_custo * (1 + markup / 100))}
                    </TableCell>
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
                Mostrando 100 de {filtered.length} itens. Use o filtro para encontrar.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
