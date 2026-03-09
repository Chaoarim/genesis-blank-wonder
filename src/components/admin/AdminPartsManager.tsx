import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PackagePlus, Save, Search, Pencil, Trash2, X, Check, Loader2, Filter } from 'lucide-react';
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
}

export function AdminPartsManager() {
  // --- Add form state ---
  const [fab, setFab] = useState('');
  const [cod, setCod] = useState('');
  const [desc, setDesc] = useState('');
  const [chave, setChave] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anos, setAnos] = useState('');
  const [ctx, setCtx] = useState('');
  const [codSimilares, setCodSimilares] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Search / edit state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFab, setFilterFab] = useState('');
  const [results, setResults] = useState<PartRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PartRow>>({});
  const [fabricantes, setFabricantes] = useState<string[]>([]);

  // Load distinct fabricantes
  useEffect(() => {
    const loadFabricantes = async () => {
      const { data } = await supabase
        .from('parts')
        .select('fabricante')
        .not('fabricante', 'is', null)
        .not('fabricante', 'eq', '')
        .limit(1000);
      if (data) {
        const unique = [...new Set(data.map(d => d.fabricante).filter(Boolean))] as string[];
        unique.sort();
        setFabricantes(unique);
      }
    };
    loadFabricantes();
  }, []);

  const handleAdd = useCallback(async () => {
    if (!cod.trim() || !desc.trim()) {
      toast.error('Código e Descrição são obrigatórios');
      return;
    }
    setSaving(true);

    const chaveGerada = chave.trim() || [fab, cod, desc, marca, modelo, anos, codSimilares].filter(Boolean).join(' ');

    const { error } = await supabase.from('parts').insert({
      fabricante: fab.trim() || null,
      codigo_peca: cod.trim(),
      descricao: desc.trim(),
      chave_de_busca: chaveGerada,
      marca_veiculo: marca.trim() || null,
      modelo_veiculo: modelo.trim() || null,
      anos_aplicacao: anos.trim() || null,
      contexto_ia: ctx.trim() || null,
      codigos_similares: codSimilares.trim() || null,
    });

    setSaving(false);
    if (error) {
      toast.error('Erro ao cadastrar peça');
      return;
    }
    toast.success('Peça cadastrada com sucesso!');
    setFab(''); setCod(''); setDesc(''); setChave(''); setMarca(''); setModelo(''); setAnos(''); setCtx(''); setCodSimilares('');
  }, [fab, cod, desc, chave, marca, modelo, anos, ctx, codSimilares]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && !filterFab) {
      toast.error('Digite algo para buscar ou selecione um fornecedor');
      return;
    }
    setSearching(true);

    let query = supabase.from('parts').select('id, fabricante, codigo_peca, descricao, chave_de_busca, marca_veiculo, modelo_veiculo, anos_aplicacao, contexto_ia, codigos_similares');

    if (filterFab) {
      query = query.eq('fabricante', filterFab);
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
  }, [searchQuery, filterFab]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Fabricante</Label>
                <Input placeholder="Ex: FRAS-LE" value={fab} onChange={e => setFab(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Código Peça *</Label>
                <Input placeholder="Ex: PD/123" value={cod} onChange={e => setCod(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Descrição *</Label>
                <Input placeholder="Ex: Pastilha de Freio" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Marca Veículo</Label>
                <Input placeholder="Ex: Volkswagen" value={marca} onChange={e => setMarca(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Modelo Veículo</Label>
                <Input placeholder="Ex: Gol G5" value={modelo} onChange={e => setModelo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Anos Aplicação</Label>
                <Input placeholder="Ex: 2010-2014" value={anos} onChange={e => setAnos(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Chave de Busca</Label>
                <Input placeholder="Auto-gerada se vazio" value={chave} onChange={e => setChave(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Contexto IA</Label>
                <Input placeholder="Info extra para IA" value={ctx} onChange={e => setCtx(e.target.value)} />
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
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Anos</TableHead>
                      <TableHead className="w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(part => (
                      <TableRow key={part.id}>
                        {editingId === part.id ? (
                          <>
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
                              <Input className="h-8 text-xs" value={editData.marca_veiculo || ''} onChange={e => setEditData(d => ({ ...d, marca_veiculo: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.modelo_veiculo || ''} onChange={e => setEditData(d => ({ ...d, modelo_veiculo: e.target.value }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" value={editData.anos_aplicacao || ''} onChange={e => setEditData(d => ({ ...d, anos_aplicacao: e.target.value }))} />
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
                            <TableCell className="text-xs">{part.fabricante || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">{part.codigo_peca || '—'}</TableCell>
                            <TableCell className="text-xs">{part.descricao || '—'}</TableCell>
                            <TableCell className="text-xs">{part.marca_veiculo || '—'}</TableCell>
                            <TableCell className="text-xs">{part.modelo_veiculo || '—'}</TableCell>
                            <TableCell className="text-xs">{part.anos_aplicacao || '—'}</TableCell>
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
