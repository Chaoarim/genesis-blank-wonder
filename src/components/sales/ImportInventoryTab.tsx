import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InventoryImporter } from './InventoryImporter';
import { InventoryImageUploader } from './InventoryImageUploader';
import * as XLSX from 'xlsx';

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
}

export function ImportInventoryTab() {
  const [markup, setMarkup] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [userId, setUserId] = useState('');
  const [updating, setUpdating] = useState(false);
  const updateFileRef = useRef<HTMLInputElement>(null);

  const refreshItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('inventory_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setInventoryItems(data.map((r: any) => ({
        id: r.id, codigo: r.codigo, produto: r.produto,
        fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
        qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
        image_url: r.image_url || '', visible_catalog: r.visible_catalog ?? false,
      })));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [markupRes, invRes] = await Promise.all([
        supabase.from('markup_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('inventory_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (markupRes.data) setMarkup(Number(markupRes.data.markup_revenda) || 0);
      if (invRes.data) {
        setInventoryItems(invRes.data.map((r: any) => ({
          id: r.id, codigo: r.codigo, produto: r.produto,
          fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
          image_url: r.image_url || '', visible_catalog: r.visible_catalog ?? false,
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const catalogUrl = userId ? `${window.location.origin}/catalogo/${userId}` : '';
  const copyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    toast.success('Link copiado!');
  };

  const handleBulkUpdate = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUpdating(false); return; }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

      if (rows.length === 0) {
        toast.error('Planilha vazia');
        setUpdating(false);
        return;
      }

      const keys = Object.keys(rows[0]);
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

      const keyMap: Record<string, string> = {};
      keys.forEach(k => { keyMap[normalize(k)] = k; });

      const findCol = (hints: string[]): string | null => {
        for (const h of hints) {
          if (keyMap[h]) return keyMap[h];
        }
        for (const h of hints) {
          const found = Object.entries(keyMap).find(([nk]) => nk.includes(h));
          if (found) return found[1];
        }
        return null;
      };

      const colCodigo = findCol(['codigo', 'cod', 'ref', 'referencia', 'code', 'sku']) || keys[0];
      const colProduto = findCol(['produto', 'descricao', 'desc', 'nome', 'peca', 'item']);
      const colFornecedor = findCol(['fornecedor', 'distribuidor', 'supplier', 'forn']);
      const colAplicacao = findCol(['aplicacao', 'aplicacoes', 'veiculo', 'veiculos']);
      const colFoto = findCol(['foto', 'imagem', 'image', 'imageurl', 'img', 'url']);
      const colVendidos = findCol(['vendidos', 'vendido', 'sold', 'vendidosdisplay', 'vendidosexibicao']);

      let updated = 0;
      let notFound = 0;

      for (const row of rows) {
        const codigo = String(row[colCodigo] || '').trim();
        if (!codigo) continue;

        const updateData: Record<string, any> = {};

        if (colProduto && row[colProduto] !== undefined && String(row[colProduto]).trim()) {
          updateData.produto = String(row[colProduto]).trim();
        }
        if (colFornecedor && row[colFornecedor] !== undefined && String(row[colFornecedor]).trim()) {
          updateData.fornecedor = String(row[colFornecedor]).trim();
        }
        if (colAplicacao && row[colAplicacao] !== undefined && String(row[colAplicacao]).trim()) {
          updateData.aplicacao = String(row[colAplicacao]).trim();
        }
        if (colFoto && row[colFoto] !== undefined && String(row[colFoto]).trim()) {
          updateData.image_url = String(row[colFoto]).trim();
        }
        if (colVendidos && row[colVendidos] !== undefined) {
          const v = parseInt(String(row[colVendidos]));
          if (!isNaN(v)) updateData.vendidos_display = v;
        }

        if (Object.keys(updateData).length === 0) continue;

        const { data, error } = await supabase
          .from('inventory_items')
          .update(updateData)
          .eq('user_id', user.id)
          .eq('codigo', codigo)
          .select('id');

        if (error) {
          console.error('Update error for', codigo, error);
        } else if (data && data.length > 0) {
          updated++;
        } else {
          notFound++;
        }
      }

      await refreshItems();
      toast.success(`${updated} itens atualizados!${notFound > 0 ? ` ${notFound} códigos não encontrados.` : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler arquivo de atualização');
    }

    setUpdating(false);
    if (updateFileRef.current) updateFileRef.current.value = '';
  }, [refreshItems]);

  const downloadUpdateTemplate = useCallback(() => {
    const header = [['Código', 'Produto', 'Fornecedor', 'Aplicação', 'Foto (URL)', 'Vendidos']];
    const sample = [
      ['ABC123', 'Pastilha de Freio Dianteira', 'Fras-le', 'Gol G5 2010-2014', 'https://...', 50],
      ['DEF456', '', 'Tecfil', '', '', 120],
    ];
    const ws = XLSX.utils.aoa_to_sheet([...header, ...sample]);
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Atualizar');
    XLSX.writeFile(wb, 'modelo-atualizar-estoque.xlsx');
    toast.success('Modelo de atualização baixado!');
  }, []);

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      {/* Catalog Link */}
      {userId && inventoryItems.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Catálogo B2B Online
          </h3>
          <p className="text-xs text-muted-foreground">
            Compartilhe este link com seus clientes para que possam consultar preços e fazer pedidos:
          </p>
          <div className="flex gap-2">
            <Input readOnly value={catalogUrl} className="text-xs font-mono" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Inventory Importer */}
      <InventoryImporter items={inventoryItems} setItems={setInventoryItems} markup={markup} />

      {/* Bulk Updater */}
      {inventoryItems.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Atualizar Itens em Lote
          </h3>
          <p className="text-xs text-muted-foreground">
            Envie uma planilha com a coluna <strong>Código</strong> (obrigatória para identificar o item) e as colunas que deseja atualizar: 
            <strong> Produto, Fornecedor, Aplicação, Foto (URL), Vendidos</strong>. Campos vazios não serão alterados.
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={updateFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleBulkUpdate} className="hidden" />
            <Button variant="outline" onClick={() => updateFileRef.current?.click()} disabled={updating} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Atualizando...' : 'Atualizar via Planilha'}
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadUpdateTemplate}>
              <Download className="w-4 h-4" />
              Baixar Modelo de Atualização
            </Button>
          </div>
        </Card>
      )}

      {/* Image Uploader */}
      {inventoryItems.length > 0 && (
        <InventoryImageUploader onImagesUploaded={refreshItems} />
      )}
    </div>
  );
}
