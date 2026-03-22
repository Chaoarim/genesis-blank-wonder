import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LogOut, RefreshCw, Loader2, CheckCircle, XCircle, Clock, UserPlus, UserMinus, UserCheck, BarChart3, Users, DollarSign, TrendingUp, Activity, Database, Zap, Trash2, Eye, EyeOff, Copy, Key, Upload, Search, Pencil, Save, MessageSquare } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PartImageUploader } from "@/components/admin/PartImageUploader";
import { AdminPartsManager } from "@/components/admin/AdminPartsManager";
import { Textarea } from "@/components/ui/textarea";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PreRegistration {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  whatsapp: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  password_hash: string | null;
}

interface WebhookLog {
  id: string;
  email: string;
  evento_recebido: string;
  data_hora: string;
  plano_aplicado: string | null;
  acao_acesso: string | null;
}

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  preRegistrations: number;
  approvedRegistrations: number;
  webhookEvents: number;
}

interface CostEstimate {
  tier: string;
  monthlyEstimate: string;
  features: string[];
  isCurrentTier: boolean;
}

interface UserSubscription {
  id: string;
  email: string;
  started_at: string | null;
  expires_at: string | null;
  notes: string | null;
  status: string | null;
  plan: string | null;
}

const AdminNew = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<PreRegistration[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [importingParts, setImportingParts] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [catalogos, setCatalogos] = useState<{name: string; count: number}[]>([]);
  const [catalogName, setCatalogName] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [renamingCatalog, setRenamingCatalog] = useState<{oldName: string, newName: string} | null>(null);
  const [renamingCatalogLoading, setRenamingCatalogLoading] = useState(false);
  const [subscriptionsMap, setSubscriptionsMap] = useState<Record<string, UserSubscription>>({});
  const [editingNotes, setEditingNotes] = useState<{email: string, notes: string} | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    preRegistrations: 0,
    approvedRegistrations: 0,
    webhookEvents: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Realtime: escuta mudanças em pre_registrations e webhook_logs
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pre_registrations" },
        () => {
          fetchData();
          fetchStats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "webhook_logs" },
        () => {
          fetchData();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchCatalogos = async () => {
    try {
      setLoadingData(true);
      const allCatalogos: { catalogo: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('parts')
          .select('catalogo')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          allCatalogos.push(...data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
        
        if (page > 50) break;
      }

      const map = new Map<string, number>();
      allCatalogos.forEach(row => {
        const name = row.catalogo || 'Sem catálogo';
        map.set(name, (map.get(name) || 0) + 1);
      });
      
      const sortedCatalogos = Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setCatalogos(sortedCatalogos);
    } catch (error) {
      console.error("Erro ao buscar catálogos:", error);
      toast.error("Erro ao carregar lista de catálogos");
    } finally {
      setLoadingData(false);
    }
  };

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: hasRole } = await supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
    if (!hasRole) { toast.error("Acesso negado."); navigate("/app"); return; }
    setIsAdmin(true); setLoading(false); fetchData(); fetchStats(); fetchCatalogos();
  };

  const fetchData = async () => {
    setLoadingData(true);
    const [{ data: regData, error: regError }, { data: subData }, { data: logData, error: logError }] = await Promise.all([
      supabase.from('pre_registrations').select('*').order('created_at', { ascending: false }),
      supabase.from('user_subscriptions').select('id, email, started_at, expires_at, notes, status, plan'),
      supabase.from('webhook_logs').select('*').order('data_hora', { ascending: false }).limit(10),
    ]);
    
    if (regError) toast.error("Erro ao carregar usuários");
    else setRegistrations(regData || []);
    
    if (subData) {
      const map: Record<string, UserSubscription> = {};
      subData.forEach(s => { map[s.email] = s; });
      setSubscriptionsMap(map);
    }
    
    if (!logError) setLogs(logData || []);
    setLoadingData(false);
  };

  const handleSaveNotes = async () => {
    if (!editingNotes) return;
    setSavingNotes(true);
    const sub = subscriptionsMap[editingNotes.email];
    if (sub) {
      const { error } = await supabase.from('user_subscriptions').update({ notes: editingNotes.notes }).eq('id', sub.id);
      if (error) { toast.error("Erro ao salvar"); } 
      else {
        toast.success("Observação salva!");
        setSubscriptionsMap(prev => ({ ...prev, [editingNotes.email]: { ...prev[editingNotes.email], notes: editingNotes.notes } }));
      }
    }
    setSavingNotes(false);
    setEditingNotes(null);
  };

  const fetchStats = async () => {
    try {
      const [{ data: subscriptions }, { data: preRegs }, { count: webhookCount }] = await Promise.all([
        supabase.from("user_subscriptions").select("status"),
        supabase.from("pre_registrations").select("status"),
        supabase.from("webhook_logs").select("id", { count: "exact", head: true }),
      ]);
      const subs = subscriptions ?? [];
      const regs = preRegs ?? [];
      setStats({
        totalUsers: subs.length,
        activeUsers: subs.filter((s) => s.status === "active").length,
        pendingUsers: regs.filter((r) => r.status === "pending").length,
        preRegistrations: regs.length,
        approvedRegistrations: regs.filter((r) => r.status === "approved").length,
        webhookEvents: webhookCount ?? 0,
      });
    } catch (e) {}
  };

  const handleApprove = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    try {
      if (!registration.password_hash) { toast.error("Sem senha cadastrada."); return; }
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token}` },
        body: JSON.stringify({ email: registration.email, password: registration.password_hash, full_name: registration.full_name, company_name: registration.company_name }),
      });
      if (!response.ok && response.status !== 409) throw new Error("Erro ao criar usuário");
      await supabase.from('pre_registrations').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', registration.id);
      await supabase.from('user_subscriptions').upsert({ email: registration.email, status: 'active', plan: 'mensal', started_at: new Date().toISOString() }, { onConflict: 'email' });
      toast.success(`Cliente ${registration.full_name} ativado!`);
      fetchData();
    } catch (error) { toast.error("Erro ao aprovar"); } finally { setProcessingId(null); }
  };

  const handleReject = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    try {
      await supabase.from('pre_registrations').update({ status: 'rejected' }).eq('id', registration.id);
      toast.success(`Rejeitado`);
      fetchData();
    } catch (e) { toast.error("Erro"); } finally { setProcessingId(null); }
  };

  const handleDeactivate = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    try {
      await supabase.from('pre_registrations').update({ status: 'inactive' }).eq('id', registration.id);
      await supabase.rpc('update_subscription_by_email', { p_email: registration.email, p_plan: 'mensal', p_status: 'inactive' });
      toast.success(`Desativado`);
      fetchData();
    } catch (e) { toast.error("Erro"); } finally { setProcessingId(null); }
  };

  const handleReactivate = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    try {
      await supabase.from('pre_registrations').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', registration.id);
      await supabase.rpc('update_subscription_by_email', { p_email: registration.email, p_plan: 'mensal', p_status: 'active' });
      toast.success(`Reativado`);
      fetchData();
    } catch (e) { toast.error("Erro"); } finally { setProcessingId(null); }
  };

  const handleDelete = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    try {
      await supabase.from('user_subscriptions').delete().eq('email', registration.email);
      await supabase.from('pre_registrations').delete().eq('id', registration.id);
      toast.success(`Excluído`); fetchData(); fetchStats();
    } catch (e) { toast.error("Erro"); } finally { setProcessingId(null); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!catalogName.trim()) {
      toast.error('Digite o nome do catálogo (veículo) antes de importar');
      e.target.value = '';
      return;
    }
    
    setImportingParts(true);
    setImportProgress('Lendo arquivo CSV...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada');
        return;
      }

      const text = await file.text();

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        // Detectar delimitador (vírgula ou ponto e vírgula)
        const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
          else current += char;
        }
        result.push(current.trim());
        return result;
      };

      const lines = text.split('\n');
      if (lines.length < 2) {
        toast.error('Arquivo CSV vazio ou inválido');
        return;
      }

      const header = parseCSVLine(lines[0]);
      const norm = (h: string) => h.replace(/^\uFEFF/, '').trim().toUpperCase();
      const nh = header.map(norm);

      // Mapeamento flexível de colunas
      const idxCodigo = Math.max(nh.indexOf('CÓDIGO'), nh.indexOf('CODIGO'), nh.indexOf('CODIGO_PECA'), 0);
      const idxProduto = Math.max(nh.indexOf('PRODUTO'), nh.indexOf('DESCRICAO'), 1);
      const idxFornecedor = Math.max(nh.indexOf('FORNECEDOR'), nh.indexOf('FABRICANTE'), 2);
      const idxAplicacao = Math.max(nh.indexOf('APLICAÇÃO'), nh.indexOf('APLICACAO'), nh.indexOf('CHAVE_DE_BUSCA'), 3);

      const allParts: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const v = parseCSVLine(line);
        if (v.length >= 2) {
          const codigo = (v[idxCodigo] || '').trim();
          const produto = (v[idxProduto] || '').trim();
          const fornecedor = (v[idxFornecedor] || '').trim();
          const aplicacao = (v[idxAplicacao] || '').trim();

          // Concatenar campos para a chave de busca para facilitar a vida da IA/Busca
          const chave = [fornecedor, codigo, produto, aplicacao, catalogName.trim()].filter(Boolean).join(' ');

          allParts.push({
            fabricante: fornecedor,
            codigo_peca: codigo,
            descricao: produto,
            chave_de_busca: chave,
            marca_veiculo: '',
            modelo_veiculo: '',
            anos_aplicacao: '',
            contexto_ia: aplicacao,
          });
        }
      }

      if (allParts.length === 0) {
        toast.error('Nenhuma peça encontrada no CSV. Verifique o formato.');
        return;
      }

      const clearFirst = importMode === 'replace';
      setImportProgress(`${clearFirst ? 'Substituindo' : 'Adicionando'} ${allParts.length} peças ao catálogo "${catalogName}"...`);

      const chunkSize = 2000; // Chunk menor para maior estabilidade
      let totalInserted = 0;

      for (let i = 0; i < allParts.length; i += chunkSize) {
        const chunk = allParts.slice(i, i + chunkSize);
        setImportProgress(`Enviando lote ${Math.floor(i / chunkSize) + 1} (${i + 1}-${Math.min(i + chunkSize, allParts.length)}) de ${allParts.length}...`);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-parts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              parts: chunk,
              clearFirst: clearFirst && i === 0,
              catalogo: catalogName.trim(),
            }),
          }
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Erro na importação');
        }
        
        const result = await response.json();
        totalInserted += result.inserted || 0;
      }

      setImportProgress(`✅ SUCESSO! ${totalInserted} peças importadas no catálogo "${catalogName}".`);
      toast.success(`${totalInserted} peças importadas com sucesso!`);
      setCatalogName('');
      fetchCatalogos();
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress('❌ Erro na importação. Verifique o console.');
      toast.error(error instanceof Error ? error.message : 'Erro na importação');
    } finally {
      setImportingParts(false);
      e.target.value = '';
    }
  };

  const handleDeleteCatalog = async (name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'delete_catalog', catalogo: name }),
      });
      toast.success('Excluído'); fetchCatalogos();
    } catch (e) { toast.error('Erro'); }
  };

  const handleRenameCatalog = async () => {
    if (!renamingCatalog) return;
    setRenamingCatalogLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'rename_catalog', catalogo: renamingCatalog.oldName, new_catalogo: renamingCatalog.newName.trim() }),
      });
      toast.success('Renomeado'); fetchCatalogos(); setRenamingCatalog(null);
    } catch (e) { toast.error('Erro'); } finally { setRenamingCatalogLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const s = { pending: "bg-yellow-500/20 text-yellow-400", approved: "bg-green-500/20 text-green-400", inactive: "bg-orange-500/20 text-orange-400", rejected: "bg-red-500/20 text-red-400" }[status] || "bg-muted text-muted-foreground";
    return <span className={`px-2 py-1 rounded text-xs font-medium ${s}`}>{status}</span>;
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <span className="text-xl font-bold block uppercase tracking-tighter">PAINEL CONTROLE TOTAL V4</span>
              <span className="text-xs text-primary font-black uppercase">ConsultaParts AI - Status OK</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/login')}><LogOut className="w-4 h-4 mr-2" />Sair</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="registrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="registrations" className="bg-primary/5">USUÁRIOS (TODOS)</TabsTrigger>
            <TabsTrigger value="database" className="bg-primary/10 font-bold">BASE DE DADOS V4</TabsTrigger>
            <TabsTrigger value="analytics">VENDAS & MÉTRICAS</TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <Card className="p-6 border-primary/20 shadow-xl">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black flex items-center gap-2 text-primary">
                    <Users className="w-6 h-6" /> PRÉ-CADASTROS E CLIENTES
                  </h2>
                  <Button variant="outline" onClick={fetchData} disabled={loadingData}><RefreshCw className={loadingData ? "animate-spin" : ""} /></Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  <Input 
                    placeholder="BUSCAR USUÁRIO POR NOME, EMAIL OU EMPRESA..." 
                    className="pl-12 h-14 text-lg border-primary/40 focus:ring-4 focus:ring-primary/20"
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                  />
                </div>

                <div className="overflow-x-auto border rounded-xl">
                   <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Senha</TableHead>
                        <TableHead>Compra</TableHead>
                        <TableHead>Renovação</TableHead>
                        <TableHead>Obs</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.filter(r => 
                        (r.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (r.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (r.company_name || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                      ).map(reg => {
                        const sub = subscriptionsMap[reg.email];
                        return (
                        <TableRow key={reg.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs">{format(new Date(reg.created_at), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-bold text-primary">{reg.company_name}</TableCell>
                          <TableCell className="font-bold">{reg.full_name}</TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell className="font-mono text-xs">
                            <a href={`https://wa.me/55${reg.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {reg.whatsapp}
                            </a>
                          </TableCell>
                          <TableCell>
                            {reg.password_hash ? (
                              <div className="flex items-center gap-1">
                                <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                                  {reg.password_hash}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(reg.password_hash || "");
                                    toast.success("Senha copiada!");
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sub?.started_at ? format(new Date(sub.started_at), "dd/MM/yyyy") : '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sub?.expires_at ? (
                              <span className={new Date(sub.expires_at) < new Date() ? 'text-red-400 font-bold' : new Date(sub.expires_at) < new Date(Date.now() + 7 * 86400000) ? 'text-yellow-400 font-bold' : ''}>
                                {format(new Date(sub.expires_at), "dd/MM/yyyy")}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {editingNotes?.email === reg.email ? (
                              <div className="flex items-center gap-1">
                                <Textarea 
                                  className="text-xs h-16 w-32 min-h-0" 
                                  value={editingNotes.notes} 
                                  onChange={e => setEditingNotes({ email: reg.email, notes: e.target.value })}
                                />
                                <div className="flex flex-col gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400" onClick={handleSaveNotes} disabled={savingNotes}>
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingNotes(null)}>
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 max-w-[120px]">
                                <span className="text-xs truncate" title={sub?.notes || ''}>{sub?.notes || '—'}</span>
                                <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => setEditingNotes({ email: reg.email, notes: sub?.notes || '' })}>
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(reg.status)}</TableCell>
                          <TableCell className="flex gap-2">
                            {reg.status === 'pending' && <Button size="sm" onClick={() => handleApprove(reg)}><CheckCircle className="w-4 h-4 mr-1" /> Ativar</Button>}
                            {(reg.status === 'approved' || reg.status === 'active') && <Button size="sm" variant="destructive" onClick={() => handleDeactivate(reg)}>Desativar</Button>}
                            {(reg.status === 'inactive') && <Button size="sm" variant="outline" onClick={() => handleReactivate(reg)}>Reativar</Button>}
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Apagar usuário?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(reg)}>Sim, apagar</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card className="p-6 border-primary shadow-2xl shadow-primary/10">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <Input 
                      placeholder="BUSCAR VEÍCULO AGORA..." 
                      className="pl-12 h-14 text-xl font-black bg-background border-primary/40 focus:ring-4 focus:ring-primary/20"
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                    />
                  </div>
                  <Button onClick={fetchCatalogos} className="h-14 w-14" size="icon"><RefreshCw className={loadingData ? "animate-spin" : ""} /></Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catalogos.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary transition-all">
                      <div>
                        <p className="font-black text-lg text-foreground uppercase">{cat.name}</p>
                        <p className="text-sm text-muted-foreground">{cat.count} peças</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={renamingCatalog?.oldName === cat.name} onOpenChange={o => !o && setRenamingCatalog(null)}>
                          <DialogTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10 text-primary" onClick={() => setRenamingCatalog({oldName: cat.name, newName: cat.name})}><Pencil className="w-5 h-5" /></Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Renomear "{cat.name}"</DialogTitle></DialogHeader>
                            <Input value={renamingCatalog?.newName || ''} onChange={e => setRenamingCatalog(p => p ? {...p, newName: e.target.value} : null)} className="my-4 h-12" />
                            <Button onClick={handleRenameCatalog} disabled={renamingCatalogLoading} className="w-full h-12">SALVAR</Button>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-10 w-10"><Trash2 className="w-5 h-5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>EXCLUIR TUDO?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>NÃO</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCatalog(cat.name)} className="bg-destructive">SIM, APAGAR</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6 mt-6 bg-secondary/10 border-primary/20">
              <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                <Upload className="w-6 h-6" /> IMPORTAR PLANILHA (.CSV)
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Colunas esperadas: <strong>Código, Produto, Fornecedor, Aplicação</strong>. 
                O sistema detecta automaticamente se você usar ";" ou ",".
              </p>
              
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Nome do Veículo / Catálogo *</label>
                    <Input 
                      placeholder="Ex: Toyota Hilux 2024..." 
                      value={catalogName} 
                      onChange={e => setCatalogName(e.target.value)} 
                      className="h-12 border-primary/30" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Se o catálogo já existir</label>
                    <select
                      value={importMode}
                      onChange={e => setImportMode(e.target.value as 'replace' | 'merge')}
                      className="w-full h-12 rounded-md border border-primary/30 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="replace">Substituir tudo (Recomendado)</option>
                      <option value="merge">Mesclar (Adicionar ao final)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Button 
                    variant="default" 
                    className={`h-14 relative font-bold text-lg shadow-lg transition-all ${importingParts ? 'opacity-70' : 'hover:scale-[1.02]'}`}
                    disabled={importingParts || !catalogName.trim()}
                  >
                    {importingParts ? (
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 mr-3" />
                    )}
                    {importingParts ? 'IMPORTANDO DADOS...' : 'SELECIONAR ARQUIVO E INICIAR'}
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      disabled={importingParts || !catalogName.trim()}
                    />
                  </Button>

                  {importProgress && (
                    <div className={`p-4 rounded-xl text-sm font-medium border animate-in fade-in slide-in-from-top-2 ${
                      importProgress.includes('✅') 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                        : importProgress.includes('❌')
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-primary/10 border-primary/30 text-primary'
                    }`}>
                      {importProgress}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Métricas de Uso
                </h2>
                <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchData(); }} disabled={loadingData}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total de Usuários", value: stats.totalUsers, icon: Users, color: "text-blue-400", bgColor: "bg-blue-500/20" },
                  { label: "Usuários Ativos", value: stats.activeUsers, icon: UserCheck, color: "text-green-400", bgColor: "bg-green-500/20" },
                  { label: "Aguardando Aprovação", value: stats.pendingUsers, icon: Clock, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
                  { label: "Pré-Cadastros", value: stats.preRegistrations, icon: Activity, color: "text-purple-400", bgColor: "bg-purple-500/20" },
                  { label: "Eventos de Webhook", value: stats.webhookEvents, icon: Zap, color: "text-primary", bgColor: "bg-primary/20" },
                  { label: "Taxa de Aprovação", value: stats.preRegistrations > 0 ? `${Math.round((stats.approvedRegistrations / stats.preRegistrations) * 100)}%` : "0%", icon: TrendingUp, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
                ].map((metric, index) => (
                  <Card key={index} className="p-6 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                        <metric.icon className={`w-6 h-6 ${metric.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                        <p className="text-2xl font-bold">{metric.value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Estimativa de Custos</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { tier: "Gratuito", estimate: "R$ 0", features: ["Até 50.000 req/mês", "500 MB banco", "1 GB transferência", "Edge Functions"], isCurrent: stats.activeUsers <= 50 },
                    { tier: "Pro", estimate: "R$ 125/mês", features: ["Requisições ilimitadas", "8 GB banco", "50 GB transferência", "Backups diários"], isCurrent: stats.activeUsers > 50 && stats.activeUsers <= 200 },
                    { tier: "Team", estimate: "R$ 300/mês", features: ["Tudo do Pro", "Colaboração em equipe", "Suporte prioritário", "SLA garantido"], isCurrent: stats.activeUsers > 200 },
                  ].map((t, i) => (
                    <Card key={i} className={`p-6 transition-all ${t.isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                      {t.isCurrent && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary mb-3">
                          <Activity className="w-3 h-3" /> Faixa Atual
                        </div>
                      )}
                      <h3 className="text-lg font-bold">{t.tier}</h3>
                      <p className="text-2xl font-bold text-primary mt-2">{t.estimate}</p>
                      <ul className="mt-4 space-y-2">
                        {t.features.map((f, fi) => (
                          <li key={fi} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Database className="w-3 h-3 text-primary" /> {f}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Dicas de Otimização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Rate Limiting Ativo</p>
                    <p className="text-sm text-muted-foreground mt-1">Limite de 10 req/min por usuário.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Cache de Respostas</p>
                    <p className="text-sm text-muted-foreground mt-1">Respostas similares são cacheadas.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Escalabilidade Automática</p>
                    <p className="text-sm text-muted-foreground mt-1">Infraestrutura escala automaticamente.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Monitoramento em Tempo Real</p>
                    <p className="text-sm text-muted-foreground mt-1">Acompanhe o uso nesta página.</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminNew;
