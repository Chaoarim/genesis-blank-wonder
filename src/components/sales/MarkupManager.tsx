import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Percent, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Part } from '@/hooks/usePartsDatabase';

interface MarkupManagerProps {
  parts: Part[];
}

export function MarkupManager({ parts }: MarkupManagerProps) {
  const [markupDistribuidor, setMarkupDistribuidor] = useState(0);
  const [markupRevenda, setMarkupRevenda] = useState(0);
  const [custoBase, setCustoBase] = useState(0);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('markup_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setMarkupDistribuidor(Number(data.markup_distribuidor) || 0);
        setMarkupRevenda(Number(data.markup_revenda) || 0);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('markup_settings')
      .upsert({
        user_id: user.id,
        markup_distribuidor: markupDistribuidor,
        markup_revenda: markupRevenda,
      }, { onConflict: 'user_id' });

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar markup');
    } else {
      toast.success('Markup salvo com sucesso!');
    }
  }, [markupDistribuidor, markupRevenda]);

  const precoDistribuidor = custoBase * (1 + markupDistribuidor / 100);
  const precoRevenda = custoBase * (1 + markupRevenda / 100);

  const normalize = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredParts = useMemo(() => {
    if (!search.trim()) return [];
    const q = normalize(search);
    return parts
      .filter(p => {
        const text = normalize(`${p.fabricante} ${p.produto} ${p.fornecedor} ${p.marca} ${p.modelo}`);
        return text.includes(q);
      })
      .slice(0, 30);
  }, [parts, search]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      {/* Configuração de Markup */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          Configuração de Markup
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Markup Distribuidor (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={markupDistribuidor || ''}
                onChange={e => setMarkupDistribuidor(parseFloat(e.target.value) || 0)}
                className="text-lg font-semibold"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Percentual para preço de distribuidor</p>
          </div>

          <div className="space-y-2">
            <Label>Markup Revenda (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={markupRevenda || ''}
                onChange={e => setMarkupRevenda(parseFloat(e.target.value) || 0)}
                className="text-lg font-semibold"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Percentual para preço de revenda</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Markup'}
        </Button>
      </Card>

      {/* Calculadora rápida */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Calculadora Rápida</h3>
        <div className="space-y-2">
          <Label>Preço de Custo (R$)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={custoBase || ''}
            onChange={e => setCustoBase(parseFloat(e.target.value) || 0)}
            placeholder="Digite o custo da peça"
            className="text-lg"
          />
        </div>

        {custoBase > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Preço Distribuidor</p>
              <p className="text-xl font-bold text-primary">{fmt(precoDistribuidor)}</p>
              <p className="text-xs text-muted-foreground">+{markupDistribuidor}%</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Preço Revenda</p>
              <p className="text-xl font-bold text-accent-foreground">{fmt(precoRevenda)}</p>
              <p className="text-xs text-muted-foreground">+{markupRevenda}%</p>
            </div>
          </div>
        )}
      </Card>

      {/* Simular com peças do catálogo */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="w-4 h-4" />
          Simular com Peças do Catálogo
        </h3>
        <Input
          placeholder="Buscar peça por código, nome ou fabricante..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {filteredParts.length > 0 && (
          <div className="overflow-auto max-h-96 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead className="text-right">Distribuidor</TableHead>
                  <TableHead className="text-right">Revenda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{p.fabricante}</TableCell>
                    <TableCell className="text-sm">{p.produto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.fornecedor}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">+{markupDistribuidor}%</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">+{markupRevenda}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
