import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCpfCnpj } from '@/features/pre-registration/format';
import * as XLSX from 'xlsx';

interface Props {
  userId: string;
  onImported: () => void;
}

interface ImportRow {
  name: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  endereco?: string;
  empresa?: string;
  comprador?: string;
  limite_credito?: number;
  notes?: string;
  valid: boolean;
  errors: string[];
}

function validateCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return validateCpf(digits);
  if (digits.length === 14) return validateCnpj(digits);
  return false;
}

function validateCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(cpf[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(cpf[10]) === check;
}

function validateCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cnpj[i]) * weights1[i];
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cnpj[12]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cnpj[i]) * weights2[i];
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cnpj[13]) === check;
}

function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
    'nome': 'name', 'name': 'name', 'cliente': 'name', 'razao social': 'name', 'razão social': 'name',
    'telefone': 'phone', 'phone': 'phone', 'tel': 'phone', 'fone': 'phone',
    'email': 'email', 'e-mail': 'email',
    'whatsapp': 'whatsapp', 'wpp': 'whatsapp', 'zap': 'whatsapp',
    'cpf': 'cpf_cnpj', 'cnpj': 'cpf_cnpj', 'cpf/cnpj': 'cpf_cnpj', 'cpf_cnpj': 'cpf_cnpj', 'documento': 'cpf_cnpj',
    'inscricao estadual': 'inscricao_estadual', 'inscricao_estadual': 'inscricao_estadual', 'ie': 'inscricao_estadual',
    'endereco': 'endereco', 'endereço': 'endereco', 'address': 'endereco',
    'empresa': 'empresa', 'company': 'empresa', 'fantasia': 'empresa', 'nome fantasia': 'empresa',
    'comprador': 'comprador', 'buyer': 'comprador', 'responsavel': 'comprador', 'responsável': 'comprador',
    'limite': 'limite_credito', 'limite credito': 'limite_credito', 'limite_credito': 'limite_credito', 'credit limit': 'limite_credito',
    'observacoes': 'notes', 'observações': 'notes', 'obs': 'notes', 'notes': 'notes', 'notas': 'notes',
  };
  return map[h.toLowerCase().trim()] || '';
}

export function CustomerImporter({ userId, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (json.length === 0) { toast.error('Planilha vazia'); return; }

        // Map headers
        const sampleHeaders = Object.keys(json[0]);
        const headerMap: Record<string, string> = {};
        sampleHeaders.forEach(h => {
          const mapped = normalizeHeader(h);
          if (mapped) headerMap[h] = mapped;
        });

        if (!Object.values(headerMap).includes('name')) {
          toast.error('Coluna "Nome" não encontrada. Verifique os cabeçalhos da planilha.');
          return;
        }

        const parsed: ImportRow[] = json.map((row) => {
          const mapped: Record<string, any> = {};
          Object.entries(row).forEach(([key, val]) => {
            const field = headerMap[key];
            if (field) mapped[field] = String(val || '').trim();
          });

          const errors: string[] = [];
          if (!mapped.name) errors.push('Nome obrigatório');

          // Validate and format CPF/CNPJ
          if (mapped.cpf_cnpj) {
            const digits = String(mapped.cpf_cnpj).replace(/\D/g, '');
            if (digits.length > 0 && !validateCpfCnpj(digits)) {
              errors.push('CPF/CNPJ inválido');
            } else if (digits.length > 0) {
              mapped.cpf_cnpj = formatCpfCnpj(digits);
            }
          }

          if (mapped.limite_credito) {
            const num = parseFloat(String(mapped.limite_credito).replace(',', '.'));
            mapped.limite_credito = isNaN(num) ? undefined : num;
          }

          return {
            name: mapped.name || '',
            phone: mapped.phone,
            email: mapped.email,
            whatsapp: mapped.whatsapp,
            cpf_cnpj: mapped.cpf_cnpj,
            inscricao_estadual: mapped.inscricao_estadual,
            endereco: mapped.endereco,
            empresa: mapped.empresa,
            comprador: mapped.comprador,
            limite_credito: mapped.limite_credito,
            notes: mapped.notes,
            valid: errors.length === 0,
            errors,
          };
        });

        setRows(parsed);
        setShowPreview(true);
      } catch (err) {
        toast.error('Erro ao ler o arquivo');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleImport = async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) { toast.error('Nenhum registro válido para importar'); return; }

    setImporting(true);
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(r => ({
        user_id: userId,
        name: r.name,
        phone: r.phone || null,
        email: r.email || null,
        whatsapp: r.whatsapp || null,
        cpf_cnpj: r.cpf_cnpj || null,
        inscricao_estadual: r.inscricao_estadual || null,
        endereco: r.endereco || null,
        empresa: r.empresa || null,
        comprador: r.comprador || null,
        limite_credito: r.limite_credito || null,
        notes: r.notes || null,
      }));

      const { error } = await supabase.from('customers').insert(batch);
      if (error) {
        toast.error(`Erro no lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        imported += batch.length;
      }
    }

    setImporting(false);
    setShowPreview(false);
    setRows([]);
    toast.success(`${imported} clientes importados com sucesso!`);
    onImported();
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
        <Upload className="w-3.5 h-3.5" />
        Importar Excel
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      <Dialog open={showPreview} onOpenChange={v => { if (!v) { setShowPreview(false); setRows([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importar Clientes — {fileName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-3 mb-3">
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="w-3 h-3" /> {validCount} válidos
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> {invalidCount} com erros
              </Badge>
            )}
            <Badge variant="secondary">{rows.length} total</Badge>
          </div>

          <Card className="overflow-hidden">
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i} className={!r.valid ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{r.name || '—'}</TableCell>
                      <TableCell className="text-xs">{r.cpf_cnpj || '—'}</TableCell>
                      <TableCell className="text-xs">{r.phone || r.whatsapp || '—'}</TableCell>
                      <TableCell className="text-xs">{r.empresa || '—'}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <span className="text-[10px] text-destructive">{r.errors.join(', ')}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {rows.length > 100 && (
            <p className="text-xs text-muted-foreground text-center">Mostrando 100 de {rows.length} registros</p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => { setShowPreview(false); setRows([]); }}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importando...' : `Importar ${validCount} clientes`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
