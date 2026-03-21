import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LogOut, RefreshCw, Loader2, CheckCircle, XCircle, Clock, UserPlus, UserMinus, UserCheck, BarChart3, Users, DollarSign, TrendingUp, Activity, Database, Zap, Trash2, Eye, EyeOff, Copy, Key, Upload } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

const Admin = () => {
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
    const { data } = await supabase
      .from('parts')
      .select('catalogo');
    if (data) {
      const map = new Map<string, number>();
      for (const row of data) {
        const name = row.catalogo || 'Sem catálogo';
        map.set(name, (map.get(name) || 0) + 1);
      }
      setCatalogos(Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    });

    if (!hasRole) {
      toast.error("Acesso negado. Área restrita a administradores.");
      navigate("/app");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    fetchData();
    fetchStats();
    fetchCatalogos();
  };

  const fetchData = async () => {
    setLoadingData(true);
    
    // Buscar pré-cadastros
    const { data: regData, error: regError } = await supabase
      .from('pre_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (regError) {
      if (import.meta.env.DEV) {
        console.error("Erro ao buscar pré-cadastros:", regError);
      }
      toast.error("Erro ao carregar pré-cadastros");
    } else {
      setRegistrations(regData || []);
    }
    
    // Buscar logs
    const { data: logData, error: logError } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(10);

    if (logError) {
      if (import.meta.env.DEV) {
        console.error("Erro ao buscar logs:", logError);
      }
    } else {
      setLogs(logData || []);
    }
    
    setLoadingData(false);
  };

  const fetchStats = async () => {
    try {
      const [{ data: subscriptions, error: subError }, { data: preRegs, error: preError }, { count: webhookCount, error: webhookError }] =
        await Promise.all([
          supabase.from("user_subscriptions").select("status"),
          supabase.from("pre_registrations").select("status"),
          supabase.from("webhook_logs").select("id", { count: "exact", head: true }),
        ]);

      if (subError) throw subError;
      if (preError) throw preError;
      if (webhookError) throw webhookError;

      const subs = subscriptions ?? [];
      const regs = preRegs ?? [];

      setStats({
        totalUsers: subs.length,
        activeUsers: subs.filter((s) => s.status === "active").length,
        // "Aguardando Aprovação" = pré-cadastros pendentes
        pendingUsers: regs.filter((r) => r.status === "pending").length,
        preRegistrations: regs.length,
        approvedRegistrations: regs.filter((r) => r.status === "approved").length,
        webhookEvents: webhookCount ?? 0,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao buscar estatísticas:", error);
      }
    }
  };

  const handleApprove = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    
    try {
      // 1. Verificar se tem senha cadastrada
      if (!registration.password_hash) {
        toast.error("Este usuário não tem senha cadastrada. Peça para ele fazer o pré-cadastro novamente com senha.");
        return;
      }

      // 2. Criar usuário no Supabase Auth via edge function
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            email: registration.email,
            password: registration.password_hash,
            full_name: registration.full_name,
            company_name: registration.company_name,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Se o usuário já existe, apenas ativar a assinatura
        if (response.status === 409) {
          toast.info("Usuário já existe. Ativando assinatura...");
        } else {
          throw new Error(result.error || "Erro ao criar usuário");
        }
      }

      // 3. Atualizar status do pré-cadastro
      const { error: updateError } = await supabase
        .from('pre_registrations')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      // 4. Criar/atualizar assinatura do usuário
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('email', registration.email)
        .maybeSingle();

      if (existingSub) {
        // Atualizar assinatura existente
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            plan: 'mensal',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSub.id);
      } else {
        // Criar nova assinatura
        await supabase
          .from('user_subscriptions')
          .insert({
            email: registration.email,
            status: 'active',
            plan: 'mensal',
            started_at: new Date().toISOString()
          });
      }

      toast.success(`Cliente ${registration.full_name} ativado com sucesso! Usuário pode fazer login.`);
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao aprovar:", error);
      }
      toast.error(error instanceof Error ? error.message : "Erro ao aprovar cliente");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    
    try {
      const { error } = await supabase
        .from('pre_registrations')
        .update({ status: 'rejected' })
        .eq('id', registration.id);

      if (error) throw error;

      toast.success(`Pré-cadastro de ${registration.full_name} rejeitado`);
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao rejeitar:", error);
      }
      toast.error("Erro ao rejeitar cliente");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivate = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    
    try {
      // 1. Atualizar status do pré-cadastro para inativo
      const { error: updateError } = await supabase
        .from('pre_registrations')
        .update({ status: 'inactive' })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      // 2. Desativar assinatura do usuário usando RPC (bypassa RLS)
      const { data: result, error: subError } = await supabase.rpc('update_subscription_by_email', {
        p_email: registration.email,
        p_plan: 'mensal',
        p_status: 'inactive'
      });

      if (subError) {
        if (import.meta.env.DEV) {
          console.error("Erro ao desativar assinatura:", subError);
        }
        throw subError;
      }

      toast.success(`Acesso de ${registration.full_name} desativado!`);
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao desativar:", error);
      }
      toast.error("Erro ao desativar cliente");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivate = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    
    try {
      // 1. Atualizar status do pré-cadastro para aprovado
      const { error: updateError } = await supabase
        .from('pre_registrations')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      // 2. Reativar assinatura do usuário usando RPC (bypassa RLS)
      const { data: result, error: subError } = await supabase.rpc('update_subscription_by_email', {
        p_email: registration.email,
        p_plan: 'mensal',
        p_status: 'active'
      });

      if (subError) {
        if (import.meta.env.DEV) {
          console.error("Erro ao reativar assinatura:", subError);
        }
        throw subError;
      }

      toast.success(`Acesso de ${registration.full_name} reativado!`);
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao reativar:", error);
      }
      toast.error("Erro ao reativar cliente");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (registration: PreRegistration) => {
    setProcessingId(registration.id);
    
    try {
      // 1. Deletar assinatura do usuário (se existir)
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('email', registration.email);

      // 2. Deletar pré-cadastro
      const { error } = await supabase
        .from('pre_registrations')
        .delete()
        .eq('id', registration.id);

      if (error) throw error;

      toast.success(`Usuário ${registration.full_name} excluído permanentemente!`);
      fetchData();
      fetchStats();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao excluir:", error);
      }
      toast.error("Erro ao excluir usuário");
    } finally {
      setProcessingId(null);
    }
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
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
          else current += char;
        }
        result.push(current.trim());
        return result;
      };

      const lines = text.split('\n');
      const header = parseCSVLine(lines[0]);
      const norm = (h: string) => h.replace(/^\uFEFF/, '').trim().toUpperCase();
      const nh = header.map(norm);

      // New format: Código, Produto, Fornecedor, Aplicação
      // Also support old format
      const idxCodigo = Math.max(nh.indexOf('CÓDIGO'), nh.indexOf('CODIGO'), nh.indexOf('CODIGO_PECA'), 0);
      const idxProduto = Math.max(nh.indexOf('PRODUTO'), nh.indexOf('DESCRICAO'), 1);
      const idxFornecedor = Math.max(nh.indexOf('FORNECEDOR'), nh.indexOf('FABRICANTE'), 2);
      const idxAplicacao = Math.max(nh.indexOf('APLICAÇÃO'), nh.indexOf('APLICACAO'), nh.indexOf('CHAVE_DE_BUSCA'), 3);

      const allParts: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const v = parseCSVLine(line);
        if (v.length >= 3) {
          const codigo = (v[idxCodigo] || '').trim();
          const produto = (v[idxProduto] || '').trim();
          const fornecedor = (v[idxFornecedor] || '').trim();
          const aplicacao = (v[idxAplicacao] || '').trim();

          // Build chave_de_busca from all fields
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
        toast.error('Nenhuma peça encontrada no CSV');
        return;
      }

      const clearFirst = importMode === 'replace';
      setImportProgress(`${clearFirst ? 'Substituindo' : 'Adicionando'} ${allParts.length} peças ao catálogo "${catalogName}"...`);

      const chunkSize = 5000;
      let totalInserted = 0;

      for (let i = 0; i < allParts.length; i += chunkSize) {
        const chunk = allParts.slice(i, i + chunkSize);
        setImportProgress(`Importando ${i + 1}-${Math.min(i + chunkSize, allParts.length)} de ${allParts.length}...`);

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

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro na importação');
        totalInserted += result.inserted || 0;
      }

      setImportProgress(`✅ ${totalInserted} peças importadas no catálogo "${catalogName}"!`);
      toast.success(`${totalInserted} peças importadas no catálogo "${catalogName}"!`);
      setCatalogName('');
      fetchCatalogos();
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress('');
      toast.error(error instanceof Error ? error.message : 'Erro na importação');
    } finally {
      setImportingParts(false);
      e.target.value = '';
    }
  };

  const handleDeleteCatalog = async (catalogoName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-parts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'delete_catalog', catalogo: catalogoName === 'Sem catálogo' ? '__null__' : catalogoName }),
        }
      );

      if (!response.ok) throw new Error('Erro ao excluir');
      toast.success(`Catálogo "${catalogoName}" excluído!`);
      fetchCatalogos();
    } catch (error) {
      toast.error('Erro ao excluir catálogo');
    }
  };

  const formatWhatsapp = (value: string) => {
    return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Ativo
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
            <UserMinus className="w-3 h-3" />
            Inativo
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </span>
        );
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span>Verificando permissões...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  const costTiers: CostEstimate[] = [
    {
      tier: "Gratuito",
      monthlyEstimate: "R$ 0",
      features: [
        "Até 50.000 requisições/mês",
        "500 MB de banco de dados",
        "1 GB de transferência",
        "Edge Functions incluídas"
      ],
      isCurrentTier: stats.activeUsers <= 50
    },
    {
      tier: "Pro",
      monthlyEstimate: "R$ 125/mês",
      features: [
        "Requisições ilimitadas",
        "8 GB de banco de dados",
        "50 GB de transferência",
        "Backups diários"
      ],
      isCurrentTier: stats.activeUsers > 50 && stats.activeUsers <= 200
    },
    {
      tier: "Team",
      monthlyEstimate: "R$ 300/mês",
      features: [
        "Tudo do Pro",
        "Colaboração em equipe",
        "Suporte prioritário",
        "SLA garantido"
      ],
      isCurrentTier: stats.activeUsers > 200
    }
  ];

  const usageMetrics = [
    {
      label: "Total de Usuários",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    {
      label: "Usuários Ativos",
      value: stats.activeUsers,
      icon: UserCheck,
      color: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    {
      label: "Aguardando Aprovação",
      value: stats.pendingUsers,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20"
    },
    {
      label: "Pré-Cadastros",
      value: stats.preRegistrations,
      icon: Activity,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    {
      label: "Eventos de Webhook",
      value: stats.webhookEvents,
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/20"
    },
    {
      label: "Taxa de Aprovação",
      value: stats.preRegistrations > 0 
        ? `${Math.round((stats.approvedRegistrations / stats.preRegistrations) * 100)}%` 
        : "0%",
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold">Painel Admin</span>
              <span className="text-xs text-muted-foreground block">ConsultaParts AI</span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="registrations" className="space-y-6" onValueChange={(value) => {
          if (value === 'analytics') {
            fetchStats();
          }
        }}>
          <TabsList>
            <TabsTrigger value="registrations" className="relative">
              <UserPlus className="w-4 h-4 mr-2" />
              Pré-Cadastros
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs">
              Logs de Webhook
            </TabsTrigger>
            <TabsTrigger value="payments" onClick={() => navigate('/pagamentos')}>
              <DollarSign className="w-4 h-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              Importar Catálogo de Veículo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Pré-Cadastros
                </h2>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loadingData}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhum pré-cadastro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      registrations.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(reg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium text-primary">{reg.company_name || '—'}</TableCell>
                          <TableCell className="font-medium">{reg.full_name}</TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell className="font-mono text-sm">
                            <a 
                              href={`https://wa.me/55${reg.whatsapp}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {formatWhatsapp(reg.whatsapp)}
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
                          <TableCell>{getStatusBadge(reg.status)}</TableCell>
                          <TableCell>
                            {reg.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(reg)}
                                  disabled={processingId === reg.id}
                                >
                                  {processingId === reg.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Ativar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(reg)}
                                  disabled={processingId === reg.id}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeitar
                                </Button>
                              </div>
                            )}
                            {reg.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeactivate(reg)}
                                disabled={processingId === reg.id}
                              >
                                {processingId === reg.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserMinus className="w-4 h-4 mr-1" />
                                    Desativar
                                  </>
                                )}
                              </Button>
                            )}
                            {(reg.status === 'inactive' || reg.status === 'rejected') && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReactivate(reg)}
                                  disabled={processingId === reg.id}
                                >
                                  {processingId === reg.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Reativar
                                    </>
                                  )}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={processingId === reg.id}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir permanentemente <strong>{reg.full_name}</strong>?
                                        <br /><br />
                                        Esta ação não pode ser desfeita. Todos os dados do usuário serão removidos.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(reg)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir Permanentemente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>


          <TabsContent value="logs">
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Últimos Eventos de Webhook</h2>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loadingData}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum evento registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.data_hora), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{log.email}</TableCell>
                          <TableCell>{log.evento_recebido}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.plano_aplicado === 'mensal' 
                                ? 'bg-green-500/20 text-green-400' 
                                : log.plano_aplicado === 'inativo'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {log.plano_aplicado || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.acao_acesso === 'liberado' 
                                ? 'bg-green-500/20 text-green-400' 
                                : log.acao_acesso === 'cancelado'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {log.acao_acesso || 'N/A'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            {/* Catálogos existentes */}
            {catalogos.length > 0 && (
              <Card className="p-6 glass-card mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-primary" />

                  Catálogos por Veículo ({catalogos.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catalogos.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-semibold text-sm">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.count.toLocaleString()} peças</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Catálogo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Excluir o catálogo <strong>{cat.name}</strong> com {cat.count} peças? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCatalog(cat.name)} className="bg-destructive text-destructive-foreground">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Upload novo catálogo */}
            <Card className="p-6 glass-card">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-primary" />
                Importar Catálogo de Veículo
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Suba uma planilha CSV por veículo (colunas: Código, Produto, Fornecedor, Aplicação). Cada planilha gera um catálogo individual.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Nome do Catálogo (Veículo) *</label>
                    <input
                      type="text"
                      placeholder="Ex: Ford Ka, Chevrolet Onix..."
                      value={catalogName}
                      onChange={e => setCatalogName(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Se já existe</label>
                    <select
                      value={importMode}
                      onChange={e => setImportMode(e.target.value as 'replace' | 'merge')}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="replace">Substituir catálogo</option>
                      <option value="merge">Mesclar (adicionar)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      importingParts || !catalogName.trim()
                        ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {importingParts ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {importingParts ? 'Importando...' : 'Selecionar CSV'}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={importingParts || !catalogName.trim()}
                    />
                  </label>
                </div>
              </div>

              {importProgress && (
                <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
                  {importProgress}
                </div>
              )}
            </Card>

            <PartImageUploader />

            <AdminPartsManager />
          </TabsContent>


          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Header with Refresh Button */}
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

              {/* Usage Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usageMetrics.map((metric, index) => (
                  <Card key={index} className="p-6 glass-card hover:border-primary/30 transition-colors">
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

              {/* Cost Estimation Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Estimativa de Custos</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Baseado no seu uso atual, veja em qual faixa sua plataforma se encaixa:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {costTiers.map((tier, index) => (
                    <Card 
                      key={index} 
                      className={`p-6 glass-card transition-all ${
                        tier.isCurrentTier 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'hover:border-border'
                      }`}
                    >
                      {tier.isCurrentTier && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary mb-3">
                          <Activity className="w-3 h-3" />
                          Faixa Atual
                        </div>
                      )}
                      <h3 className="text-lg font-bold">{tier.tier}</h3>
                      <p className="text-2xl font-bold text-primary mt-2">{tier.monthlyEstimate}</p>
                      <ul className="mt-4 space-y-2">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Database className="w-3 h-3 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Usage Tips */}
              <Card className="p-6 glass-card">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Dicas de Otimização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Rate Limiting Ativo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Limite de 10 requisições/minuto por usuário ajuda a manter custos baixos.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Cache de Respostas</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Respostas similares são cacheadas para reduzir chamadas à IA.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Escalabilidade Automática</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A infraestrutura escala automaticamente conforme a demanda.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="font-medium">Monitoramento em Tempo Real</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acompanhe o uso nesta página para antecipar necessidades.
                    </p>
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

export default Admin;
