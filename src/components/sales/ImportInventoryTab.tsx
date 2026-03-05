import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InventoryImporter } from './InventoryImporter';
import { InventoryImageUploader } from './InventoryImageUploader';

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

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
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

      <InventoryImporter items={inventoryItems} setItems={setInventoryItems} markup={markup} />

      {inventoryItems.length > 0 && (
        <InventoryImageUploader onImagesUploaded={refreshItems} />
      )}
    </div>
  );
}
