import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Search, FileSpreadsheet, X, Package, Download, Eye, EyeOff, Pencil, Check, ImagePlus, Flame } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { useMemo } from 'react';
import { fetchAllInventory } from '@/lib/fetchAllInventory';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
  image_url?: string;
  visible_catalog?: boolean;
  vendidos_display?: number;
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
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoEditId, setPhotoEditId] = useState<string | null>(null);

  const startEdit = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const saveEdit = useCallback(async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    const dbField = field === 'vendidos_display' ? 'vendidos_display' : field;
    const value = field === 'vendidos_display' ? (parseInt(editValue) || 0) : editValue.trim();

    const { error } = await supabase.from('inventory_items').update({ [dbField]: value }).eq('id', id);
    if (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    } else {
      setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
      toast.success('Atualizado!');
    }
    setEditingCell(null);
  }, [editingCell, editValue, items, setItems]);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoEditId) return;

    const item = items.find(i => i.id === photoEditId);
    if (!item) return;

    const ext = file.name.split('.').pop();
    const path = `${item.codigo.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('part-images').upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error('Erro no upload');
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(path);
    const { error } = await supabase.from('inventory_items').update({ image_url: publicUrl }).eq('id', photoEditId);
    if (error) {
      toast.error('Erro ao salvar URL');
    } else {
      setItems(items.map(i => i.id === photoEditId ? { ...i, image_url: publicUrl } : i));
      toast.success('Foto atualizada!');
    }
    setPhotoEditId(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }, [photoEditId, items, setItems]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
      const rowsFormatted: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      const rows = rowsRaw.length > 0 ? rowsRaw : rowsFormatted;

      if (rows.length === 0) { toast.error('Planilha vazia'); setImporting(false); return; }

      const keys = Object.keys(rows[0]);
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const keyMap: Record<string, string> = {};
      keys.forEach(k => { keyMap[normalize(k)] = k; });

      const findCol = (hints: string[]): string | null => {
        for (const h of hints) { if (keyMap[h]) return keyMap[h]; }
        for (const h of hints) { const f = Object.entries(keyMap).find(([nk]) => nk.startsWith(h)); if (f) return f[1]; }
        for (const h of hints) { const f = Object.entries(keyMap).find(([nk]) => nk.includes(h)); if (f) return f[1]; }
        return null;
      };

      const parseNum = (v: any): number => {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        let s = String(v).trim().replace(/[R$€£¥\s]/g, '');
        if (!s) return 0;
        const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
        if (lc > ld) s = s.replace(/\./g, '').replace(',', '.');
        else if (ld > lc) s = s.replace(/,/g, '');
        else s = s.replace(',', '.');
        const p = parseFloat(s);
        return isNaN(p) ? 0 : p;
      };

      let colCodigo = findCol(['codigo', 'cod', 'ref', 'referencia', 'code', 'sku']);
      let colProduto = findCol(['produto', 'descricao', 'desc', 'nome', 'peca', 'item']);
      let colFornecedor = findCol(['fornecedor', 'distribuidor', 'supplier', 'forn']);
      let colAplicacao = findCol(['aplicacao', 'aplicacoes', 'veiculo', 'veiculos', 'carro', 'auto', 'uso']);
      let colEstoque = findCol(['estoque', 'qtd', 'quantidade', 'stock', 'qty', 'saldo']);
      let colPreco = findCol(['preco', 'custo', 'price', 'valor', 'cost', 'vlr']);

      if (!colPreco && keys.length >= 6) colPreco = keys[5];
      if (!colAplicacao && keys.length >= 4) colAplicacao = keys[3];
      if (!colCodigo) colCodigo = keys[0];
      if (!colProduto) colProduto = keys[1];
      if (!colFornecedor && keys.length >= 3) colFornecedor = keys[2];
      if (!colEstoque && keys.length >= 5) colEstoque = keys[4];

      const parsed = rows
        .map(r => ({
          codigo: String(r[colCodigo!] || '').trim(),
          produto: String(r[colProduto!] || '').trim(),
          fornecedor: colFornecedor ? String(r[colFornecedor] || '').trim() : '',
          aplicacao: colAplicacao ? String(r[colAplicacao] || '').trim() : '',
          qtd_estoque: colEstoque ? (parseInt(String(r[colEstoque])) || 0) : 0,
          preco: colPreco ? parseNum(r[colPreco]) : 0,
        }))
        .filter(r => r.codigo);

      if (parsed.length === 0) { toast.error('Nenhum item válido encontrado.'); setImporting(false); return; }

      const batchSize = 500;
      let insertedCount = 0;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize).map(p => ({ user_id: user.id, ...p }));
        const { error } = await supabase.from('inventory_items').insert(batch);
        if (error) {
          console.error('Insert error at batch', i, ':', error);
          toast.error(`Erro no lote ${Math.floor(i / batchSize) + 1}`);
        } else {
          insertedCount += batch.length;
        }
      }

      // Fetch ALL items using paginated helper (bypasses 1000-row limit)
      const allItems = await fetchAllInventory(user.id);
      setItems(allItems.map(r => ({
        id: r.id, codigo: r.codigo, produto: r.produto,
        fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
        qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
        image_url: r.image_url || '', visible_catalog: r.visible_catalog ?? false,
        vendidos_display: Number(r.vendidos_display) || 0,
      })));
      toast.success(`${insertedCount} de ${parsed.length} itens importados ao estoque!`);
    } catch (err) { console.error(err); toast.error('Erro ao ler arquivo'); }

    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [setItems]);

  const toggleCatalogVisibility = useCallback(async (id: string, visible: boolean) => {
    await supabase.from('inventory_items').update({ visible_catalog: visible }).eq('id', id);
    setItems(items.map(i => i.id === id ? { ...i, visible_catalog: visible } : i));
    toast.success(visible ? 'Item visível no catálogo' : 'Item oculto do catálogo');
  }, [items, setItems]);

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
  const normalizeSearch = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = normalizeSearch(search);
    return items.filter(i => normalizeSearch(`${i.codigo} ${i.produto} ${i.fornecedor} ${i.aplicacao}`).includes(q));
  }, [items, search]);

  const isEditing = (id: string, field: string) => editingCell?.id === id && editingCell?.field === field;

  const EditableCell = ({ id, field, value, className = '' }: { id: string; field: string; value: string; className?: string }) => {
    if (isEditing(id, field)) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
            className="h-7 text-xs min-w-[60px]"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={saveEdit}>
            <Check className="w-3 h-3 text-green-600" />
          </Button>
        </div>
      );
    }
    return (
      <div className={`flex items-start gap-1 group ${className}`}>
        <span className="whitespace-normal break-words leading-snug">{value || '—'}</span>
        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-40 group-hover:opacity-100 shrink-0 transition-opacity mt-0.5" onClick={() => startEdit(id, field, value)}>
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input for photo editing */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Importar Estoque (Catálogo B2B)
        </h3>
        <p className="text-xs text-muted-foreground">
          Envie um arquivo CSV ou Excel com: Código, Produto, Fornecedor, Aplicação (veículo), Qtd Estoque e Preço
        </p>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2">
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Escolher Arquivo'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const header = [['Código', 'Produto', 'Fornecedor', 'Aplicação', 'Qtd Estoque', 'Preço']];
              const sample = [
                ['ABC123', 'Pastilha de Freio Dianteira', 'Fras-le', 'Gol G5 2010-2014', 10, 45.90],
                ['DEF456', 'Filtro de Óleo', 'Tecfil', 'Civic 2012-2016', 25, 22.50],
                ['GHI789', 'Amortecedor Traseiro', 'Cofap', 'Corolla 2015-2019', 4, 189.00],
              ];
              const ws = XLSX.utils.aoa_to_sheet([...header, ...sample]);
              ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
              XLSX.writeFile(wb, 'modelo-estoque.xlsx');
              toast.success('Modelo baixado!');
            }}
          >
            <Download className="w-4 h-4" />
            Baixar Modelo
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
            <p className="text-xs text-muted-foreground">Clique no ✏️ para editar</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Filtrar por código, produto, fornecedor ou aplicação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="overflow-y-auto max-h-[500px] rounded-lg border">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead className="w-[90px]">Código</TableHead>
                  <TableHead className="w-[24%]">Produto</TableHead>
                  <TableHead className="w-[110px]">Fornecedor</TableHead>
                  <TableHead>Aplicação</TableHead>
                  <TableHead className="text-center w-[74px]">Vendidos</TableHead>
                  <TableHead className="text-center w-[70px]">Catálogo</TableHead>
                  <TableHead className="text-center w-[74px]">Estoque</TableHead>
                  <TableHead className="text-right w-[110px]">Preço Custo</TableHead>
                  {markup > 0 && <TableHead className="text-right w-[120px]">Preço Revenda</TableHead>}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(item => (
                  <TableRow key={item.id}>
                    {/* Foto - editable */}
                    <TableCell className="p-1">
                      <div className="relative group cursor-pointer" onClick={() => {
                        setPhotoEditId(item.id);
                        photoInputRef.current?.click();
                      }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.codigo} className="w-10 h-10 object-cover rounded" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </TableCell>
                    {/* Código - editable */}
                    <TableCell className="font-mono text-xs align-top break-all">
                      <EditableCell id={item.id} field="codigo" value={item.codigo} />
                    </TableCell>
                    {/* Produto - editable */}
                    <TableCell className="text-sm align-top">
                      <EditableCell id={item.id} field="produto" value={item.produto} className="whitespace-normal break-words" />
                    </TableCell>
                    {/* Fornecedor - editable */}
                    <TableCell className="text-sm text-muted-foreground align-top">
                      <EditableCell id={item.id} field="fornecedor" value={item.fornecedor} className="whitespace-normal break-words" />
                    </TableCell>
                    {/* Aplicação - editable */}
                    <TableCell className="text-sm text-muted-foreground align-top">
                      <EditableCell id={item.id} field="aplicacao" value={item.aplicacao} className="whitespace-normal break-words" />
                    </TableCell>
                    {/* Vendidos - editable */}
                    <TableCell className="text-center">
                      {isEditing(item.id, 'vendidos_display') ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                            className="h-7 text-xs w-16 text-center"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit}>
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center group">
                          {(item.vendidos_display || 0) > 0 && <Flame className="w-3 h-3 text-orange-500" />}
                          <span className="text-xs">{item.vendidos_display || 0}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" onClick={() => startEdit(item.id, 'vendidos_display', String(item.vendidos_display || 0))}>
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={item.visible_catalog ?? false} onCheckedChange={(v) => toggleCatalogVisibility(item.id, v)} />
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.qtd_estoque}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.preco)}</TableCell>
                    {markup > 0 && (
                      <TableCell className="text-right font-bold text-primary">{fmt(item.preco * (1 + markup / 100))}</TableCell>
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
              <p className="text-center text-xs text-muted-foreground py-2">Mostrando 100 de {filtered.length} itens. Use o filtro.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
