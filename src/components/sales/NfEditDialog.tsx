import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

const NF_STATUS_MAP: Record<string, { label: string; color: string }> = {
  sem_nf: { label: 'Sem NF', color: 'bg-muted text-muted-foreground' },
  pendente: { label: 'NF Pendente', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  emitida: { label: 'NF Emitida', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
};

interface Props {
  saleId: string;
  nfNumero: string | null;
  nfSerie: string | null;
  nfChave: string | null;
  nfStatus: string;
  onUpdated: (saleId: string, data: { nf_numero: string | null; nf_serie: string | null; nf_chave: string | null; nf_status: string }) => void;
}

export function NfStatusBadge({ status }: { status: string }) {
  const info = NF_STATUS_MAP[status] || NF_STATUS_MAP.sem_nf;
  return <Badge className={`${info.color} border-0 text-[9px]`}>{info.label}</Badge>;
}

export { NF_STATUS_MAP };

export function NfEditDialog({ saleId, nfNumero, nfSerie, nfChave, nfStatus, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState(nfNumero || '');
  const [serie, setSerie] = useState(nfSerie || '');
  const [chave, setChave] = useState(nfChave || '');
  const [status, setStatus] = useState(nfStatus || 'sem_nf');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      nf_numero: numero.trim() || null,
      nf_serie: serie.trim() || null,
      nf_chave: chave.trim() || null,
      nf_status: status,
      updated_at: new Date().toISOString(),
    };

    // Validate chave format if provided
    if (data.nf_chave && data.nf_chave.length !== 44) {
      toast.error('A chave de acesso deve ter 44 dígitos');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('sales').update(data).eq('id', saleId);
    if (error) {
      toast.error('Erro ao salvar dados da NF');
    } else {
      toast.success('Dados da NF atualizados');
      onUpdated(saleId, { nf_numero: data.nf_numero, nf_serie: data.nf_serie, nf_chave: data.nf_chave, nf_status: data.nf_status });
      setOpen(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (o) { setNumero(nfNumero || ''); setSerie(nfSerie || ''); setChave(nfChave || ''); setStatus(nfStatus || 'sem_nf'); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <FileText className="w-3 h-3" /> NF-e
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Nota Fiscal — Venda #{saleId.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Status da NF</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_nf">Sem NF</SelectItem>
                <SelectItem value="pendente">NF Pendente</SelectItem>
                <SelectItem value="emitida">NF Emitida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número da NF</Label>
              <Input placeholder="Ex: 001234" value={numero} onChange={e => setNumero(e.target.value)} maxLength={20} />
            </div>
            <div>
              <Label>Série</Label>
              <Input placeholder="Ex: 1" value={serie} onChange={e => setSerie(e.target.value)} maxLength={5} />
            </div>
          </div>

          <div>
            <Label>Chave de Acesso (44 dígitos)</Label>
            <Input
              placeholder="Chave de acesso da NF-e"
              value={chave}
              onChange={e => setChave(e.target.value.replace(/\D/g, '').slice(0, 44))}
              maxLength={44}
              className="font-mono text-xs"
            />
            {chave && chave.length !== 44 && (
              <p className="text-[10px] text-amber-600 mt-1">{chave.length}/44 dígitos</p>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar dados da NF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
