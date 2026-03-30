import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Send, CheckCircle, UserPlus, Plus, Calendar, Package, ArrowLeft, ArrowRight, User, CreditCard, ClipboardCheck, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Customer } from '@/hooks/useSalesData';
import type { SellerUser } from '@/hooks/useSellerPermissions';
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
  adminUserId?: string | null;
  sellerName?: string | null;
  sellerAuthId?: string | null;
  sellers?: SellerUser[];
}

const DELIVERY_OPTIONS = [
  { value: 'retirada', label: 'Retirada' },
  { value: 'moto', label: 'Moto Entrega' },
  { value: 'frota', label: 'Frota Própria' },
  { value: 'transportadora', label: 'Transportadora' },
];

const PAYMENT_OPTIONS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'faturado', label: 'Faturado (Prazo)' },
];

const STEPS = [
  { id: 1, label: 'Cliente', icon: User },
  { id: 2, label: 'Itens', icon: ShoppingCart },
  { id: 3, label: 'Pagamento', icon: CreditCard },
  { id: 4, label: 'Confirmar', icon: ClipboardCheck },
];

export function NewSaleForm({ customers, onAddCustomer, onCreateSale, onDone, adminUserId, sellerName, sellerAuthId, sellers }: NewSaleFormProps) {
  const [step, setStep] = useState(1);

  const getSellerLabel = (sellerAuthIdVal: string | null) => {
    if (!sellerAuthIdVal || !sellers) return '';
    const s = sellers.find(s => s.seller_auth_id === sellerAuthIdVal);
    return s ? ` (${s.name})` : '';
  };

  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [channel, setChannel] = useState('balcao');
  const [deliveryType, setDeliveryType] = useState('retirada');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [paymentDeadline, setPaymentDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<SaleItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      (c as any).code?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      (c as any).empresa?.toLowerCase().includes(q);
  });

  interface TermRule { id: string; name: string; min_amount: number; max_amount: number | null; installments: number; day_intervals: string; }
  const [termRules, setTermRules] = useState<TermRule[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
    supabase.from('payment_term_rules').select('*').order('min_amount').then(({ data }) => {
      if (data) setTermRules(data.map((d: any) => ({ ...d, min_amount: Number(d.min_amount), max_amount: d.max_amount ? Number(d.max_amount) : null })));
    });
  }, []);

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItemQty = useCallback((id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantidade: Math.max(1, qty) } : i));
  }, []);

  const subtotal = items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
  const total = Math.max(subtotal - discount, 0);

  const matchingRules = termRules.filter(r => {
    if (total < r.min_amount) return false;
    if (r.max_amount && total > r.max_amount) return false;
    return true;
  });

  const selectedTerm = termRules.find(r => r.id === selectedTermId);

  const getInstallmentDates = (term: TermRule) => {
    const days = term.day_intervals.split('/').map(d => parseInt(d.trim()));
    const parcela = total / term.installments;
    return days.map((d, i) => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      return { num: i + 1, days: d, date, value: parcela };
    });
  };

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Adicione pelo menos 1 item'); return; }
    setSaving(true);
    const selectedCustomer = customers.find(c => c.id === customerId);

    if (paymentMethod === 'faturado' && selectedCustomer) {
      const creditLimit = Number(selectedCustomer.limite_credito) || 0;
      const needsCreditApproval = creditLimit <= 0 || total > creditLimit;

      if (needsCreditApproval) {
        const sale = await onCreateSale({
          customer_id: customerId || undefined,
          customer_name: selectedCustomer?.name || customerName || customerSearch || 'Cliente balcão',
          channel,
          delivery_type: deliveryType,
          payment_method: paymentMethod,
          payment_deadline: paymentMethod === 'faturado' && paymentDeadline ? paymentDeadline : undefined,
          seller_auth_id: sellerAuthId || undefined,
          seller_name: sellerName || undefined,
          notes: `[AGUARDANDO CRÉDITO] ${notes}`,
          discount,
          items: items.map(i => ({ codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor, quantidade: i.quantidade, preco_unitario: i.preco_unitario })),
        });

        if (sale) {
          await supabase.from('sales').update({ status: 'pending_credit' }).eq('id', sale.id);
          await supabase.from('credit_approvals').insert({
            user_id: sale.user_id,
            sale_id: sale.id,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            sale_total: total,
            credit_limit: creditLimit,
          });
          const msg = creditLimit <= 0
            ? `Cliente sem limite de crédito. Pedido de R$ ${total.toFixed(2)} enviado para Análise de Crédito.`
            : `Pedido de R$ ${total.toFixed(2)} excede o limite de R$ ${creditLimit.toFixed(2)}. Enviado para Análise de Crédito.`;
          toast.warning(msg, { duration: 6000 });
        }
        setSaving(false);
        if (sale) onDone();
        return;
      }
    }

    const sale = await onCreateSale({
      customer_id: customerId || undefined,
      customer_name: selectedCustomer?.name || customerName || customerSearch || 'Cliente balcão',
      channel,
      delivery_type: deliveryType,
      payment_method: paymentMethod,
      payment_deadline: paymentMethod === 'faturado' && paymentDeadline ? paymentDeadline : undefined,
      seller_auth_id: sellerAuthId || undefined,
      seller_name: sellerName || undefined,
      notes,
      discount,
      items: items.map(i => ({ codigo: i.codigo, produto: i.produto, fornecedor: i.fornecedor, quantidade: i.quantidade, preco_unitario: i.preco_unitario })),
    });

    setSaving(false);
    if (sale) {
      if (channel === 'whatsapp') {
        const phone = selectedCustomer?.phone;
        const deliveryLabel = DELIVERY_OPTIONS.find(d => d.value === deliveryType)?.label || deliveryType;
        const paymentLabel = PAYMENT_OPTIONS.find(p => p.value === paymentMethod)?.label || paymentMethod;
        const lines = items.map((item, idx) => `${idx + 1}. ${item.codigo} - ${item.produto}\n   Qtde: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}`);
        let prazoText = '';
        if (paymentMethod === 'faturado' && selectedTerm && total > 0) {
          const instDates = getInstallmentDates(selectedTerm);
          prazoText = `\n📅 *Faturamento ${selectedTerm.installments}x:*\n` + instDates.map(inst => `   ${inst.num}ª parcela: ${inst.date.toLocaleDateString('pt-BR')} — R$ ${inst.value.toFixed(2)}`).join('\n');
        } else if (paymentMethod === 'faturado' && paymentDeadline) {
          prazoText = `\n📅 Prazo: ${new Date(paymentDeadline).toLocaleDateString('pt-BR')}`;
        }
        const text = `*VENDA CONFIRMADA*\n\n${lines.join('\n\n')}\n${discount > 0 ? `\nDesconto: R$ ${discount.toFixed(2)}` : ''}\n\n*TOTAL: R$ ${total.toFixed(2)}*\n\n📦 Entrega: ${deliveryLabel}\n💳 Pagamento: ${paymentLabel}${prazoText}`;
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

  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerDisplayName = selectedCustomer?.name || customerName || customerSearch || 'Cliente balcão';

  const canAdvanceFromStep = (s: number) => {
    if (s === 2 && items.length === 0) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => {
                  if (isCompleted) setStep(s.id);
                }}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive
                    ? 'text-primary scale-105'
                    : isCompleted
                      ? 'text-primary/70 cursor-pointer hover:text-primary'
                      : 'text-muted-foreground/50'
                }`}
                disabled={!isCompleted && !isActive}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : isCompleted
                      ? 'border-primary/70 bg-primary/5'
                      : 'border-muted-foreground/30 bg-muted/30'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-medium hidden sm:block">{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 rounded-full transition-colors ${
                  step > s.id ? 'bg-primary/50' : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Cliente */}
      {step === 1 && (
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Escolher Cliente
          </h3>

          <div>
            <label className="text-xs text-muted-foreground">Cliente</label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={customerDropdownRef}>
                <Input
                  placeholder="Buscar cliente por nome, código, telefone..."
                  value={customerId ? `${(selectedCustomer as any)?.code ? (selectedCustomer as any).code + ' - ' : ''}${selectedCustomer?.name || ''}` : customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setCustomerId('');
                    setCustomerName('');
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                {customerId && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => { setCustomerId(''); setCustomerName(''); setCustomerSearch(''); }}
                  >
                    ✕
                  </button>
                )}
                {showCustomerDropdown && !customerId && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {filteredCustomers.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">Nenhum cliente encontrado</p>
                    ) : (
                      filteredCustomers.slice(0, 50).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerName(c.name);
                            setCustomerSearch('');
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <span className="font-medium">{(c as any).code ? `${(c as any).code} - ` : ''}{c.name}</span>
                          {getSellerLabel(c.seller_auth_id)}
                          {c.phone && <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowNewCustomer(prev => !prev)}>
                <UserPlus className="w-4 h-4" />
              </Button>
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

          {customerId && selectedCustomer && (
            <Card className="p-3 bg-primary/5 border-primary/20 space-y-1">
              <p className="text-sm font-semibold">{(selectedCustomer as any).code ? `${(selectedCustomer as any).code} - ` : ''}{selectedCustomer.name}</p>
              {selectedCustomer.phone && <p className="text-xs text-muted-foreground">📱 {selectedCustomer.phone}</p>}
              {(selectedCustomer as any).empresa && <p className="text-xs text-muted-foreground">🏢 {(selectedCustomer as any).empresa}</p>}
              {Number(selectedCustomer.limite_credito) > 0 && (
                <p className="text-xs text-muted-foreground">💳 Limite: {fmt(Number(selectedCustomer.limite_credito))}</p>
              )}
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            💡 Se não selecionar um cliente, será registrado como "Cliente balcão" com o texto digitado.
          </p>
        </Card>
      )}

      {/* Step 2: Itens */}
      {step === 2 && (
        <>
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Adicionar Itens
            </h3>

            <h4 className="font-semibold text-sm">🔍 Consultar Estoque</h4>
            <InventorySearchInline
              adminUserId={adminUserId}
              onAddItem={(item, precoRevenda) => {
                setItems(prev => {
                  const existing = prev.find(i => i.codigo === item.codigo);
                  if (existing) {
                    toast.error(`${item.codigo} já está no pedido.`);
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

          {items.length > 0 && (
            <Card className="p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                Itens do Pedido
                <Badge variant="secondary">{items.length}</Badge>
              </h4>

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

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold text-primary">{fmt(subtotal)}</span>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Step 3: Pagamento */}
      {step === 3 && (
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pagamento e Entrega
          </h3>

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Canal</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balcao">Balcão</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">📦 Entrega</label>
              <Select value={deliveryType} onValueChange={setDeliveryType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DELIVERY_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">💳 Pagamento</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentMethod === 'faturado' && (
            <div className="space-y-3">
              {matchingRules.length > 0 ? (
                <>
                  <label className="text-xs text-muted-foreground font-medium">📅 Selecione o prazo de faturamento</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchingRules.map(rule => (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => {
                          setSelectedTermId(rule.id);
                          const days = rule.day_intervals.split('/').map(d => parseInt(d.trim()));
                          const lastDay = Math.max(...days);
                          const deadline = new Date();
                          deadline.setDate(deadline.getDate() + lastDay);
                          setPaymentDeadline(deadline.toISOString().split('T')[0]);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedTermId === rule.id
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="text-sm font-semibold">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">{rule.installments}x — {rule.day_intervals} dias</p>
                      </button>
                    ))}
                  </div>

                  {selectedTerm && total > 0 && (
                    <Card className="p-3 bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Parcelas
                      </p>
                      {getInstallmentDates(selectedTerm).map(inst => (
                        <div key={inst.num} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{inst.num}ª</Badge>
                            <span className="text-muted-foreground">{inst.date.toLocaleDateString('pt-BR')} ({inst.days} dias)</span>
                          </div>
                          <span className="font-bold text-primary">{fmt(inst.value)}</span>
                        </div>
                      ))}
                    </Card>
                  )}
                </>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground">📅 Prazo do Faturamento (manual)</label>
                  <Input type="date" value={paymentDeadline} onChange={e => setPaymentDeadline(e.target.value)} />
                  {total > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Nenhuma regra de prazo configurada para este valor. Use a aba "Prazos" para criar regras.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Step 4: Confirmar */}
      {step === 4 && (
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Resumo do Pedido
          </h3>

          {/* Customer */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
            <p className="text-sm font-medium">{customerDisplayName}</p>
            {selectedCustomer?.phone && <p className="text-xs text-muted-foreground">📱 {selectedCustomer.phone}</p>}
          </div>

          {/* Items summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Itens ({items.length})</p>
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs font-bold text-primary">{item.codigo}</span>
                  <span className="ml-2 truncate">{item.produto}</span>
                  <span className="text-xs text-muted-foreground ml-1">x{item.quantidade}</span>
                </div>
                <span className="font-bold ml-2 shrink-0">{fmt(item.quantidade * item.preco_unitario)}</span>
              </div>
            ))}
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground">Canal</p>
              <p className="font-medium">{channel === 'whatsapp' ? 'WhatsApp' : 'Balcão'}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground">Entrega</p>
              <p className="font-medium">{DELIVERY_OPTIONS.find(d => d.value === deliveryType)?.label}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground">Pagamento</p>
              <p className="font-medium">{PAYMENT_OPTIONS.find(p => p.value === paymentMethod)?.label}</p>
            </div>
            {discount > 0 && (
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Desconto</p>
                <p className="font-medium text-destructive">- {fmt(discount)}</p>
              </div>
            )}
          </div>

          {notes && (
            <div className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm">{notes}</p>
            </div>
          )}

          {selectedTerm && paymentMethod === 'faturado' && total > 0 && (
            <Card className="p-3 bg-muted/30 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Parcelas — {selectedTerm.name}
              </p>
              {getInstallmentDates(selectedTerm).map(inst => (
                <div key={inst.num} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{inst.num}ª</Badge>
                    <span className="text-muted-foreground">{inst.date.toLocaleDateString('pt-BR')}</span>
                  </div>
                  <span className="font-bold text-primary">{fmt(inst.value)}</span>
                </div>
              ))}
            </Card>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">{fmt(total)}</span>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="w-full h-12 font-bold text-base gap-2"
            size="lg"
          >
            {channel === 'whatsapp' ? <Send className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {saving ? 'Salvando...' : channel === 'whatsapp' ? 'Finalizar e Enviar WhatsApp' : 'Finalizar Venda'}
          </Button>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button variant="outline" className="gap-1.5" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        )}
        {step < 4 && (
          <Button
            className="ml-auto gap-1.5"
            onClick={() => setStep(step + 1)}
            disabled={!canAdvanceFromStep(step)}
          >
            Avançar <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
