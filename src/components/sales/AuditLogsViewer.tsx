import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  delete_sale: { label: 'Excluir Venda', color: 'bg-red-500/10 text-red-600 border-red-200' },
  update_price: { label: 'Alterar Preço', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  delete_inventory: { label: 'Excluir Estoque', color: 'bg-red-500/10 text-red-600 border-red-200' },
  update_inventory: { label: 'Atualizar Estoque', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  create_sale: { label: 'Nova Venda', color: 'bg-green-500/10 text-green-600 border-green-200' },
  update_customer: { label: 'Atualizar Cliente', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  delete_customer: { label: 'Excluir Cliente', color: 'bg-red-500/10 text-red-600 border-red-200' },
};

const PAGE_SIZE = 30;

export function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }
      if (search.trim()) {
        query = query.or(`user_email.ilike.%${search}%,entity_id.ilike.%${search}%,action.ilike.%${search}%`);
      }

      const { data, count } = await query;
      setLogs((data as AuditLog[]) || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchLogs();
  }, [page, filterAction, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Logs de Auditoria</h2>
        <Badge variant="secondary" className="text-xs">{total} registros</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="delete_sale">Excluir Venda</SelectItem>
            <SelectItem value="update_price">Alterar Preço</SelectItem>
            <SelectItem value="delete_inventory">Excluir Estoque</SelectItem>
            <SelectItem value="update_inventory">Atualizar Estoque</SelectItem>
            <SelectItem value="create_sale">Nova Venda</SelectItem>
            <SelectItem value="update_customer">Atualizar Cliente</SelectItem>
            <SelectItem value="delete_customer">Excluir Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
              return (
                <Card key={log.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${actionInfo.color}`}>
                          {actionInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.entity_type}
                          {log.entity_id && <span className="ml-1 font-mono text-[10px]">#{log.entity_id.slice(0, 8)}</span>}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.user_email || 'Sistema'}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="text-[11px]">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Detalhes
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto max-h-32">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
