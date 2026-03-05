import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PackagePlus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ManualProductFormProps {
  onProductAdded: () => void;
}

export function ManualProductForm({ onProductAdded }: ManualProductFormProps) {
  const [codigo, setCodigo] = useState('');
  const [produto, setProduto] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [aplicacao, setAplicacao] = useState('');
  const [qtdEstoque, setQtdEstoque] = useState(0);
  const [preco, setPreco] = useState(0);
  const [vendidosDisplay, setVendidosDisplay] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!codigo.trim() || !produto.trim()) {
      toast.error('Código e Produto são obrigatórios');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from('inventory_items').insert({
      user_id: user.id,
      codigo: codigo.trim(),
      produto: produto.trim(),
      fornecedor: fornecedor.trim(),
      aplicacao: aplicacao.trim(),
      qtd_estoque: qtdEstoque,
      preco,
      vendidos_display: vendidosDisplay,
    } as any);

    setSaving(false);

    if (error) {
      toast.error('Erro ao cadastrar produto');
      return;
    }

    toast.success('Produto cadastrado com sucesso!');
    setCodigo('');
    setProduto('');
    setFornecedor('');
    setAplicacao('');
    setQtdEstoque(0);
    setPreco(0);
    setVendidosDisplay(0);
    onProductAdded();
  }, [codigo, produto, fornecedor, aplicacao, qtdEstoque, preco, vendidosDisplay, onProductAdded]);

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <PackagePlus className="w-5 h-5 text-primary" />
        Cadastrar Produto Manualmente
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Código *</Label>
          <Input placeholder="Ex: 7890123" value={codigo} onChange={e => setCodigo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Produto *</Label>
          <Input placeholder="Ex: Pastilha de Freio" value={produto} onChange={e => setProduto(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Fornecedor</Label>
          <Input placeholder="Ex: FRAS-LE" value={fornecedor} onChange={e => setFornecedor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Aplicação</Label>
          <Input placeholder="Ex: Gol G5 2010-2014" value={aplicacao} onChange={e => setAplicacao(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Qtd Estoque</Label>
          <Input type="number" min={0} value={qtdEstoque || ''} onChange={e => setQtdEstoque(parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-1">
          <Label>Preço Custo (R$)</Label>
          <Input type="number" min={0} step={0.01} value={preco || ''} onChange={e => setPreco(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-1">
          <Label>🔥 Vendidos (exibição)</Label>
          <Input type="number" min={0} value={vendidosDisplay || ''} onChange={e => setVendidosDisplay(parseInt(e.target.value) || 0)} placeholder="Ex: 150" />
          <p className="text-[10px] text-muted-foreground">Número exibido no catálogo para gerar urgência</p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Cadastrar Produto'}
      </Button>
    </Card>
  );
}
