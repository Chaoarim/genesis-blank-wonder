import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Upload, Loader2, Trash2, Car, TrendingUp, AlertTriangle, Package, Search, Download, FileSpreadsheet, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface FleetRanking {
  id: string;
  year: number;
  position: number;
  model: string;
  quantity: number;
  vehicle_type: string;
}

interface FleetRankingsManagerProps {
  adminUserId: string | null;
  readOnly?: boolean;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export function FleetRankingsManager({ adminUserId, readOnly = false }: FleetRankingsManagerProps) {
  const [rankings, setRankings] = useState<FleetRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('automovel');
  const [searchQuery, setSearchQuery] = useState('');
  const [partsMatches, setPartsMatches] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fleet_rankings')
      .select('*')
      .order('year', { ascending: false })
      .order('position', { ascending: true });
    if (error) { toast.error('Erro ao carregar rankings'); setLoading(false); return; }
    const rows = (data || []) as FleetRanking[];
    setRankings(rows);
    const uniqueYears = [...new Set(rows.map(r => r.year))].sort((a, b) => b - a);
    setYears(uniqueYears);
    if (!selectedYear && uniqueYears.length > 0) setSelectedYear(String(uniqueYears[0]));
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => { fetchRankings(); }, []);

  // Count parts matches for demand suggestion
  useEffect(() => {
    if (!rankings.length) return;
    const matchModels = async () => {
      const models = [...new Set(rankings.map(r => r.model))];
      const counts: Record<string, number> = {};
      for (const model of models.slice(0, 30)) {
        const keywords = model.replace(/\//g, ' ').split(' ').filter(w => w.length > 2);
        if (!keywords.length) continue;
        const searchTerm = `%${keywords[keywords.length - 1]}%`;
        const { count } = await supabase
          .from('parts')
          .select('*', { count: 'exact', head: true })
          .or(`chave_de_busca.ilike.${searchTerm},marca_veiculo.ilike.${searchTerm}`);
        counts[model] = count || 0;
      }
      setPartsMatches(counts);
    };
    matchModels();
  }, [rankings]);

  const filteredRankings = useMemo(() => {
    let filtered = rankings;
    if (selectedYear) filtered = filtered.filter(r => r.year === Number(selectedYear));
    if (selectedType) filtered = filtered.filter(r => r.vehicle_type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.model.toLowerCase().includes(q));
    }
    return filtered;
  }, [rankings, selectedYear, selectedType, searchQuery]);

  const top10 = useMemo(() => filteredRankings.slice(0, 10), [filteredRankings]);
  const totalEmplacamentos = useMemo(() => filteredRankings.reduce((s, r) => s + r.quantity, 0), [filteredRankings]);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV vazio'); setImporting(false); return; }

      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('posicao') || header.includes('modelo') || header.includes('position');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      // Prompt for year
      const yearInput = prompt('Qual o ANO deste ranking? (ex: 2009)');
      if (!yearInput || isNaN(Number(yearInput))) { toast.error('Ano inválido'); setImporting(false); return; }
      const year = Number(yearInput);

      // Prompt for type
      const typeInput = prompt('Tipo: 1 = Automóvel, 2 = Comercial Leve');
      const vehicleType = typeInput === '2' ? 'comercial_leve' : 'automovel';

      // Delete existing data for this year+type
      await supabase.from('fleet_rankings').delete().eq('year', year).eq('vehicle_type', vehicleType);

      const rows: { year: number; position: number; model: string; quantity: number; vehicle_type: string }[] = [];
      for (let i = 0; i < dataLines.length; i++) {
        const parts = dataLines[i].split(/[,;\t]/).map(s => s.trim().replace(/"/g, ''));
        if (parts.length < 3) continue;
        // Try: position, model, quantity
        const pos = parseInt(parts[0].replace(/[°ºª]/g, ''));
        const model = parts[1];
        const qty = parseInt(parts[2].replace(/\./g, '').replace(/,/g, ''));
        if (isNaN(pos) || !model || isNaN(qty)) continue;
        rows.push({ year, position: pos, model: model.toUpperCase(), quantity: qty, vehicle_type: vehicleType });
      }

      if (!rows.length) { toast.error('Nenhum dado válido encontrado. Formato: posição, modelo, quantidade'); setImporting(false); return; }

      const { error } = await supabase.from('fleet_rankings').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} registros importados para ${year} (${vehicleType === 'automovel' ? 'Automóveis' : 'Comerciais Leves'})`);
      fetchRankings();
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Excluir todos os dados de ${year}?`)) return;
    await supabase.from('fleet_rankings').delete().eq('year', year);
    toast.success(`Dados de ${year} excluídos`);
    fetchRankings();
  };

  const handleDownloadTemplate = () => {
    const bom = '\uFEFF';
    const csv = bom + 'posicao;modelo;quantidade\n1;VW/GOL;303014\n2;FIAT/UNO;250000\n3;GM/CELTA;180000\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_ranking_frota.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo CSV baixado!');
  };

  const handleExportData = () => {
    if (!filteredRankings.length) { toast.error('Nenhum dado para exportar'); return; }
    const bom = '\uFEFF';
    const header = 'posicao;modelo;quantidade;tipo;ano\n';
    const rows = filteredRankings.map(r => `${r.position};${r.model};${r.quantity};${r.vehicle_type};${r.year}`).join('\n');
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranking_frota_${selectedYear || 'todos'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados!');
  };

  const demandSuggestions = useMemo(() => {
    return top10.map(r => {
      const partsCount = partsMatches[r.model] || 0;
      const sharePercent = totalEmplacamentos > 0 ? ((r.quantity / totalEmplacamentos) * 100).toFixed(1) : '0';
      let priority: 'alta' | 'media' | 'baixa' = 'baixa';
      if (r.position <= 5) priority = 'alta';
      else if (r.position <= 15) priority = 'media';
      return { ...r, partsCount, sharePercent, priority };
    });
  }, [top10, partsMatches, totalEmplacamentos]);


  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Ranking Frota / Emplacamentos
          </h2>
          <p className="text-sm text-muted-foreground">Análise de frota circulante para previsão de demanda de peças</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportData}>
          <Download className="w-4 h-4 mr-1" /> Exportar Dados
        </Button>
      </div>

{!readOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 font-semibold text-primary hover:bg-primary/10">
                <Settings className="w-4 h-4" />
                ⚙️ Gerenciar Dados (Admin)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Formato CSV:</strong> posição, modelo, quantidade (ex: <code>1,VW/GOL,303014</code>). 
                  Separe automóveis e comerciais leves em importações distintas. Ao importar, informe o ano e o tipo do ranking.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
                  <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                    <FileSpreadsheet className="w-4 h-4 mr-1" /> Modelo CSV
                  </Button>
                  <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    Importar CSV
                  </Button>
                  {selectedYear && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteYear(Number(selectedYear))}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir {selectedYear}
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="automovel">Automóveis</SelectItem>
            <SelectItem value="comercial_leve">Comerciais Leves</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar modelo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
        </div>
      </div>

      {filteredRankings.length === 0 ? (
        <Card className="p-8 text-center">
          <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum ranking importado ainda. Importe um CSV com dados FENABRAVE.</p>
        </Card>
      ) : (
        <Tabs defaultValue="demanda">
          <TabsList>
            <TabsTrigger value="demanda">📊 Demanda de Peças</TabsTrigger>
            <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
            <TabsTrigger value="grafico">📈 Gráfico</TabsTrigger>
          </TabsList>

          <TabsContent value="demanda" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Expectativa de Alta Demanda — Top 10 ({selectedYear})
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Veículos com maior frota circulante geram maior demanda por peças de reposição. 
                Priorize estoque para os modelos mais emplacados.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Emplacamentos</TableHead>
                    <TableHead className="text-right">% Mercado</TableHead>
                    <TableHead className="text-right">Peças no Catálogo</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandSuggestions.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.position}°</TableCell>
                      <TableCell className="font-medium">{r.model}</TableCell>
                      <TableCell className="text-right font-mono">{r.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono">{r.sharePercent}%</TableCell>
                      <TableCell className="text-right">
                        {r.partsCount > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Package className="w-3 h-3" /> {r.partsCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-destructive">
                            <AlertTriangle className="w-3 h-3" /> 0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.priority === 'alta' ? 'default' : r.priority === 'media' ? 'secondary' : 'outline'}
                          className={r.priority === 'alta' ? 'bg-red-500 text-white' : ''}>
                          {r.priority === 'alta' ? '🔴 Alta' : r.priority === 'media' ? '🟡 Média' : '🟢 Baixa'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Total Emplacamentos</p>
                <p className="text-2xl font-bold">{totalEmplacamentos.toLocaleString('pt-BR')}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Modelos no Ranking</p>
                <p className="text-2xl font-bold">{filteredRankings.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Top 10 = % do Mercado</p>
                <p className="text-2xl font-bold">
                  {totalEmplacamentos > 0
                    ? ((top10.reduce((s, r) => s + r.quantity, 0) / totalEmplacamentos) * 100).toFixed(1)
                    : 0}%
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranking">
            <Card className="p-4 max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Emplacamentos</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRankings.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.position}°</TableCell>
                      <TableCell className="font-medium">{r.model}</TableCell>
                      <TableCell className="text-right font-mono">{r.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.vehicle_type === 'automovel' ? '🚗' : '🚐'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="grafico">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Top 10 — Emplacamentos ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={top10} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                  <YAxis type="category" dataKey="model" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
