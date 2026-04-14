import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Download, Loader2, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BackupExcelDownloadProps {
  adminUserId: string | null;
}

const TABLES_CONFIG = [
  { table: 'sales', label: 'Vendas', columns: { id: 'ID', customer_name: 'Cliente', total: 'Total', discount: 'Desconto', status: 'Status', channel: 'Canal', payment_method: 'Pagamento', delivery_type: 'Entrega', seller_name: 'Vendedor', created_at: 'Data' } },
  { table: 'sale_items', label: 'Itens de Venda', columns: { sale_id: 'Venda ID', codigo: 'Código', produto: 'Produto', fornecedor: 'Fornecedor', quantidade: 'Qtd', preco_unitario: 'Preço Unit.', created_at: 'Data' } },
  { table: 'customers', label: 'Clientes', columns: { code: 'Código', name: 'Nome', phone: 'Telefone', email: 'Email', whatsapp: 'WhatsApp', cpf_cnpj: 'CPF/CNPJ', empresa: 'Empresa', endereco: 'Endereço', limite_credito: 'Limite Crédito', created_at: 'Data Cadastro' } },
  { table: 'inventory_items', label: 'Estoque', columns: { codigo: 'Código', produto: 'Produto', fornecedor: 'Fornecedor', preco: 'Preço', qtd_estoque: 'Qtd Estoque', aplicacao: 'Aplicação', created_at: 'Data' } },
  { table: 'accounts_payable', label: 'Contas a Pagar', columns: { supplier_name: 'Fornecedor', description: 'Descrição', amount: 'Valor', due_date: 'Vencimento', status: 'Status', paid_amount: 'Valor Pago', paid_at: 'Pago Em' } },
  { table: 'supplier_contacts', label: 'Fornecedores', columns: { distributor_name: 'Distribuidora', seller_name: 'Vendedor', phone: 'Telefone', whatsapp: 'WhatsApp', email: 'Email', notes: 'Notas' } },
] as const;

async function fetchAllRows(table: string) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await (supabase
      .from(table as any)
      .select('*')
      .range(from, from + PAGE_SIZE - 1) as any);

    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
    allRows = allRows.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allRows;
}

export function BackupExcelDownload({ adminUserId }: BackupExcelDownloadProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!adminUserId) { toast.error('Usuário não identificado'); return; }
    setLoading(true);

    try {
      const wb = XLSX.utils.book_new();

      for (const config of TABLES_CONFIG) {
        const rows = await fetchAllRows(config.table);
        const mapped = rows.map((row: any) => {
          const obj: Record<string, any> = {};
          for (const [key, label] of Object.entries(config.columns)) {
            obj[label] = row[key] ?? '';
          }
          return obj;
        });

        const ws = XLSX.utils.json_to_sheet(mapped.length > 0 ? mapped : [{}]);
        XLSX.utils.book_append_sheet(wb, ws, config.label);
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      XLSX.writeFile(wb, `backup_${dateStr}.xlsx`);

      toast.success(`Backup exportado com sucesso! ${TABLES_CONFIG.length} abas geradas.`);
    } catch (err: any) {
      console.error('Backup error:', err);
      toast.error(err.message || 'Erro ao gerar backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Backup Manual em Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exporte os dados principais do sistema (vendas, clientes, estoque, contas a pagar e fornecedores) em um arquivo Excel com múltiplas abas.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TABLES_CONFIG.map(t => (
            <div key={t.table} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              {t.label}
            </div>
          ))}
        </div>

        <Button onClick={handleDownload} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'Gerando backup...' : 'Baixar Backup em Excel'}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          O backup automático em JSON também roda semanalmente no servidor.
        </p>
      </CardContent>
    </Card>
  );
}
