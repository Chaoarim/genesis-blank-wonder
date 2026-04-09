import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Upload, Loader2, Trash2, MapPin, TrendingUp, FileSpreadsheet, Settings, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportExcel';

interface RegionalData {
  id: string;
  year: number;
  month: number | null;
  region: string;
  vehicle_type: string;
  quantity: number;
  percentage: number;
}

interface RegionalAnalysisTabProps {
  readOnly?: boolean;
}

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const REGION_COLORS: Record<string, string> = {
  'Norte': '#10b981',
  'Nordeste': '#f59e0b',
  'Centro-Oeste': '#3b82f6',
  'Sudeste': '#ef4444',
  'Sul': '#8b5cf6',
};

export function RegionalAnalysisTab({ readOnly = false }: RegionalAnalysisTabProps) {
  const [data, setData] = useState<RegionalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('automovel');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('fleet_regional_data')
      .select('*')
      .order('year', { ascending: false })
      .order('region', { ascending: true });
    if (error) { toast.error('Erro ao carregar dados regionais'); setLoading(false); return; }
    const items = (rows || []) as RegionalData[];
    setData(items);
    const uniqueYears = [...new Set(items.map(r => r.year))].sort((a, b) => b - a);
    setYears(uniqueYears);
    if (!selectedYear && uniqueYears.length > 0) setSelectedYear(String(uniqueYears[0]));
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, []);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedYear) filtered = filtered.filter(r => r.year === Number(selectedYear));
    if (selectedType) filtered = filtered.filter(r => r.vehicle_type === selectedType);
    return filtered;
  }, [data, selectedYear, selectedType]);

  // Aggregate by region
  const regionSummary = useMemo(() => {
    const map: Record<string, { quantity: number; percentage: number }> = {};
    filteredData.forEach(r => {
      if (!map[r.region]) map[r.region] = { quantity: 0, percentage: 0 };
      map[r.region].quantity += r.quantity;
      map[r.region].percentage += r.percentage;
    });
    const hasAnyQuantity = Object.values(map).some(v => v.quantity > 0);
    return REGIONS.map(region => ({
      region,
      quantity: map[region]?.quantity || 0,
      percentage: map[region]?.percentage || 0,
      displayValue: hasAnyQuantity ? (map[region]?.quantity || 0) : (map[region]?.percentage || 0),
    })).filter(r => r.quantity > 0 || r.percentage > 0);
  }, [filteredData]);

  const usePercentageAsValue = useMemo(() => regionSummary.every(r => r.quantity === 0), [regionSummary]);

  const totalQuantity = useMemo(() => regionSummary.reduce((s, r) => s + r.quantity, 0), [regionSummary]);

  const pieData = useMemo(() => regionSummary.map(r => ({
    name: r.region,
    value: r.percentage > 0 ? r.percentage : (totalQuantity > 0 ? (r.quantity / totalQuantity) * 100 : 0),
    quantity: r.quantity,
    fill: REGION_COLORS[r.region] || '#94a3b8',
  })), [regionSummary, totalQuantity]);

  // Multi-year comparison
  const multiYearData = useMemo(() => {
    if (!selectedType) return [];
    const allYears = [...new Set(data.filter(r => r.vehicle_type === selectedType).map(r => r.year))].sort();
    return allYears.map(year => {
      const yearData = data.filter(r => r.year === year && r.vehicle_type === selectedType);
      const row: Record<string, any> = { year };
      yearData.forEach(r => { row[r.region] = r.percentage || r.quantity; });
      return row;
    });
  }, [data, selectedType]);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV vazio'); setImporting(false); return; }

      const yearInput = prompt('Qual o ANO dos dados regionais? (ex: 2016)');
      if (!yearInput || isNaN(Number(yearInput))) { toast.error('Ano inválido'); setImporting(false); return; }
      const year = Number(yearInput);

      const typeInput = prompt('Tipo: 1 = Automóvel, 2 = Comercial Leve');
      const vehicleType = typeInput === '2' ? 'comercial_leve' : 'automovel';

      await supabase.from('fleet_regional_data').delete().eq('year', year).eq('vehicle_type', vehicleType);

      const hasHeader = lines[0].toLowerCase().includes('regiao') || lines[0].toLowerCase().includes('region');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const rows: { year: number; region: string; vehicle_type: string; quantity: number; percentage: number }[] = [];
      for (const line of dataLines) {
        const parts = line.split(/[,;\t]/).map(s => s.trim().replace(/"/g, ''));
        if (parts.length < 2) continue;
        const region = parts[0];
        if (!REGIONS.some(r => r.toLowerCase() === region.toLowerCase())) continue;
        const qty = parseInt(parts[1]?.replace(/\./g, '').replace(/,/g, '') || '0');
        const pct = parseFloat(parts[2]?.replace(',', '.') || '0');
        const matchedRegion = REGIONS.find(r => r.toLowerCase() === region.toLowerCase()) || region;
        rows.push({ year, region: matchedRegion, vehicle_type: vehicleType, quantity: qty, percentage: pct });
      }

      if (!rows.length) { toast.error('Nenhum dado válido. Formato: região;quantidade;percentual'); setImporting(false); return; }

      const { error } = await supabase.from('fleet_regional_data').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} regiões importadas para ${year}`);
      fetchData();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Excluir dados regionais de ${year}?`)) return;
    await supabase.from('fleet_regional_data').delete().eq('year', year);
    toast.success(`Dados regionais de ${year} excluídos`);
    fetchData();
  };

  const handleDownloadTemplate = () => {
    const bom = '\uFEFF';
    const csv = bom + 'regiao;quantidade;percentual\nNorte;50000;5.2\nNordeste;150000;15.8\nCentro-Oeste;80000;8.4\nSudeste;500000;52.6\nSul;170000;18.0\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_regional.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo CSV baixado!');
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const rows = filteredData.map(r => ({
      'Região': r.region,
      'Ano': r.year,
      'Tipo': r.vehicle_type === 'automovel' ? 'Automóvel' : 'Comercial Leve',
      'Quantidade': r.quantity,
      'Participação (%)': r.percentage,
    }));
    exportToExcel(rows, `dados_regionais_${selectedYear || 'todos'}`, 'Regional');
    toast.success('Excel exportado!');
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 font-semibold text-primary hover:bg-primary/10">
                <Settings className="w-4 h-4" />
                ⚙️ Importar Dados Regionais
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Formato CSV:</strong> região;quantidade;percentual (ex: <code>Sudeste;500000;52.6</code>)
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
                   <Button size="sm" variant="outline" onClick={handleExportExcel}>
                     <Download className="w-4 h-4 mr-1" /> Exportar Excel
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
      </div>

      {regionSummary.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum dado regional importado. Importe um CSV com dados por região.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {regionSummary.map(r => (
              <Card key={r.region} className="p-3 text-center" style={{ borderLeftColor: REGION_COLORS[r.region], borderLeftWidth: 4 }}>
                <p className="text-xs text-muted-foreground font-medium">{r.region}</p>
                <p className="text-lg font-bold">{r.quantity > 0 ? r.quantity.toLocaleString('pt-BR') : `${r.percentage.toFixed(1)}%`}</p>
                {r.quantity > 0 && totalQuantity > 0 && (
                  <p className="text-xs text-muted-foreground">{((r.quantity / totalQuantity) * 100).toFixed(1)}%</p>
                )}
              </Card>
            ))}
          </div>

          {/* Pie + Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Participação por Região
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}%`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> {usePercentageAsValue ? 'Participação (%) por Região' : 'Volume por Região'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => usePercentageAsValue ? `${v}%` : (v > 1000 ? (v / 1000).toFixed(0) + 'k' : String(v))} />
                  <Tooltip formatter={(v: number) => usePercentageAsValue ? `${v.toFixed(1)}%` : v.toLocaleString('pt-BR')} />
                  <Bar dataKey="displayValue" radius={[4, 4, 0, 0]}>
                    {regionSummary.map((entry, i) => (
                      <Cell key={i} fill={REGION_COLORS[entry.region] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Multi-year comparison */}
          {multiYearData.length > 1 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">📈 Evolução Regional por Ano</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={multiYearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} fill={REGION_COLORS[region]} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Data table */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Dados Regionais — {selectedYear}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Região</TableHead>
                  {!usePercentageAsValue && <TableHead className="text-right">Quantidade</TableHead>}
                  <TableHead className="text-right">Participação (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionSummary.map(r => (
                  <TableRow key={r.region}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REGION_COLORS[r.region] }} />
                        <span className="font-medium">{r.region}</span>
                      </div>
                    </TableCell>
                    {!usePercentageAsValue && <TableCell className="text-right font-mono">{r.quantity.toLocaleString('pt-BR')}</TableCell>}
                    <TableCell className="text-right font-mono">
                      {r.percentage > 0 ? r.percentage.toFixed(1) : (totalQuantity > 0 ? ((r.quantity / totalQuantity) * 100).toFixed(1) : '0')}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  {!usePercentageAsValue && <TableCell className="text-right font-mono">{totalQuantity.toLocaleString('pt-BR')}</TableCell>}
                  <TableCell className="text-right font-mono">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          {/* Insights */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              💡 Insights Regionais
            </h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {regionSummary.length > 0 && (() => {
                const sorted = [...regionSummary].sort((a, b) => (b.displayValue) - (a.displayValue));
                const top = sorted[0];
                const bottom = sorted[sorted.length - 1];
                return (
                  <>
                    <li>🏆 <strong>{top.region}</strong> lidera com {top.quantity > 0 ? top.quantity.toLocaleString('pt-BR') + ' emplacamentos' : top.percentage.toFixed(1) + '% de participação'}</li>
                    <li>📉 <strong>{bottom.region}</strong> tem menor participação — possível oportunidade de expansão</li>
                    <li>🎯 Concentre estoque nos modelos mais emplacados da região <strong>{top.region}</strong></li>
                    <li>🚀 Explore parcerias na região <strong>{bottom.region}</strong> para diversificar vendas</li>
                  </>
                );
              })()}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
