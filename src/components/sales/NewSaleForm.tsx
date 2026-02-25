import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Send, CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/hooks/useSalesData';
import type { Part } from '@/hooks/usePartsDatabase';
import { PartSearchInline } from './PartSearchInline';

interface SaleItemDraft {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  quantidade: number;
  preco_unitario: number;
}

interface NewSaleFormProps {
  customers: Customer[];
  parts?: Part[];
  onAddCustomer: (data: { name: string; phone?: string }) => Promise<any>;
  onCreateSale: (data: any) => Promise<any>;
  onDone: () => void;
}

export function NewSaleForm({ customers, parts = [], onAddCustomer, onCreateSale, onDone }: NewSaleFormProps) {
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState('balcao');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<SaleItemDraft[]>([
    { id: crypto.randomUUID(), codigo: '', produto: '', fornecedor: '', quantidade: 1, preco_unitario: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), codigo: '', produto: '', fornecedor: '', quantidade: 1, preco_unitario: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: string, value: any) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const subtotal = items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
  const total = Math.max(subtotal - discount, 0);

  const handleSave = async () => {
    const validItems = items.filter(i => i.codigo.trim() && i.preco_unitario > 0);
    if (validItems.length === 0) { toast.error('Adicione pelo menos 1 item com código e preço'); return; }

    setSaving(true);
    const selectedCustomer = customers.find(c => c.id === customerId);

    const sale = await onCreateSale({
      customer_id: customerId || undefined,
      customer_name: selectedCustomer?.name || customerName || 'Cliente balcão',
      channel,
      notes,
      discount,
      items: validItems.map(i => ({ codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor, quantidade: i.quantidade, preco_unitario: i.preco_unitario })),
    });

    setSaving(false);
    if (sale) {
      // Send via WhatsApp if channel is whatsapp
      if (channel === 'whatsapp') {
        const phone = selectedCustomer?.phone;
        const lines = validItems.map((item, idx) => `${idx + 1}. ${item.codigo} - ${item.produto}\n   Qtde: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}`);
        const text = `*VENDA CONFIRMADA*\n\n${lines.join('\n\n')}\n${discount > 0 ? `\nDesconto: R$ ${discount.toFixed(2)}` : ''}\n\n*TOTAL: R$ ${total.toFixed(2)}*`;
        const url = phone
          ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
      onDone();
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustName.trim()) return;
    const result = await onAddCustomer({ name: newCustName, phone: newCustPhone || undefined });
    if (result) {
      setCustomerId(result.id);
      setShowNewCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg">Nova Venda</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Cliente</label>
            <div className="flex gap-2">
              <Select value={customerId} onValueChange={v => { setCustomerId(v); const c = customers.find(x => x.id === v); if (c) setCustomerName(c.name); }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowNewCustomer(prev => !prev)}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            {!customerId && (
              <Input className="mt-2" placeholder="Ou digite o nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Canal</label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balcao">Balcão</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showNewCustomer && (
          <Card className="p-3 border-dashed space-y-2">
            <p className="text-xs font-medium">Novo cliente rápido</p>
            <Input placeholder="Nome" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
            <Input placeholder="WhatsApp (opcional)" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} />
            <Button size="sm" onClick={handleAddCustomer}>
              <Plus className="w-3 h-3 mr-1" /> Salvar cliente
            </Button>
          </Card>
        )}
      </Card>

      {/* Parts Search */}
      {parts.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">🔍 Consultar Peças</h3>
          <PartSearchInline
            parts={parts}
            onAddPart={(part) => {
              setItems(prev => [...prev, {
                id: crypto.randomUUID(),
                codigo: part.fabricante,
                produto: part.produto,
                fornecedor: part.fornecedor,
                quantidade: 1,
                preco_unitario: 0,
              }]);
              toast.success(`${part.fabricante} adicionado ao pedido`);
            }}
          />
        </Card>
      )}

      {/* Items */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Itens</h3>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar manual
          </Button>
        </div>

        {items.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Item {idx + 1}</span>
              {items.length > 1 && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Código" value={item.codigo} onChange={e => updateItem(item.id, 'codigo', e.target.value)} />
              <Input placeholder="Produto" value={item.produto} onChange={e => updateItem(item.id, 'produto', e.target.value)} />
              <Input placeholder="Fornecedor" value={item.fornecedor} onChange={e => updateItem(item.id, 'fornecedor', e.target.value)} />
              <div className="flex gap-2">
                <Input type="number" min={1} placeholder="Qtde" value={item.quantidade} onChange={e => updateItem(item.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))} />
                <Input type="number" min={0} step={0.01} placeholder="Preço" value={item.preco_unitario || ''} onChange={e => updateItem(item.id, 'preco_unitario', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Summary */}
      <Card className="p-4 space-y-3">
        <Textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Desconto (R$)</label>
            <Input type="number" min={0} step={0.01} value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary">{fmt(total)}</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-bold text-base gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
          {channel === 'whatsapp' ? <Send className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? 'Salvando...' : channel === 'whatsapp' ? 'Finalizar e Enviar WhatsApp' : 'Finalizar Venda'}
        </Button>
      </Card>
    </div>
  );
}
