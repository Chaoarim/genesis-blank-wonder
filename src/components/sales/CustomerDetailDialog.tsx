import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Printer, FileDown, Building2, MapPin, CreditCard, Phone, Mail, MessageCircle, ShoppingBag, User, FileText } from 'lucide-react';
import { downloadHtmlAsPdf, printHtml } from '@/lib/htmlToPdf';
import type { Customer, Sale } from '@/hooks/useSalesData';

interface CustomerDetailDialogProps {
  customer: Customer | null;
  sales: Sale[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

function buildHtml(c: Customer, stats: { count: number; total: number; lastSales: Sale[] }) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ficha do Cliente - ${c.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #2563eb; }
  .header .code { font-size: 12px; color: #666; margin-top: 2px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .field label { font-size: 10px; color: #888; text-transform: uppercase; }
  .field p { font-size: 13px; margin-top: 1px; }
  .stats-box { background: #f0f7ff; border-radius: 8px; padding: 12px; display: flex; gap: 24px; }
  .stat { text-align: center; }
  .stat .val { font-size: 20px; font-weight: 700; color: #2563eb; }
  .stat .lbl { font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f3f4f6; padding: 6px 8px; border-bottom: 1px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: center; }
</style></head><body>
<div class="header">
  <h1>${c.name}</h1>
  ${c.code ? `<div class="code">Código: ${c.code}</div>` : ''}
  ${c.empresa ? `<div class="code">${c.empresa}</div>` : ''}
</div>

<div class="section">
  <div class="section-title">Identificação</div>
  <div class="grid">
    ${field('Nome do cliente', c.name)}
    ${field('Comprador', c.comprador)}
    ${field('CPF / CNPJ', c.cpf_cnpj)}
    ${field('Inscrição Estadual', c.inscricao_estadual)}
  </div>
</div>

<div class="section">
  <div class="section-title">Empresa</div>
  <div class="grid">
    ${field('Empresa', c.empresa)}
    ${field('Limite de crédito', c.limite_credito && Number(c.limite_credito) > 0 ? fmt(Number(c.limite_credito)) : '—')}
  </div>
</div>

<div class="section">
  <div class="section-title">Contato</div>
  <div class="grid">
    ${field('Telefone', c.phone)}
    ${field('WhatsApp', c.whatsapp)}
    ${field('E-mail', c.email)}
  </div>
</div>

<div class="section">
  <div class="section-title">Endereço</div>
  <div class="grid">
    ${field('Endereço completo', c.endereco)}
  </div>
</div>

${c.notes ? `<div class="section"><div class="section-title">Observações</div><p>${c.notes}</p></div>` : ''}

<div class="section">
  <div class="section-title">Resumo de Vendas</div>
  <div class="stats-box">
    <div class="stat"><div class="val">${stats.count}</div><div class="lbl">Vendas</div></div>
    <div class="stat"><div class="val">${fmt(stats.total)}</div><div class="lbl">Total</div></div>
  </div>
</div>

${stats.lastSales.length > 0 ? `
<div class="section">
  <div class="section-title">Últimas Vendas</div>
  <table>
    <thead><tr><th>Data</th><th>Valor</th><th>Pagamento</th><th>Status</th></tr></thead>
    <tbody>
      ${stats.lastSales.map(s => `<tr>
        <td>${fmtDate(s.created_at)}</td>
        <td>${fmt(Number(s.total))}</td>
        <td>${s.payment_method}</td>
        <td>${s.status === 'completed' ? 'Concluída' : s.status === 'draft' ? 'Rascunho' : s.status}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body></html>`;
}

function field(label: string, value: string | null | undefined) {
  return `<div class="field"><label>${label}</label><p>${value || '—'}</p></div>`;
}

export function CustomerDetailDialog({ customer, sales, open, onOpenChange }: CustomerDetailDialogProps) {
  if (!customer) return null;

  const c = customer;
  const custSales = sales.filter(s => s.customer_id === c.id && s.status === 'completed');
  const total = custSales.reduce((s, v) => s + Number(v.total), 0);
  const lastSales = sales
    .filter(s => s.customer_id === c.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
  const stats = { count: custSales.length, total, lastSales };

  const html = buildHtml(c, stats);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Ficha do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            {c.code && <Badge variant="outline" className="font-mono text-xs">{c.code}</Badge>}
            <h3 className="text-lg font-semibold">{c.name}</h3>
          </div>

          {/* Identificação */}
          <Section title="Identificação">
            <Field icon={<User className="w-3.5 h-3.5" />} label="Cliente" value={c.name} />
            <Field icon={<User className="w-3.5 h-3.5" />} label="Comprador" value={c.comprador} />
            <Field icon={<CreditCard className="w-3.5 h-3.5" />} label="CPF/CNPJ" value={c.cpf_cnpj} />
            <Field icon={<FileText className="w-3.5 h-3.5" />} label="Inscrição Estadual" value={c.inscricao_estadual} />
          </Section>

          {/* Empresa */}
          <Section title="Empresa">
            <Field icon={<Building2 className="w-3.5 h-3.5" />} label="Empresa" value={c.empresa} />
            <Field icon={<CreditCard className="w-3.5 h-3.5" />} label="Limite de crédito" value={c.limite_credito && Number(c.limite_credito) > 0 ? fmt(Number(c.limite_credito)) : null} />
          </Section>

          {/* Contato */}
          <Section title="Contato">
            <Field icon={<Phone className="w-3.5 h-3.5" />} label="Telefone" value={c.phone} />
            <Field icon={<MessageCircle className="w-3.5 h-3.5" />} label="WhatsApp" value={c.whatsapp} />
            <Field icon={<Mail className="w-3.5 h-3.5" />} label="E-mail" value={c.email} />
          </Section>

          {/* Endereço */}
          <Section title="Endereço">
            <Field icon={<MapPin className="w-3.5 h-3.5" />} label="Endereço" value={c.endereco} />
          </Section>

          {/* Observações */}
          {c.notes && (
            <Section title="Observações">
              <p className="text-sm text-muted-foreground">{c.notes}</p>
            </Section>
          )}

          {/* Stats */}
          <Section title="Resumo de Vendas">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Vendas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{fmt(stats.total)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total</p>
              </div>
            </div>
          </Section>

          {/* Últimas vendas */}
          {lastSales.length > 0 && (
            <Section title="Últimas Vendas">
              <div className="space-y-1">
                {lastSales.map(s => (
                  <div key={s.id} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                    <span>{fmtDate(s.created_at)}</span>
                    <span className="font-medium">{fmt(Number(s.total))}</span>
                    <span className="text-muted-foreground">{s.payment_method}</span>
                    <Badge variant={s.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] h-5">
                      {s.status === 'completed' ? 'Concluída' : s.status === 'draft' ? 'Rascunho' : s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => printHtml(html)}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => downloadHtmlAsPdf(html, `cliente-${c.code || c.name}`)}>
              <FileDown className="w-4 h-4" /> Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground text-xs min-w-[80px]">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
