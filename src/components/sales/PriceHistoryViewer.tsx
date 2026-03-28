import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Search, TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import { ListSkeleton } from './ListSkeleton';

interface PriceRecord {
  id: string;
  codigo: string;
  produto: string;
  preco_anterior: number;
  preco_novo: number;
  tipo: string;
  created_at: string;
}

interface Props {
  adminUserId: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PriceHistoryViewer({ adminUserId }: Props) {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!adminUserId) return;
      setLoading(true);
      const { data } = await supabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (data) setRecords(data as PriceRecord[]);
      setLoading(false);
    };
    load();
  }, [adminUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      r.codigo.toLowerCase().includes(q) ||
      r.produto.toLowerCase().includes(q)
    );
  }, [records, search]);

  // Group by product for summary
  const productSummary = useMemo(() => {
    const map = new Map<string, { codigo: string; produto: string; changes: number; lastPrice: number; firstPrice: number }>();
    // Records are newest first, so iterate in reverse for first/last
    [...records].reverse().forEach(r => {
      const key = r.codigo;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { codigo: r.codigo, produto: r.produto, changes: 1, lastPrice: r.preco_novo, firstPrice: r.preco_anterior });
      } else {
        existing.changes += 1;
        existing.lastPrice = r.preco_novo;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.changes - a.changes).slice(0, 10);
  }, [records]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Histórico de Preços</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Toda alteração de preço no estoque é registrada automaticamente. Visualize a evolução dos preços ao longo do tempo.
      </p>

      {/* Top changed products */}
      {productSummary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {productSummary.slice(0, 5).map(p => {
            const variation = p.firstPrice > 0 ? ((p.lastPrice - p.firstPrice) / p.firstPrice * 100) : 0;
            return (
              <Card key={p.codigo} className="p-3">
                <p className="text-xs font-mono text-muted-foreground truncate">{p.codigo}</p>
                <p className="text-xs font-medium truncate">{p.produto}</p>
                <div className="flex items-center gap-1 mt-1">
                  {variation > 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : variation < 0 ? <TrendingDown className="w-3 h-3 text-green-500" /> : <Minus className="w-3 h-3" />}
                  <span className={`text-xs font-bold ${variation > 0 ? 'text-red-500' : variation < 0 ? 'text-green-500' : ''}`}>
                    {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{p.changes} alterações</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por código ou produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-4"><ListSkeleton count={5} variant="table-row" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum registro de alteração de preço encontrado.</p>
            <p className="text-xs mt-1">As alterações de preço no estoque serão registradas automaticamente aqui.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Preço Anterior</TableHead>
                <TableHead className="text-right">Preço Novo</TableHead>
                <TableHead className="text-right">Variação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(r => {
                const diff = r.preco_novo - r.preco_anterior;
                const pct = r.preco_anterior > 0 ? (diff / r.preco_anterior * 100) : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString('pt-BR')} {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[200px]">{r.produto}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(r.preco_anterior)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{fmt(r.preco_novo)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`text-xs ${diff > 0 ? 'text-red-500 border-red-200' : diff < 0 ? 'text-green-500 border-green-200' : ''}`}>
                        {diff > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : diff < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                        {diff > 0 ? '+' : ''}{pct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {filtered.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">Mostrando 100 de {filtered.length} registros</p>
      )}
    </div>
  );
}
