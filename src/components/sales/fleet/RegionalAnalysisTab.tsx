import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Upload, Loader2, Trash2, MapPin, FileSpreadsheet, Settings, Download } from 'lucide-react';
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
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const VEHICLE_TYPES = [
  { value: 'automovel', label: 'Automóveis' },
  { value: 'comercial_leve', label: 'Comerciais Leves' },
  { value: 'automovel_comercial_leve', label: 'Automóveis + Comerciais Leves' },
];

const REGION_COLORS: Record<string, string> = {
  'Norte': '#10b981',
  'Nordeste': '#f59e0b',
  'Centro-Oeste': '#3b82f6',
  'Sudeste': '#8b5cf6',
  'Sul': '#ef4444',
};

// FENABRAVE 2016 seed data
const FENABRAVE_2016_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.56, 4.79, 4.42, 4.46, 4.14, 4.26, 4.10, 3.97, 3.50, 3.44, 3.60, 4.16],
    'Nordeste':     [17.36, 15.72, 14.88, 16.74, 15.35, 14.85, 14.74, 14.91, 14.33, 13.99, 13.83, 15.98],
    'Centro-Oeste': [10.10, 10.22, 9.26, 8.88, 8.70, 8.35, 8.59, 8.74, 8.40, 8.55, 8.01, 8.66],
    'Sudeste':      [49.04, 51.76, 52.11, 52.65, 53.92, 54.17, 54.53, 54.94, 56.10, 56.71, 57.59, 52.40],
    'Sul':          [18.94, 17.52, 19.34, 17.28, 17.89, 18.36, 18.04, 17.43, 17.66, 17.32, 16.97, 18.79],
  },
  comercial_leve: {
    'Norte':        [7.53, 8.43, 7.97, 7.32, 7.85, 7.79, 7.59, 7.34, 8.05, 7.79, 8.17, 8.37],
    'Nordeste':     [20.34, 17.97, 16.60, 16.88, 16.17, 16.06, 15.27, 17.36, 15.77, 15.91, 15.60, 17.32],
    'Centro-Oeste': [12.00, 12.34, 13.46, 12.78, 12.52, 12.22, 11.08, 13.52, 12.28, 11.05, 11.53, 12.64],
    'Sudeste':      [39.42, 41.05, 41.47, 40.42, 42.53, 43.35, 43.99, 41.72, 43.15, 44.74, 45.08, 40.43],
    'Sul':          [20.90, 20.21, 20.50, 22.60, 20.92, 20.58, 20.07, 19.56, 20.76, 20.50, 19.62, 21.23],
  },
  automovel_comercial_leve: {
    'Norte':        [4.93, 5.28, 4.94, 4.92, 4.71, 4.81, 4.66, 4.60, 4.21, 4.07, 4.26, 4.78],
    'Nordeste':     [17.71, 16.02, 15.14, 16.76, 15.47, 15.05, 14.83, 15.31, 14.35, 14.27, 14.09, 16.18],
    'Centro-Oeste': [10.31, 10.51, 9.88, 9.51, 9.28, 8.98, 9.12, 9.52, 9.00, 8.91, 8.51, 9.24],
    'Sudeste':      [47.85, 50.30, 50.54, 50.67, 52.18, 52.43, 52.83, 52.77, 54.10, 54.97, 55.80, 50.66],
    'Sul':          [19.19, 17.89, 19.51, 18.14, 18.35, 18.71, 18.37, 17.79, 18.14, 17.78, 17.35, 19.15],
  },
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
      .order('month', { ascending: true })
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

  // Monthly stacked chart data (like FENABRAVE)
  const monthlyChartData = useMemo(() => {
    const hasMonthly = filteredData.some(r => r.month !== null);
    if (!hasMonthly) return [];
    return MONTHS.map((label, idx) => {
      const monthNum = idx + 1;
      const monthRows = filteredData.filter(r => r.month === monthNum);
      const row: Record<string, any> = { month: label };
      REGIONS.forEach(region => {
        const match = monthRows.find(r => r.region === region);
        row[region] = match ? match.percentage : 0;
      });
      return row;
    }).filter(r => REGIONS.some(reg => r[reg] > 0));
  }, [filteredData]);

  // Annual summary (aggregate)
  const regionSummary = useMemo(() => {
    const map: Record<string, { quantity: number; percentage: number; count: number }> = {};
    filteredData.forEach(r => {
      if (!map[r.region]) map[r.region] = { quantity: 0, percentage: 0, count: 0 };
      map[r.region].quantity += r.quantity;
      map[r.region].percentage += r.percentage;
      map[r.region].count += 1;
    });
    return REGIONS.map(region => {
      const d = map[region];
      if (!d) return { region, quantity: 0, avgPercentage: 0 };
      return {
        region,
        quantity: d.quantity,
        avgPercentage: d.count > 0 ? d.percentage / d.count : 0,
      };
    }).filter(r => r.quantity > 0 || r.avgPercentage > 0);
  }, [filteredData]);

  const totalQuantity = useMemo(() => regionSummary.reduce((s, r) => s + r.quantity, 0), [regionSummary]);

  // Multi-year comparison
  const multiYearData = useMemo(() => {
    if (!selectedType) return [];
    const typeData = data.filter(r => r.vehicle_type === selectedType);
    const allYears = [...new Set(typeData.map(r => r.year))].sort();
    return allYears.map(year => {
      const yearData = typeData.filter(r => r.year === year);
      const row: Record<string, any> = { year };
      REGIONS.forEach(region => {
        const regionRows = yearData.filter(r => r.region === region);
        if (regionRows.length > 0) {
          const avg = regionRows.reduce((s, r) => s + r.percentage, 0) / regionRows.length;
          row[region] = Number(avg.toFixed(2));
        }
      });
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

      const yearInput = prompt('Qual o ANO dos dados? (ex: 2016)');
      if (!yearInput || isNaN(Number(yearInput))) { toast.error('Ano inválido'); setImporting(false); return; }
      const year = Number(yearInput);

      const typeInput = prompt('Tipo:\n1 = Automóveis\n2 = Comerciais Leves\n3 = Automóveis + Comerciais Leves');
      let vehicleType = 'automovel';
      if (typeInput === '2') vehicleType = 'comercial_leve';
      else if (typeInput === '3') vehicleType = 'automovel_comercial_leve';

      await supabase.from('fleet_regional_data').delete().eq('year', year).eq('vehicle_type', vehicleType);

      const hasHeader = lines[0].toLowerCase().includes('regiao') || lines[0].toLowerCase().includes('region');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const rows: { year: number; month: number | null; region: string; vehicle_type: string; quantity: number; percentage: number }[] = [];

      for (const line of dataLines) {
        const parts = line.split(/[,;\t]/).map(s => s.trim().replace(/"/g, ''));
        if (parts.length < 2) continue;
        const region = parts[0];
        if (!REGIONS.some(r => r.toLowerCase() === region.toLowerCase())) continue;
        const matchedRegion = REGIONS.find(r => r.toLowerCase() === region.toLowerCase()) || region;

        // Check if we have monthly data (13+ columns: region + 12 months)
        if (parts.length >= 13) {
          // Monthly percentages: region;jan;fev;mar;abr;mai;jun;jul;ago;set;out;nov;dez
          for (let m = 0; m < 12; m++) {
            const pct = parseFloat(parts[m + 1]?.replace(',', '.') || '0');
            if (pct > 0) {
              rows.push({ year, month: m + 1, region: matchedRegion, vehicle_type: vehicleType, quantity: 0, percentage: pct });
            }
          }
        } else {
          // Annual: region;quantidade;percentual
          const qty = parseInt(parts[1]?.replace(/\./g, '').replace(/,/g, '') || '0');
          const pct = parseFloat(parts[2]?.replace(',', '.') || '0');
          rows.push({ year, month: null, region: matchedRegion, vehicle_type: vehicleType, quantity: qty, percentage: pct });
        }
      }

      if (!rows.length) { toast.error('Nenhum dado válido encontrado'); setImporting(false); return; }

      const { error } = await supabase.from('fleet_regional_data').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} registros importados para ${year} (${VEHICLE_TYPES.find(v => v.value === vehicleType)?.label})`);
      fetchData();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Excluir todos os dados regionais de ${year}?`)) return;
    await supabase.from('fleet_regional_data').delete().eq('year', year);
    toast.success(`Dados regionais de ${year} excluídos`);
    fetchData();
  };

  const handleDownloadTemplate = () => {
    const bom = '\uFEFF';
    const csv = bom +
      '# MODELO 1 - Dados MENSAIS por região (percentual por mês)\n' +
      '# Use este formato para dados como o relatório FENABRAVE\n' +
      'regiao;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n' +
      'Norte;4.56;4.79;4.42;4.46;4.14;4.26;4.10;3.97;3.50;3.44;3.60;4.16\n' +
      'Nordeste;17.36;15.72;14.88;16.74;15.15;14.85;14.85;14.91;14.33;13.99;13.83;15.08\n' +
      'Centro-Oeste;9.14;10.22;9.26;8.88;8.70;8.35;8.59;8.74;8.40;8.55;8.01;8.66\n' +
      'Sudeste;49.04;51.76;52.11;52.65;53.92;54.17;54.33;54.94;56.10;56.71;57.59;52.40\n' +
      'Sul;18.94;17.52;19.34;17.28;17.89;18.36;18.04;17.43;17.66;17.32;16.97;18.79\n' +
      '\n' +
      '# MODELO 2 - Dados ANUAIS por região (quantidade e percentual)\n' +
      '# regiao;quantidade;percentual\n' +
      '# Norte;50000;5.2\n' +
      '# Nordeste;150000;15.8\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_regional_fenabrave.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo CSV baixado!');
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const rows = filteredData.map(r => ({
      'Região': r.region,
      'Ano': r.year,
      'Mês': r.month ? MONTHS[r.month - 1] : 'Anual',
      'Tipo': VEHICLE_TYPES.find(v => v.value === r.vehicle_type)?.label || r.vehicle_type,
      'Quantidade': r.quantity,
      'Participação (%)': r.percentage,
    }));
    exportToExcel(rows, `regional_${selectedType}_${selectedYear || 'todos'}`, 'Regional');
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
                ⚙️ Importar Dados Regionais (FENABRAVE)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Formato CSV mensal:</strong> região;Jan;Fev;...;Dez (percentuais)<br />
                  <strong>Formato CSV anual:</strong> região;quantidade;percentual<br />
                  <strong>Tipos:</strong> Automóveis, Comerciais Leves, Automóveis + Comerciais Leves
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
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {regionSummary.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum dado regional para este filtro. Importe um CSV com dados FENABRAVE.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {regionSummary.map(r => (
              <Card key={r.region} className="p-3 text-center" style={{ borderLeftColor: REGION_COLORS[r.region], borderLeftWidth: 4 }}>
                <p className="text-xs text-muted-foreground font-medium">{r.region}</p>
                <p className="text-lg font-bold">
                  {r.avgPercentage > 0 ? `${r.avgPercentage.toFixed(1)}%` : r.quantity.toLocaleString('pt-BR')}
                </p>
                {r.quantity > 0 && totalQuantity > 0 && (
                  <p className="text-xs text-muted-foreground">{((r.quantity / totalQuantity) * 100).toFixed(1)}% do total</p>
                )}
              </Card>
            ))}
          </div>

          {/* Monthly stacked bar chart (FENABRAVE style) */}
          {monthlyChartData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Emplacamentos por Região — {VEHICLE_TYPES.find(v => v.value === selectedType)?.label} ({selectedYear})
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyChartData} stackOffset="expand" barCategoryGap="8%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${(value * 100).toFixed(2)}%`, name]}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} stackId="a" fill={REGION_COLORS[region]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Monthly data table */}
          {monthlyChartData.length > 0 && (
            <Card className="p-4 overflow-x-auto">
              <h3 className="font-semibold mb-3">📊 Participação Mensal (%) — {selectedYear}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Região</TableHead>
                    {MONTHS.map(m => <TableHead key={m} className="text-center text-xs px-1">{m}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REGIONS.map(region => {
                    const regionRows = filteredData.filter(r => r.region === region && r.month !== null);
                    if (regionRows.length === 0) return null;
                    return (
                      <TableRow key={region}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REGION_COLORS[region] }} />
                            <span className="font-medium text-sm">{region}</span>
                          </div>
                        </TableCell>
                        {MONTHS.map((_, idx) => {
                          const row = regionRows.find(r => r.month === idx + 1);
                          return (
                            <TableCell key={idx} className="text-center text-xs font-mono px-1">
                              {row ? row.percentage.toFixed(2) : '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Multi-year comparison */}
          {multiYearData.length > 1 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">📈 Evolução Regional por Ano — {VEHICLE_TYPES.find(v => v.value === selectedType)?.label}</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={multiYearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} fill={REGION_COLORS[region]} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Insights */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2">💡 Insights Regionais</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {(() => {
                const sorted = [...regionSummary].sort((a, b) => b.avgPercentage - a.avgPercentage);
                const top = sorted[0];
                const bottom = sorted[sorted.length - 1];
                return (
                  <>
                    <li>🏆 <strong>{top.region}</strong> lidera com média de {top.avgPercentage.toFixed(1)}% de participação</li>
                    <li>📉 <strong>{bottom.region}</strong> tem menor participação — oportunidade de expansão</li>
                    <li>🎯 Concentre estoque nos modelos mais emplacados na região <strong>{top.region}</strong></li>
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
