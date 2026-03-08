import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, ExternalLink, Pencil, Check, X, Trash2, ImagePlus, Loader2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllInventory } from '@/lib/fetchAllInventory';
import { PartThumbnail } from '@/components/PartThumbnail';
import { smartFilterInventory } from '@/lib/partsSearchEngine';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
  image_url?: string;
  vendidos_display: number;
}

type EditField = 'qtd_estoque' | 'codigo' | 'produto' | 'fornecedor' | 'aplicacao' | 'vendidos_display';

export function InventorySearch({ adminUserId }: { adminUserId?: string | null }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [markup, setMarkup] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<EditField>('qtd_estoque');
  const [editValue, setEditValue] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const effectiveId = adminUserId || user.id;

      const [allItems, markupRes] = await Promise.all([
        fetchAllInventory(effectiveId, 'produto', true),
        supabase.from('markup_settings').select('markup_revenda').eq('user_id', effectiveId).maybeSingle(),
      ]);

      setItems(allItems.map(r => ({
        id: r.id, codigo: r.codigo, produto: r.produto,
        fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
        qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
        image_url: r.image_url || '', vendidos_display: Number(r.vendidos_display) || 0,
      })));
      setMarkup(Number(markupRes.data?.markup_revenda) || 0);
      setLoading(false);
    };
    load();
  }, [adminUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return smartFilterInventory(items, search);
  }, [items, search]);

  const startEdit = (id: string, field: EditField, currentValue: string | number) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(String(currentValue));
  };

  const saveEdit = useCallback(async (id: string) => {
    const updateData: Record<string, any> = {};

    if (editField === 'qtd_estoque' || editField === 'vendidos_display') {
      const newQty = parseInt(editValue);
      if (isNaN(newQty) || newQty < 0) { toast.error('Valor inválido'); return; }
      updateData[editField] = newQty;
    } else {
      if (editField === 'codigo' && !editValue.trim()) { toast.error('Código não pode ser vazio'); return; }
      if (editField === 'produto' && !editValue.trim()) { toast.error('Produto não pode ser vazio'); return; }
      updateData[editField] = editValue.trim();
    }

    const { error } = await supabase.from('inventory_items').update(updateData).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
    setEditingId(null);
    toast.success('Atualizado!');
  }, [editValue, editField]);

  const deleteItem = useCallback(async (id: string, codigo: string) => {
    if (!confirm(`Excluir item ${codigo} do estoque?`)) return;
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success(`${codigo} excluído`);
  }, []);

  const handleImageUpload = useCallback(async (itemId: string, codigo: string, file: File) => {
    setUploadingId(itemId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingId(null); return; }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `inventory/${user.id}/${codigo}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('part-images').upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error('Erro no upload'); setUploadingId(null); return; }

    const { data: publicUrlData } = supabase.storage.from('part-images').getPublicUrl(filePath);
    const imageUrl = publicUrlData.publicUrl;

    const { error } = await supabase.from('inventory_items').update({ image_url: imageUrl }).eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, image_url: imageUrl } : i));
      toast.success('Foto atualizada!');
    }
    setUploadingId(null);
  }, []);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const renderEditableCell = (item: InventoryItem, field: EditField, value: string | number, className?: string) => {
    if (editingId === item.id && editField === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type={field === 'qtd_estoque' ? 'number' : 'text'}
            min={field === 'qtd_estoque' ? 0 : undefined}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="h-7 text-xs p-1 min-w-[60px]"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null); }}
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 shrink-0" onClick={() => saveEdit(item.id)}>
            <Check className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => setEditingId(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 group/cell cursor-pointer" onClick={() => startEdit(item.id, field, value)}>
        <span className={className}>{value}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover/cell:opacity-50 shrink-0" />
      </div>
    );
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando estoque...</p>;

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center space-y-2">
        <Package className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="font-medium">Nenhum item no estoque</p>
        <p className="text-sm text-muted-foreground">Importe sua planilha na aba Markup para começar</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        const id = fileRef.current?.dataset.itemId;
        const codigo = fileRef.current?.dataset.itemCodigo;
        if (file && id && codigo) handleImageUpload(id, codigo, file);
        if (fileRef.current) fileRef.current.value = '';
      }} />

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Consultar Estoque ({items.length} itens)
        </h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, produto, fornecedor ou veículo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-base"
            autoFocus
          />
        </div>

        {search.trim() && (
          <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        )}

        <div className="overflow-auto max-h-[600px] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Foto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1"><Flame className="w-3 h-3" />Vendidos</span>
                </TableHead>
                <TableHead className="text-right">Preço Revenda</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(item => {
                const precoRevenda = markup > 0 ? item.preco * (1 + markup / 100) : item.preco;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="p-1">
                      <div className="relative group/photo cursor-pointer" onClick={() => {
                        if (fileRef.current) {
                          fileRef.current.dataset.itemId = item.id;
                          fileRef.current.dataset.itemCodigo = item.codigo;
                          fileRef.current.click();
                        }
                      }}>
                        {uploadingId === item.id ? (
                          <div className="w-10 h-10 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                        ) : (
                          <>
                            <PartThumbnail imageUrl={item.image_url} alt={`${item.codigo} - ${item.produto}`} className="w-10 h-10" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <ImagePlus className="w-4 h-4 text-white" />
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {renderEditableCell(item, 'codigo', item.codigo)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {renderEditableCell(item, 'produto', item.produto, 'font-medium')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {renderEditableCell(item, 'fornecedor', item.fornecedor, 'text-muted-foreground')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {renderEditableCell(item, 'aplicacao', item.aplicacao, 'text-muted-foreground')}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderEditableCell(item, 'qtd_estoque', item.qtd_estoque,
                        `font-bold ${item.qtd_estoque <= 0 ? 'text-destructive' : item.qtd_estoque <= 3 ? 'text-amber-500' : 'text-green-600'}`
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderEditableCell(item, 'vendidos_display', item.vendidos_display,
                        `font-bold ${item.vendidos_display > 0 ? 'text-orange-500' : 'text-muted-foreground'}`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">{fmt(precoRevenda)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          const q = `${item.codigo} ${item.produto} ${item.fornecedor}`;
                          window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`, '_blank');
                        }}>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteItem(item.id, item.codigo)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length > 200 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Mostrando 200 de {filtered.length}. Refine sua busca.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
