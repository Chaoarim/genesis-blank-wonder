import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Send, CheckCircle, UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/hooks/useSalesData';
import { InventorySearchInline } from './InventorySearchInline';

interface SaleItemDraft {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  quantidade: number;
  preco_unitario: number;
}

interface NewSaleFormProps {
  customers: Customer[];
  parts?: any[];
  onAddCustomer: (data: { name: string; phone?: string }) => Promise<any>;
  onCreateSale: (data: any) => Promise<any>;
  onDone: () => void;
}

export function NewSaleForm({ customers, onAddCustomer, onCreateSale, onDone }: NewSaleFormProps) {
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState('balcao');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<SaleItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItemQty = useCallback((id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantidade: Math.max(1, qty) } : i));
  }, []);

  const subtotal = items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
  const total = Math.max(subtotal - discount, 0);

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Adicione pelo menos 1 item do estoque'); return; }

    setSaving(true);
    const selectedCustomer = customers.find(c => c.id === customerId);

    const sale = await onCreateSale({
      customer_id: customerId || undefined,
      customer_name: selectedCustomer?.name || customerName || 'Cliente balcão',
      channel,
      notes,
      discount,
      items: items.map(i => ({ codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor, quantidade: i.quantidade, preco_unitario: i.preco_unitario })),
    });

    setSaving(false);
    if (sale) {
      if (channel === 'whatsapp') {
        const phone = selectedCustomer?.phone;
        const lines = items.map((item, idx) => `${idx + 1}. ${item.codigo} - ${item.produto}\n   Qtde: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}`);
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

      {/* Inventory Search */}
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">🔍 Consultar Estoque</h3>
      <InventorySearchInline
          onAddItem={(item, precoRevenda) => {
            setItems(prev => {
              const existing = prev.find(i => i.codigo === item.codigo);
              if (existing) {
                toast.error(`${item.codigo} já está no pedido. Ajuste a quantidade se necessário.`);
                return prev;
              }
              toast.success(`${item.codigo} adicionado ao pedido`);
              return [...prev, {
                id: crypto.randomUUID(),
                codigo: item.codigo,
                produto: item.produto,
                fornecedor: item.fornecedor,
                aplicacao: item.aplicacao,
                quantidade: 1,
                preco_unitario: Math.round(precoRevenda * 100) / 100,
              }];
            });
          }}
        />
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Itens do Pedido ({items.length})</h3>

          {items.map((item, idx) => (
            <div key={item.id} className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Item {idx + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono font-bold text-primary">{item.codigo}</span>
                <span className="truncate">{item.produto}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.fornecedor}{item.aplicacao ? ` • ${item.aplicacao}` : ''}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">Qtde:</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={e => updateItemQty(item.id, parseInt(e.target.value) || 1)}
                    className="w-16 h-7 text-center text-xs"
                  />
                </div>
                <span className="text-sm font-bold text-primary">{fmt(item.preco_unitario)} /un</span>
                <span className="text-sm font-bold ml-auto">{fmt(item.quantidade * item.preco_unitario)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

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

        <Button onClick={handleSave} disabled={saving || items.length === 0} className="w-full h-12 font-bold text-base gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
          {channel === 'whatsapp' ? <Send className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? 'Salvando...' : channel === 'whatsapp' ? 'Finalizar e Enviar WhatsApp' : 'Finalizar Venda'}
        </Button>
      </Card>
    </div>
  );
}
