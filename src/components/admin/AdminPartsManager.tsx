import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PackagePlus, Save, Search, Pencil, Trash2, X, Check, Loader2, Car } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PartRow {
  id: string;
  fabricante: string | null;
  codigo_peca: string | null;
  descricao: string | null;
  chave_de_busca: string | null;
  marca_veiculo: string | null;
  modelo_veiculo: string | null;
  anos_aplicacao: string | null;
  contexto_ia: string | null;
  codigos_similares: string | null;
  catalogo: string | null;
}

export function AdminPartsManager() {
  // --- Add form state ---
  const [fab, setFab] = useState(''); // Fornecedor
  const [cod, setCod] = useState(''); // Código
  const [desc, setDesc] = useState(''); // Produto
  const [aplicacao, setAplicacao] = useState(''); // Aplicação
  const [codSimilares, setCodSimilares] = useState('');
  const [addCatalogo, setAddCatalogo] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Search / edit state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFab, setFilterFab] = useState('');
  const [filterCatalogo, setFilterCatalogo] = useState('');
  const [results, setResults] = useState<PartRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PartRow>>({});
  const [fabricantes, setFabricantes] = useState<string[]>([]);
  const [catalogos, setCatalogos] = useState<string[]>([]);

  // Load distinct fabricantes + catalogos
  useEffect(() => {
    const load = async () => {
      // Fetch ALL distinct fabricantes and catalogos using pagination to bypass the 1000-row limit
      const allFabs: string[] = [];
      const allCats: string[] = [];
      
      // Fetch all fabricantes
      let fabOffset = 0;
      while (true) {
        const { data } = await supabase.from('parts').select('fabricante').not('fabricante', 'is', null).not('fabricante', 'eq', '').range(fabOffset, fabOffset + 999);
        if (!data || data.length === 0) break;
        data.forEach(d => { if (d.fabricante) allFabs.push(d.fabricante); });
        if (data.length < 1000) break;
        fabOffset += 1000;
      }
      
      // Fetch all catalogos
      let catOffset = 0;
      while (true) {
        const { data } = await supabase.from('parts').select('catalogo').not('catalogo', 'is', null).not('catalogo', 'eq', '').range(catOffset, catOffset + 999);
        if (!data || data.length === 0) break;
        data.forEach(d => { if (d.catalogo) allCats.push(d.catalogo); });
        if (data.length < 1000) break;
        catOffset += 1000;
      }

      // Fetch popular_cars as fallback
      const { data: carsData } = await supabase.from('popular_cars').select('name').eq('is_active', true);
      const carsCats = carsData?.map(d => d.name).filter(Boolean) || [];

      const uniqueFabs = [...new Set(allFabs)].sort();
      setFabricantes(uniqueFabs);

      const uniqueCats = [...new Set([...allCats, ...carsCats])].sort();
      setCatalogos(uniqueCats);
    };
    load();
  }, []);

  const handleAdd = useCallback(async () => {
    if (!cod.trim() || !desc.trim()) {
      toast.error('Código e Produto são obrigatórios');
      return;
    }
    if (!addCatalogo.trim()) {
      toast.error('Selecione ou digite o Catálogo (Veículo)');
      return;
    }
    setSaving(true);

    const catName = addCatalogo.trim();

    // Auto-generate chave_de_busca from catálogo + produto + código
    const chaveGerada = [catName, desc.trim(), cod.trim(), fab.trim()].filter(Boolean).join(' ');

    // Auto-generate contexto_ia
    const ctxGerado = `${desc.trim()} - ${aplicacao.trim() || catName}. Fornecedor: ${fab.trim()}. Código: ${cod.trim()}.`.replace(/\s+/g, ' ').trim();

    const { error } = await supabase.from('parts').insert({
      fabricante: fab.trim() || null,
      codigo_peca: cod.trim(),
      descricao: desc.trim(),
      chave_de_busca: chaveGerada,
      contexto_ia: ctxGerado || null,
      codigos_similares: codSimilares.trim() || null,
      catalogo: catName,
      marca_veiculo: aplicacao.trim() || catName,
    });

    setSaving(false);
    if (error) {
      toast.error('Erro ao cadastrar peça');
      return;
    }
    toast.success('Peça cadastrada com sucesso!');
    if (!catalogos.includes(catName)) {
      setCatalogos(prev => [...prev, catName].sort());
    }
    setFab(''); setCod(''); setDesc(''); setAplicacao(''); setCodSimilares('');
  }, [fab, cod, desc, aplicacao, codSimilares, addCatalogo, catalogos]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && !filterFab && !filterCatalogo) {
      toast.error('Digite algo para buscar ou selecione um filtro');
      return;
    }
    setSearching(true);

    let query = supabase.from('parts').select('id, fabricante, codigo_peca, descricao, chave_de_busca, marca_veiculo, modelo_veiculo, anos_aplicacao, contexto_ia, codigos_similares, catalogo');

    if (filterFab) {
      query = query.eq('fabricante', filterFab);
    }

    if (filterCatalogo) {
      query = query.eq('catalogo', filterCatalogo);
    }

    if (searchQuery.trim()) {
      const term = `%${searchQuery.trim()}%`;
      query = query.or(`codigo_peca.ilike.${term},descricao.ilike.${term},chave_de_busca.ilike.${term}`);
    }

    const { data, error } = await query.order('descricao').limit(100);
    setSearching(false);

    if (error) {
      toast.error('Erro na busca');
      return;
    }
    setResults(data || []);
    if (!data?.length) toast.info('Nenhuma peça encontrada');
  }, [searchQuery, filterFab, filterCatalogo]);

  const startEdit = (part: PartRow) => {
    setEditingId(part.id);
    setEditData({ ...part });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const { error } = await supabase.from('parts').update({
      fabricante: editData.fabricante || null,
      codigo_peca: editData.codigo_peca || null,
      descricao: editData.descricao || null,
      chave_de_busca: editData.chave_de_busca || null,
      marca_veiculo: editData.marca_veiculo || null,
      modelo_veiculo: editData.modelo_veiculo || null,
      anos_aplicacao: editData.anos_aplicacao || null,
      contexto_ia: editData.contexto_ia || null,
      codigos_similares: editData.codigos_similares || null,
      catalogo: editData.catalogo || null,
    }).eq('id', editingId);

    if (error) {
      toast.error('Erro ao atualizar peça');
      return;
    }
    toast.success('Peça atualizada!');
    setResults(prev => prev.map(p => p.id === editingId ? { ...p, ...editData } as PartRow : p));
    cancelEdit();
  }, [editingId, editData]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir peça');
      return;
    }
    toast.success('Peça excluída!');
    setResults(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <div className="space-y-6 mt-6">
      <Tabs defaultValue="add">
        <TabsList>
          <TabsTrigger value="add" className="gap-2">
            <PackagePlus className="w-4 h-4" /> Cadastrar Peça
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-2">
            <Pencil className="w-4 h-4" /> Buscar / Editar
          </TabsTrigger>
        </TabsList>

        {/* --- ADD TAB --- */}
        <TabsContent value="add">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Cadastrar Peça Manualmente
            </h3>

            {/* Catalog selector - prominent */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
              <Label className="flex items-center gap-2 font-semibold">
                <Car className="w-4 h-4 text-primary" />
                Catálogo (Veículo) *
              </Label>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={catalogos.includes(addCatalogo) ? addCatalogo : '__custom__'}
                  onChange={e => {
                    if (e.target.value === '__custom__') return;
                    setAddCatalogo(e.target.value);
                  }}
                >
                  <option value="__custom__">Selecionar ou digitar novo...</option>
                  {catalogos.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Input
                  placeholder="Ou digite novo catálogo"
                  value={addCatalogo}
                  onChange={e => setAddCatalogo(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Código *</Label>
                <Input placeholder="Ex: PD/123" value={cod} onChange={e => setCod(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Produto *</Label>
                <Input placeholder="Ex: Pastilha de Freio" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <Input placeholder="Ex: FRAS-LE" value={fab} onChange={e => setFab(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Aplicação</Label>
                <Input placeholder="Ex: Gol G5 2010-2014" value={aplicacao} onChange={e => setAplicacao(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Similares</Label>
                <Input placeholder="Ex: SYL1086, COBREQ N250" value={codSimilares} onChange={e => setCodSimilares(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Cadastrar Peça'}
            </Button>
          </Card>
        </TabsContent>

        {/* --- EDIT TAB --- */}
        <TabsContent value="edit">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Buscar e Editar Peças
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por código, descrição..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="sm:w-48">
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={filterCatalogo}
                  onChange={e => setFilterCatalogo(e.target.value)}
                >
                  <option value="">Todos Catálogos</option>
                  {catalogos.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={filterFab}
                  onChange={e => setFilterFab(e.target.value)}
                >
                  <option value="">Todos Fornecedores</option>
                  {fabricantes.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSearch} disabled={searching} className="gap-2">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </Button>
            </div>

            {results.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-sm text-muted-foreground mb-2">{results.length} resultado(s)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catálogo</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Similares</TableHead>
                      <TableHead className="w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(part => (
                      <TableRow key={part.id}>
                        {editingId === part.id ? (
                          <>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.catalogo || ''} onChange={e => setEditData(d => ({ ...d, catalogo: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.fabricante || ''} onChange={e => setEditData(d => ({ ...d, fabricante: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.codigo_peca || ''} onChange={e => setEditData(d => ({ ...d, codigo_peca: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.descricao || ''} onChange={e => setEditData(d => ({ ...d, descricao: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.codigos_similares || ''} onChange={e => setEditData(d => ({ ...d, codigos_similares: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={saveEdit}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-xs font-medium text-primary">{part.catalogo || '—'}</TableCell>
                            <TableCell className="text-xs">{part.fabricante || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">{part.codigo_peca || '—'}</TableCell>
                            <TableCell className="text-xs">{part.descricao || '—'}</TableCell>
                            <TableCell className="text-xs">{part.codigos_similares || '—'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(part)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Peça</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Excluir <strong>{part.descricao}</strong> ({part.codigo_peca})? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(part.id)} className="bg-destructive text-destructive-foreground">
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
