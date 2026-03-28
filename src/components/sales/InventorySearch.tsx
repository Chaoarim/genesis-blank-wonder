import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, ExternalLink, Pencil, Check, X, ImagePlus, Loader2, Flame, Tags } from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllInventory } from '@/lib/fetchAllInventory';
import { PartThumbnail } from '@/components/PartThumbnail';
import { smartFilterInventory } from '@/lib/partsSearchEngine';
import { prioritizeCodeMatches } from '@/lib/partCodeSearch';
import { toast } from 'sonner';
import { ListSkeleton } from './ListSkeleton';
import { printPriceLabels } from '@/lib/priceLabels';

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

type EditField = 'qtd_estoque' | 'codigo' | 'produto' | 'fornecedor' | 'aplicacao' | 'vendidos_display' | 'preco';

export function InventorySearch({ adminUserId: _adminUserId }: { adminUserId?: string | null }) {
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

      const [allItems, markupRes] = await Promise.all([
        fetchAllInventory(user.id, 'produto', true),
        supabase.from('markup_settings').select('markup_revenda').eq('user_id', user.id).maybeSingle(),
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
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const smartResults = smartFilterInventory(items, search);
    return prioritizeCodeMatches(items, search, smartResults);
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
    } else if (editField === 'preco') {
      const newPrice = parseFloat(editValue.replace(',', '.'));
      if (isNaN(newPrice) || newPrice < 0) { toast.error('Preço inválido'); return; }
      updateData.preco = newPrice;
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
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="h-8 text-sm px-2 py-1 min-w-[80px] border-primary/50 focus:border-primary bg-muted/30"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null); }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-600/10 shrink-0" onClick={() => saveEdit(item.id)}>
            <Check className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => setEditingId(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-1.5 group/cell cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-muted/50 transition-colors"
        onClick={() => startEdit(item.id, field, value)}
        title="Clique para editar"
      >
        <span className={className}>{value}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-40 group-hover/cell:opacity-100 shrink-0 transition-opacity" />
      </div>
    );
  };

  if (loading) return <ListSkeleton count={5} variant="card" />;

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
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Consultar Estoque ({items.length} itens)
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const toPrint = search.trim() ? filtered.slice(0, 30) : filtered.slice(0, 30);
              if (toPrint.length === 0) { toast.error('Nenhum item para imprimir'); return; }
              printPriceLabels(toPrint, markup);
              toast.success(`Gerando ${toPrint.length} etiquetas...`);
            }}
          >
            <Tags className="w-4 h-4" />
            Imprimir Etiquetas
          </Button>
        </div>

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

        <div className="overflow-y-auto max-h-[600px] rounded-lg border">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">Foto</TableHead>
                <TableHead className="w-[80px]">Código</TableHead>
                <TableHead className="w-[25%]">Produto</TableHead>
                <TableHead className="w-[70px]">Fornec.</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead className="text-center w-[50px]">Est.</TableHead>
                <TableHead className="text-center w-[50px]">
                  <span className="flex items-center justify-center gap-0.5"><Flame className="w-3 h-3" />Vend.</span>
                </TableHead>
                <TableHead className="text-right w-[75px]">P.Custo</TableHead>
                <TableHead className="text-right w-[80px]">P.Revenda</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(item => {
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
                          <div className="w-9 h-9 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                        ) : (
                          <>
                            <PartThumbnail imageUrl={item.image_url} alt={`${item.codigo} - ${item.produto}`} className="w-9 h-9" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <ImagePlus className="w-4 h-4 text-white" />
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {renderEditableCell(item, 'codigo', item.codigo)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="whitespace-normal break-words">
                        {renderEditableCell(item, 'produto', item.produto, 'font-medium')}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="whitespace-normal break-words">
                        {renderEditableCell(item, 'fornecedor', item.fornecedor, 'text-muted-foreground')}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="whitespace-normal break-words">
                        {renderEditableCell(item, 'aplicacao', item.aplicacao, 'text-muted-foreground')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {renderEditableCell(item, 'qtd_estoque', item.qtd_estoque,
                        `font-bold ${item.qtd_estoque <= 0 ? 'text-destructive' : item.qtd_estoque <= 3 ? 'text-amber-500' : 'text-green-600'}`
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {renderEditableCell(item, 'vendidos_display', item.vendidos_display,
                        `font-bold ${item.vendidos_display > 0 ? 'text-orange-500' : 'text-muted-foreground'}`
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {renderEditableCell(item, 'preco', item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        'font-bold text-primary'
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="font-bold text-green-600">
                        {markup > 0
                          ? (item.preco * (1 + markup / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : fmt(item.preco)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          const q = `${item.codigo} ${item.produto} ${item.fornecedor}`;
                          window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`, '_blank');
                        }}>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        <ConfirmDeleteDialog
                          description={`Tem certeza que deseja excluir o item ${item.codigo} do estoque?`}
                          onConfirm={() => deleteItem(item.id, item.codigo)}
                          iconSize="sm"
                        />
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
