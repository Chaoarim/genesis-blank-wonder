import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Upload, ArrowRight, CheckCircle, AlertTriangle, Search, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ImportedRow {
  codigo: string;
  descricao: string;
  preco: number;
  fornecedor?: string;
}

interface MatchResult {
  imported: ImportedRow;
  inventoryId: string | null;
  inventoryProduto: string | null;
  precoAtual: number | null;
  precoNovo: number;
  diff: number | null;
}

export function DistributorPriceImporter({ adminUserId }: { adminUserId?: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column mapping
  const [colCodigo, setColCodigo] = useState('');
  const [colDescricao, setColDescricao] = useState('');
  const [colPreco, setColPreco] = useState('');
  const [colFornecedor, setColFornecedor] = useState('');

  // Results
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [processing, setProcessing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'matched' | 'changed' | 'unmatched'>('all');
  const [distributorName, setDistributorName] = useState('');

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          toast.error('Planilha vazia ou sem dados');
          return;
        }

        const hdrs = (data[0] || []).map((h: any) => String(h || '').trim());
        setHeaders(hdrs);
        setRawData(data.slice(1));

        // Auto-detect columns
        const lower = hdrs.map(h => h.toLowerCase());
        const codigoIdx = lower.findIndex(h => h.includes('codigo') || h.includes('código') || h.includes('cod') || h === 'ref');
        const descIdx = lower.findIndex(h => h.includes('descri') || h.includes('produto') || h.includes('nome'));
        const precoIdx = lower.findIndex(h => h.includes('preco') || h.includes('preço') || h.includes('valor') || h.includes('custo'));
        const fornIdx = lower.findIndex(h => h.includes('fornec') || h.includes('marca') || h.includes('fabric'));

        if (codigoIdx >= 0) setColCodigo(hdrs[codigoIdx]);
        if (descIdx >= 0) setColDescricao(hdrs[descIdx]);
        if (precoIdx >= 0) setColPreco(hdrs[precoIdx]);
        if (fornIdx >= 0) setColFornecedor(hdrs[fornIdx]);

        setStep('map');
        toast.success(`${data.length - 1} linhas carregadas`);
      } catch {
        toast.error('Erro ao ler o arquivo');
      }
    };
    reader.readAsBinaryString(f);
  }, []);

  const parseRows = useCallback((): ImportedRow[] => {
    const ciIdx = headers.indexOf(colCodigo);
    const diIdx = headers.indexOf(colDescricao);
    const piIdx = headers.indexOf(colPreco);
    const fiIdx = colFornecedor ? headers.indexOf(colFornecedor) : -1;

    if (ciIdx < 0 || piIdx < 0) return [];

    return rawData
      .map(row => {
        const codigo = String(row[ciIdx] || '').trim().toUpperCase();
        const descricao = diIdx >= 0 ? String(row[diIdx] || '').trim() : '';
        const rawPreco = row[piIdx];
        const preco = typeof rawPreco === 'number' ? rawPreco : parseFloat(String(rawPreco || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
        const fornecedor = fiIdx >= 0 ? String(row[fiIdx] || '').trim() : distributorName;

        if (!codigo || isNaN(preco) || preco <= 0) return null;
        return { codigo, descricao, preco, fornecedor };
      })
      .filter(Boolean) as ImportedRow[];
  }, [rawData, headers, colCodigo, colDescricao, colPreco, colFornecedor, distributorName]);

  const processMatching = useCallback(async () => {
    if (!colCodigo || !colPreco) {
      toast.error('Selecione pelo menos as colunas de Código e Preço');
      return;
    }

    setProcessing(true);
    const rows = parseRows();

    if (rows.length === 0) {
      toast.error('Nenhuma linha válida encontrada');
      setProcessing(false);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const uid = adminUserId || user?.id;
    if (!uid) {
      toast.error('Usuário não autenticado');
      setProcessing(false);
      return;
    }

    // Fetch all inventory codes in batches
    let allInventory: { id: string; codigo: string; produto: string; preco: number }[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from('inventory_items')
        .select('id, codigo, produto, preco')
        .eq('user_id', uid)
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      allInventory = allInventory.concat(data as any);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    // Build code map (uppercase)
    const codeMap = new Map<string, { id: string; produto: string; preco: number }>();
    allInventory.forEach(inv => {
      codeMap.set(inv.codigo.toUpperCase(), { id: inv.id, produto: inv.produto, preco: Number(inv.preco) || 0 });
    });

    // Match
    const results: MatchResult[] = rows.map(row => {
      const match = codeMap.get(row.codigo);
      if (match) {
        const diff = row.preco - match.preco;
        return {
          imported: row,
          inventoryId: match.id,
          inventoryProduto: match.produto,
          precoAtual: match.preco,
          precoNovo: row.preco,
          diff,
        };
      }
      return {
        imported: row,
        inventoryId: null,
        inventoryProduto: null,
        precoAtual: null,
        precoNovo: row.preco,
        diff: null,
      };
    });

    setMatches(results);
    setStep('preview');
    setProcessing(false);

    const matched = results.filter(r => r.inventoryId).length;
    const changed = results.filter(r => r.inventoryId && r.diff !== 0).length;
    toast.success(`${matched} de ${results.length} códigos encontrados no estoque. ${changed} com preço diferente.`);
  }, [colCodigo, colPreco, parseRows, adminUserId]);

  const filteredMatches = useMemo(() => {
    let list = matches;
    if (filterType === 'matched') list = list.filter(r => r.inventoryId);
    else if (filterType === 'changed') list = list.filter(r => r.inventoryId && r.diff !== 0);
    else if (filterType === 'unmatched') list = list.filter(r => !r.inventoryId);

    if (search.trim()) {
      const s = search.toUpperCase();
      list = list.filter(r => r.imported.codigo.includes(s) || (r.imported.descricao || '').toUpperCase().includes(s) || (r.inventoryProduto || '').toUpperCase().includes(s));
    }
    return list;
  }, [matches, filterType, search]);

  const stats = useMemo(() => {
    const total = matches.length;
    const matched = matches.filter(r => r.inventoryId).length;
    const changed = matches.filter(r => r.inventoryId && r.diff !== 0).length;
    const unmatched = total - matched;
    return { total, matched, changed, unmatched };
  }, [matches]);

  const applyPriceUpdates = useCallback(async () => {
    const toUpdate = matches.filter(r => r.inventoryId && r.diff !== 0);
    if (toUpdate.length === 0) {
      toast.info('Nenhum preço para atualizar');
      return;
    }

    if (!confirm(`Atualizar preço de custo de ${toUpdate.length} itens no estoque?`)) return;

    setUpdating(true);
    let success = 0;
    let errors = 0;

    // Update in batches of 50
    for (let i = 0; i < toUpdate.length; i += 50) {
      const batch = toUpdate.slice(i, i + 50);
      const promises = batch.map(item =>
        supabase
          .from('inventory_items')
          .update({ preco: item.precoNovo })
          .eq('id', item.inventoryId!)
      );
      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r.error) errors++;
        else success++;
      });
    }

    setUpdating(false);

    if (errors > 0) {
      toast.warning(`${success} atualizados, ${errors} erros`);
    } else {
      toast.success(`${success} preços atualizados com sucesso!`);
    }

    setStep('done');
  }, [matches]);

  const reset = () => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColCodigo('');
    setColDescricao('');
    setColPreco('');
    setColFornecedor('');
    setMatches([]);
    setStep('upload');
    setSearch('');
    setFilterType('all');
    setDistributorName('');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Tabela de Preços do Distribuidor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Faça upload da planilha de preços do distribuidor (Excel ou CSV). O sistema cruzará os códigos com seu estoque e atualizará os preços de custo automaticamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Nome do distribuidor (ex: DPK, SAMA)"
                  value={distributorName}
                  onChange={e => setDistributorName(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex-1">
                  <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {file ? file.name : 'Clique para selecionar arquivo (.xlsx, .xls, .csv)'}
                    </span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Mapeie as colunas da planilha:</p>
                <Badge variant="outline">{rawData.length} linhas</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-destructive">Código da peça *</label>
                  <Select value={colCodigo} onValueChange={setColCodigo}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Descrição</label>
                  <Select value={colDescricao} onValueChange={setColDescricao}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-destructive">Preço de custo *</label>
                  <Select value={colPreco} onValueChange={setColPreco}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Fornecedor/Marca</label>
                  <Select value={colFornecedor} onValueChange={setColFornecedor}>
                    <SelectTrigger><SelectValue placeholder="(usar nome acima)" /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview first 3 rows */}
              {rawData.length > 0 && colCodigo && colPreco && (
                <div className="border rounded-lg overflow-auto max-h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.slice(0, 3).map((row, i) => {
                        const ci = headers.indexOf(colCodigo);
                        const di = headers.indexOf(colDescricao);
                        const pi = headers.indexOf(colPreco);
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{row[ci]}</TableCell>
                            <TableCell className="text-xs">{di >= 0 ? row[di] : '-'}</TableCell>
                            <TableCell className="text-xs">{row[pi]}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Voltar</Button>
                <Button onClick={processMatching} disabled={processing || !colCodigo || !colPreco}>
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  {processing ? 'Processando...' : 'Cruzar com Estoque'}
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="p-3 text-center cursor-pointer hover:border-primary/50" onClick={() => setFilterType('all')}>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total na planilha</p>
                </Card>
                <Card className="p-3 text-center cursor-pointer hover:border-primary/50" onClick={() => setFilterType('matched')}>
                  <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
                  <p className="text-[10px] text-muted-foreground">Encontrados no estoque</p>
                </Card>
                <Card className="p-3 text-center cursor-pointer hover:border-primary/50" onClick={() => setFilterType('changed')}>
                  <p className="text-2xl font-bold text-amber-600">{stats.changed}</p>
                  <p className="text-[10px] text-muted-foreground">Com preço diferente</p>
                </Card>
                <Card className="p-3 text-center cursor-pointer hover:border-primary/50" onClick={() => setFilterType('unmatched')}>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.unmatched}</p>
                  <p className="text-[10px] text-muted-foreground">Não encontrados</p>
                </Card>
              </div>

              {/* Search & filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar código ou descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="matched">Encontrados</SelectItem>
                    <SelectItem value="changed">Preço diferente</SelectItem>
                    <SelectItem value="unmatched">Não encontrados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição (Planilha)</TableHead>
                      <TableHead>Produto (Estoque)</TableHead>
                      <TableHead className="text-right">Preço Atual</TableHead>
                      <TableHead className="text-right">Preço Novo</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.slice(0, 200).map((r, i) => {
                      const pctChange = r.precoAtual && r.precoAtual > 0 ? ((r.precoNovo - r.precoAtual) / r.precoAtual * 100) : null;
                      return (
                        <TableRow key={i} className={!r.inventoryId ? 'opacity-50' : r.diff !== 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                          <TableCell className="font-mono text-xs">{r.imported.codigo}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{r.imported.descricao}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{r.inventoryProduto || '-'}</TableCell>
                          <TableCell className="text-right text-xs">{r.precoAtual !== null ? fmt(r.precoAtual) : '-'}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{fmt(r.precoNovo)}</TableCell>
                          <TableCell className="text-right text-xs">
                            {pctChange !== null ? (
                              <span className={pctChange > 0 ? 'text-red-600' : pctChange < 0 ? 'text-green-600' : ''}>
                                {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {!r.inventoryId ? (
                              <Badge variant="outline" className="text-[10px]">Não encontrado</Badge>
                            ) : r.diff === 0 ? (
                              <Badge variant="secondary" className="text-[10px]">Igual</Badge>
                            ) : (
                              <Badge variant="default" className="text-[10px] bg-amber-500">Atualizar</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredMatches.length > 200 && (
                <p className="text-xs text-muted-foreground text-center">Mostrando 200 de {filteredMatches.length}. Use a busca para filtrar.</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-between items-center">
                <Button variant="outline" onClick={reset}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Nova importação
                </Button>
                <Button onClick={applyPriceUpdates} disabled={updating || stats.changed === 0} className="gap-2">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {updating ? 'Atualizando...' : `Atualizar ${stats.changed} preços`}
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <div>
                <h3 className="font-bold text-lg">Preços atualizados!</h3>
                <p className="text-sm text-muted-foreground">
                  As alterações foram registradas no histórico de preços automaticamente.
                </p>
              </div>
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Importar outra tabela
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
