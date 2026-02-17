import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, LogOut, RefreshCw, Loader2, CheckCircle, XCircle, Clock, DollarSign, Save, Calendar, Search, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface UserSubscription {
  id: string;
  email: string;
  user_id: string | null;
  plan: string | null;
  status: "active" | "inactive" | "cancelled" | "pending" | null;
  started_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  kiwify_customer_id: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string;
}

type StatusFilter = "all" | "active" | "inactive" | "pending";

const PaymentControl = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [savingExpiry, setSavingExpiry] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("payment-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_subscriptions" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

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
  };

  const fetchData = async () => {
    setLoadingData(true);
    
    // Buscar assinaturas
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (subError) {
      if (import.meta.env.DEV) {
        console.error("Erro ao buscar assinaturas:", subError);
      }
      toast.error("Erro ao carregar assinaturas");
    } else {
      setSubscriptions((subData || []) as UserSubscription[]);
      // Inicializar notas editáveis
      const notes: { [key: string]: string } = {};
      (subData || []).forEach(sub => {
        notes[sub.id] = sub.notes || "";
      });
      setEditingNotes(notes);
    }

    // Buscar perfis para obter nomes
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email');

    if (!profileError) {
      setProfiles(profileData || []);
    }
    
    setLoadingData(false);
  };

  const getProfileName = (userId: string | null, email: string) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || null;
  };

  const handleSaveNotes = async (subscriptionId: string) => {
    setSavingNotes(subscriptionId);
    
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ notes: editingNotes[subscriptionId] || null })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success("Observação salva com sucesso!");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao salvar observação:", error);
      }
      toast.error("Erro ao salvar observação");
    } finally {
      setSavingNotes(null);
    }
  };

  const handleSaveExpiryDate = async (subscriptionId: string, date: Date | undefined) => {
    setSavingExpiry(subscriptionId);
    
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ expires_at: date ? date.toISOString() : null })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Atualizar localmente
      setSubscriptions(prev => prev.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, expires_at: date ? date.toISOString() : null }
          : sub
      ));
      
      toast.success("Data de expiração atualizada!");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao salvar data:", error);
      }
      toast.error("Erro ao salvar data de expiração");
    } finally {
      setSavingExpiry(null);
    }
  };

  const handleSaveStatus = async (subscriptionId: string, newStatus: "active" | "inactive" | "pending") => {
    setSavingStatus(subscriptionId);
    
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: newStatus,
          started_at: newStatus === 'active' ? new Date().toISOString() : undefined
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Atualizar localmente
      setSubscriptions(prev => prev.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, status: newStatus, started_at: newStatus === 'active' ? new Date().toISOString() : sub.started_at }
          : sub
      ));
      
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao salvar status:", error);
      }
      toast.error("Erro ao atualizar status");
    } finally {
      setSavingStatus(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Ativo
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
            <Clock className="w-3 h-3" />
            Inativo
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
            <Clock className="w-3 h-3" />
            {status || "Desconhecido"}
          </span>
        );
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const name = getProfileName(sub.user_id, sub.email) || "";
    const searchLower = searchTerm.toLowerCase();
    
    // Filtro por texto
    const matchesSearch = (
      sub.email.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower) ||
      (sub.plan || "").toLowerCase().includes(searchLower)
    );
    
    // Filtro por status
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    inactive: subscriptions.filter(s => s.status === 'inactive').length,
    pending: subscriptions.filter(s => s.status === 'pending').length
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Controle de Pagamentos</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
            >
              <Shield className="w-4 h-4 mr-1" />
              Admin
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards - Clickable Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
              statusFilter === "all" 
                ? "bg-primary/20 border-primary ring-2 ring-primary" 
                : "bg-card/50 border-border hover:bg-card/80"
            }`}
            onClick={() => setStatusFilter("all")}
          >
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total de Assinaturas</div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
              statusFilter === "active" 
                ? "bg-green-500/30 border-green-500 ring-2 ring-green-500" 
                : "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
            }`}
            onClick={() => setStatusFilter("active")}
          >
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-sm text-green-400/80">Ativos</div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
              statusFilter === "inactive" 
                ? "bg-orange-500/30 border-orange-500 ring-2 ring-orange-500" 
                : "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20"
            }`}
            onClick={() => setStatusFilter("inactive")}
          >
            <div className="text-2xl font-bold text-orange-400">{stats.inactive}</div>
            <div className="text-sm text-orange-400/80">Inativos</div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer transition-all hover:scale-105 ${
              statusFilter === "pending" 
                ? "bg-yellow-500/30 border-yellow-500 ring-2 ring-yellow-500" 
                : "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
            }`}
            onClick={() => setStatusFilter("pending")}
          >
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-yellow-400/80">Pendentes</div>
          </Card>
        </div>

        {/* Search and Refresh */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loadingData}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-card/50 border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="min-w-[300px]">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhum resultado encontrado" : "Nenhuma assinatura encontrada"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const name = getProfileName(sub.user_id, sub.email);
                    return (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell>
                          <div>
                            {name && <div className="font-medium">{name}</div>}
                            <div className={name ? "text-sm text-muted-foreground" : "font-medium"}>
                              {sub.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{sub.plan || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub.status || "inactive"}
                            onValueChange={(value: "active" | "inactive" | "pending") => handleSaveStatus(sub.id, value)}
                            disabled={savingStatus === sub.id}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              {savingStatus === sub.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">
                                <span className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="w-3 h-3" />
                                  Ativo
                                </span>
                              </SelectItem>
                              <SelectItem value="inactive">
                                <span className="flex items-center gap-1 text-orange-400">
                                  <Clock className="w-3 h-3" />
                                  Inativo
                                </span>
                              </SelectItem>
                              <SelectItem value="pending">
                                <span className="flex items-center gap-1 text-yellow-400">
                                  <Clock className="w-3 h-3" />
                                  Pendente
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.started_at
                            ? format(new Date(sub.started_at), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 hover:bg-muted"
                                disabled={savingExpiry === sub.id}
                              >
                                {savingExpiry === sub.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : sub.expires_at ? (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(sub.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    Definir
                                  </span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={sub.expires_at ? new Date(sub.expires_at) : undefined}
                                onSelect={(date) => handleSaveExpiryDate(sub.id, date)}
                                initialFocus
                                className="pointer-events-auto"
                              />
                              {sub.expires_at && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-destructive hover:text-destructive"
                                    onClick={() => handleSaveExpiryDate(sub.id, undefined)}
                                  >
                                    Remover data
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Textarea
                              placeholder="Adicionar observação..."
                              value={editingNotes[sub.id] || ""}
                              onChange={(e) => setEditingNotes(prev => ({
                                ...prev,
                                [sub.id]: e.target.value
                              }))}
                              className="min-h-[60px] text-sm resize-none"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveNotes(sub.id)}
                              disabled={savingNotes === sub.id}
                              className="shrink-0"
                            >
                              {savingNotes === sub.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default PaymentControl;