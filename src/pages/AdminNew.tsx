import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LogOut, RefreshCw, Loader2, CheckCircle, XCircle, Clock, UserPlus, UserMinus, UserCheck, BarChart3, Users, DollarSign, TrendingUp, Activity, Database, Zap, Trash2, Eye, EyeOff, Copy, Key, Upload, Search, Pencil } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PartImageUploader } from "@/components/admin/PartImageUploader";
import { AdminPartsManager } from "@/components/admin/AdminPartsManager";

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
    const { data: regData, error: regError } = await supabase.from('pre_registrations').select('*').order('created_at', { ascending: false });
    if (regError) toast.error("Erro ao carregar usuários");
    else setRegistrations(regData || []);
    
    const { data: logData, error: logError } = await supabase.from('webhook_logs').select('*').order('data_hora', { ascending: false }).limit(10);
    if (!logError) setLogs(logData || []);
    setLoadingData(false);
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
    if (!file || !catalogName.trim()) return;
    setImportingParts(true);
    setImportProgress('Processando...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const text = await file.text();
      const lines = text.split('\n');
      const parts = lines.slice(1).map(line => {
        const v = line.split(',');
        if (v.length < 3) return null;
        return { fabricante: v[2] || '', codigo_peca: v[0] || '', descricao: v[1] || '', chave_de_busca: `${v[2]} ${v[0]} ${v[1]} ${catalogName}`, contexto_ia: v[3] || '' };
      }).filter(Boolean);
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ parts, clearFirst: importMode === 'replace', catalogo: catalogName.trim() }),
      });
      toast.success('Importado!'); fetchCatalogos();
    } catch (e) { toast.error('Erro'); } finally { setImportingParts(false); e.target.value = ''; }
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
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="registrations" className="bg-primary/5">USUÁRIOS (TODOS)</TabsTrigger>
            <TabsTrigger value="logs">LOGS DE WEBHOOK</TabsTrigger>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.filter(r => 
                        (r.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (r.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (r.company_name || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                      ).map(reg => (
                        <TableRow key={reg.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs">{format(new Date(reg.created_at), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-bold text-primary">{reg.company_name}</TableCell>
                          <TableCell className="font-bold">{reg.full_name}</TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell className="font-mono text-xs">{reg.whatsapp}</TableCell>
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

            <Card className="p-6 mt-6 bg-secondary/20">
              <h3 className="text-lg font-bold mb-4">Importar Planilha (.CSV)</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <Input placeholder="Nome do Veículo" value={catalogName} onChange={e => setCatalogName(e.target.value)} className="h-10" />
                <Button variant="default" className="h-10 relative">
                  <Upload className="w-4 h-4 mr-2" /> SELECIONAR ARQUIVO
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-6">Logs de sistema ativos.</Card>
          </TabsContent>
          <TabsContent value="analytics">
            <Card className="p-6">Métricas de vendas em tempo real.</Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminNew;
