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
  selectedYear?: string;
  selectedType?: string;
  onSelectedYearChange?: (value: string) => void;
  onSelectedTypeChange?: (value: string) => void;
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

export function RegionalAnalysisTab({
  readOnly = false,
  selectedYear: externalSelectedYear,
  selectedType: externalSelectedType,
  onSelectedYearChange,
  onSelectedTypeChange,
}: RegionalAnalysisTabProps) {
  const [data, setData] = useState<RegionalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [localSelectedYear, setLocalSelectedYear] = useState<string>('');
  const [localSelectedType, setLocalSelectedType] = useState<string>('automovel');
  const fileRef = useRef<HTMLInputElement>(null);

  const activeSelectedYear = externalSelectedYear ?? localSelectedYear;
  const activeSelectedType = externalSelectedType ?? localSelectedType;
  const isUsingSharedFilters = externalSelectedYear !== undefined || externalSelectedType !== undefined;

  const handleYearChange = useCallback((value: string) => {
    if (onSelectedYearChange) {
      onSelectedYearChange(value);
      return;
    }

    setLocalSelectedYear(value);
  }, [onSelectedYearChange]);

  const handleTypeChange = useCallback((value: string) => {
    if (onSelectedTypeChange) {
      onSelectedTypeChange(value);
      return;
    }

    setLocalSelectedType(value);
  }, [onSelectedTypeChange]);

  const fetchData = useCallback(async (preferredYear?: number) => {
    setLoading(true);

    // Paginate to fetch ALL records (Supabase default limit = 1000)
    const PAGE_SIZE = 1000;
    let allRows: RegionalData[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, error } = await supabase
        .from('fleet_regional_data')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: true })
        .order('region', { ascending: true })
        .range(from, to);

      if (error) {
        toast.error('Erro ao carregar dados regionais');
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        hasMore = false;
      } else {
        allRows = allRows.concat(rows as RegionalData[]);
        if (rows.length < PAGE_SIZE) hasMore = false;
        else page++;
      }
    }

    const uniqueYears = [...new Set(allRows.map(r => r.year))].sort((a, b) => b - a);

    setData(allRows);
    setYears(uniqueYears);
    setLocalSelectedYear(prev => {
      if (preferredYear && uniqueYears.includes(preferredYear)) return String(preferredYear);
      if (prev && uniqueYears.includes(Number(prev))) return prev;
      return uniqueYears.length > 0 ? String(uniqueYears[0]) : '';
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter data by year and type — pure DB, no seed fallback
  const filteredData = useMemo(() => {
    let filtered = data;
    if (activeSelectedYear) filtered = filtered.filter(r => r.year === Number(activeSelectedYear));
    if (activeSelectedType) filtered = filtered.filter(r => r.vehicle_type === activeSelectedType);
    return filtered;
  }, [data, activeSelectedYear, activeSelectedType]);

  // Monthly stacked chart data — use quantities when available for visual differentiation
  const monthlyChartData = useMemo(() => {
    const hasMonthly = filteredData.some(r => r.month !== null);
    if (!hasMonthly) return [];
    const hasQuantities = filteredData.some(r => r.month !== null && r.quantity > 0);
    return MONTHS.map((label, idx) => {
      const monthNum = idx + 1;
      const monthRows = filteredData.filter(r => r.month === monthNum);
      const row: Record<string, any> = { month: label };
      REGIONS.forEach(region => {
        const match = monthRows.find(r => r.region === region);
        row[region] = match ? (hasQuantities ? match.quantity : match.percentage) : 0;
      });
      return row;
    }).filter(r => REGIONS.some(reg => r[reg] > 0));
  }, [filteredData]);

  const monthlyChartUsesQuantity = useMemo(() => {
    return filteredData.some(r => r.month !== null && r.quantity > 0);
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

  // Multi-year evolution chart — use quantities when available for visual differentiation
  const multiYearData = useMemo(() => {
    if (!activeSelectedType) return [];

    const selectedYearNumber = Number(activeSelectedYear);
    const typeData = data.filter(r => {
      if (r.vehicle_type !== activeSelectedType) return false;
      if (!selectedYearNumber) return true;
      return r.year <= selectedYearNumber;
    });
    const allYears = [...new Set(typeData.map(r => r.year))].sort((a, b) => a - b);
    const hasQty = typeData.some(r => r.quantity > 0);

    return allYears.map(year => {
      const yearData = typeData.filter(r => r.year === year);
      const row: Record<string, any> = { year };
      REGIONS.forEach(region => {
        const regionRows = yearData.filter(r => r.region === region);
        if (regionRows.length > 0) {
          if (hasQty) {
            row[region] = regionRows.reduce((s, r) => s + r.quantity, 0);
          } else {
            const avg = regionRows.reduce((s, r) => s + r.percentage, 0) / regionRows.length;
            row[region] = Number(avg.toFixed(2));
          }
        } else {
          row[region] = 0;
        }
      });
      return row;
    });
  }, [data, activeSelectedType, activeSelectedYear]);

  const evolutionUsesQuantity = useMemo(() => {
    if (!activeSelectedType) return false;
    return data.some(r => r.vehicle_type === activeSelectedType && r.quantity > 0);
  }, [data, activeSelectedType]);

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

        if (parts.length >= 13) {
          for (let m = 0; m < 12; m++) {
            const pct = parseFloat(parts[m + 1]?.replace(',', '.') || '0');
            if (pct > 0) {
              rows.push({ year, month: m + 1, region: matchedRegion, vehicle_type: vehicleType, quantity: 0, percentage: pct });
            }
          }
        } else {
          const qty = parseInt(parts[1]?.replace(/\./g, '').replace(/,/g, '') || '0');
          const pct = parseFloat(parts[2]?.replace(',', '.') || '0');
          rows.push({ year, month: null, region: matchedRegion, vehicle_type: vehicleType, quantity: qty, percentage: pct });
        }
      }

      if (!rows.length) { toast.error('Nenhum dado válido encontrado'); setImporting(false); return; }

      const { error } = await supabase.from('fleet_regional_data').insert(rows);
      if (error) throw error;
      setLocalSelectedType(vehicleType);
      toast.success(`${rows.length} registros importados para ${year} (${VEHICLE_TYPES.find(v => v.value === vehicleType)?.label})`);
      await fetchData(year);
      onSelectedTypeChange?.(vehicleType);
      onSelectedYearChange?.(String(year));
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
    await fetchData();
  };

  const handleDownloadTemplate = () => {
    const bom = '\uFEFF';
    const csv = bom +
      'regiao;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n' +
      'Norte;4.56;4.79;4.42;4.46;4.14;4.26;4.10;3.97;3.50;3.44;3.60;4.16\n' +
      'Nordeste;17.36;15.72;14.88;16.74;15.15;14.85;14.85;14.91;14.33;13.99;13.83;15.08\n' +
      'Centro-Oeste;9.14;10.22;9.26;8.88;8.70;8.35;8.59;8.74;8.40;8.55;8.01;8.66\n' +
      'Sudeste;49.04;51.76;52.11;52.65;53.92;54.17;54.33;54.94;56.10;56.71;57.59;52.40\n' +
      'Sul;18.94;17.52;19.34;17.28;17.89;18.36;18.04;17.43;17.66;17.32;16.97;18.79\n';
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
    exportToExcel(rows, `regional_${activeSelectedType}_${activeSelectedYear || 'todos'}`, 'Regional');
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
                  {activeSelectedYear && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteYear(Number(activeSelectedYear))}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir {activeSelectedYear}
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {!isUsingSharedFilters && (
        <div className="flex flex-wrap gap-2">
          <Select value={activeSelectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeSelectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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

          {/* Monthly stacked bar chart */}
          {monthlyChartData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {monthlyChartUsesQuantity
                  ? `Emplacamentos Mensais por Região — ${activeSelectedYear}`
                  : `Participação Mensal por Região — ${activeSelectedYear}`}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={v => monthlyChartUsesQuantity ? v.toLocaleString('pt-BR') : `${v}%`}
                    tick={{ fontSize: 11 }}
                    {...(!monthlyChartUsesQuantity ? { domain: [0, 100] } : {})}
                  />
                  <Tooltip formatter={(v: number) => monthlyChartUsesQuantity ? v.toLocaleString('pt-BR') : `${v.toFixed(2)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} stackId="a" fill={REGION_COLORS[region]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Region summary table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Resumo Regional — {activeSelectedYear}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Região</TableHead>
                  <TableHead className="text-right">Participação Média (%)</TableHead>
                  {totalQuantity > 0 && <TableHead className="text-right">Quantidade</TableHead>}
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
                    <TableCell className="text-right font-mono">{r.avgPercentage.toFixed(2)}%</TableCell>
                    {totalQuantity > 0 && (
                      <TableCell className="text-right font-mono">{r.quantity.toLocaleString('pt-BR')}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Multi-year evolution */}
          {multiYearData.length > 1 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Evolução Regional por Ano até {activeSelectedYear} ({VEHICLE_TYPES.find(v => v.value === activeSelectedType)?.label})
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={multiYearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    interval={0}
                    tick={{ fontSize: 11 }}
                    angle={multiYearData.length > 10 ? -35 : 0}
                    textAnchor={multiYearData.length > 10 ? 'end' : 'middle'}
                    height={multiYearData.length > 10 ? 50 : 30}
                  />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} stackId="a" fill={REGION_COLORS[region]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
