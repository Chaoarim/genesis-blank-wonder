import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Percent, Link2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InventoryImporter } from './InventoryImporter';
import { InventoryImageUploader } from './InventoryImageUploader';
import { ManualProductForm } from './ManualProductForm';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
  image_url?: string;
}

export function MarkupManager() {
  const [markup, setMarkup] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [markupRes, invRes] = await Promise.all([
        supabase.from('markup_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('inventory_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (markupRes.data) {
        setMarkup(Number(markupRes.data.markup_revenda) || 0);
      }
      if (invRes.data) {
        setInventoryItems(invRes.data.map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          produto: r.produto,
          fornecedor: r.fornecedor || '',
          aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0,
          preco: Number(r.preco) || 0,
          image_url: r.image_url || '',
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

  const catalogUrl = userId ? `${window.location.origin}/catalogo/${userId}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    toast.success('Link copiado!');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      {/* Markup config */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          Markup e Cadastro de Produtos
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
          Preço Revenda = Preço Custo × (1 + {markup}%)
          {markup > 0 && ` — Ex: R$ 100,00 → ${fmt(100 * (1 + markup / 100))}`}
        </p>
      </Card>

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

      {/* Manual Product Form */}
      <ManualProductForm onProductAdded={async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('inventory_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) {
          setInventoryItems(data.map((r: any) => ({
            id: r.id, codigo: r.codigo, produto: r.produto,
            fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
            qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
            image_url: r.image_url || '',
          })));
        }
      }} />

      {/* Inventory Importer */}
      <InventoryImporter items={inventoryItems} setItems={setInventoryItems} markup={markup} />

      {/* Image Uploader - only show when there are items */}
      {inventoryItems.length > 0 && (
        <InventoryImageUploader onImagesUploaded={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase.from('inventory_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if (data) {
            setInventoryItems(data.map((r: any) => ({
              id: r.id, codigo: r.codigo, produto: r.produto,
              fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
              qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
              image_url: r.image_url || '',
            })));
          }
        }} />
      )}
    </div>
  );
}
