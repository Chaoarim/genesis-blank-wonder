import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingCart, Plus, Minus, Trash2, Send, LogIn, UserPlus, Package, X, Settings, Eye, EyeOff, Flame, Tag, Ticket, Share2, ClipboardList, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PartThumbnail } from '@/components/PartThumbnail';
import { smartFilterInventory } from '@/lib/partsSearchEngine';
import { CountdownTimer } from '@/components/catalog/CountdownTimer';

interface CatalogItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco_revenda: number;
  image_url?: string;
  vendidos_display: number;
}

interface CartItem {
  item: CatalogItem;
  quantidade: number;
}

interface PromotionInfo {
  discount_percent: number;
  expires_at: string;
}

interface CatalogCustomer {
  id: string;
  name: string;
  phone: string;
}

interface OrderRecord {
  id: string;
  created_at: string;
  status: string;
  total: number;
  items: any[];
}

export default function CatalogB2B() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [sellerName, setSellerName] = useState('');

  // Auth state
  const [customer, setCustomer] = useState<CatalogCustomer | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [promotions, setPromotions] = useState<Map<string, PromotionInfo>>(new Map());

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string; code: string; discount_type: string; discount_value: number;
    min_order_amount: number; supplier_filter: string | null;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Order tracking state
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Check saved session
  useEffect(() => {
    const saved = localStorage.getItem(`catalog_customer_${sellerId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomer(parsed);
      } catch { /* ignore */ }
    }
  }, [sellerId]);

  const loadItems = useCallback(async () => {
    if (!sellerId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('user_id', sellerId)
      .maybeSingle();
    if (profile) {
      setSellerName(profile.company_name || profile.full_name || 'Catálogo');
    }

    const { data: markupData } = await supabase
      .from('markup_settings')
      .select('markup_revenda')
      .eq('user_id', sellerId)
      .maybeSingle();
    const mk = Number(markupData?.markup_revenda) || 0;

    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', sellerId)
      .eq('visible_catalog', true)
      .order('produto');

    if (data) {
      setItems(data.map((r: any) => ({
        id: r.id,
        codigo: r.codigo,
        produto: r.produto,
        fornecedor: r.fornecedor || '',
        aplicacao: r.aplicacao || '',
        qtd_estoque: Number(r.qtd_estoque) || 0,
        preco_revenda: (Number(r.preco) || 0) * (1 + mk / 100),
        image_url: r.image_url || '',
        vendidos_display: Number(r.vendidos_display) || 0,
      })));
    }

    const { data: promoData } = await supabase
      .from('inventory_promotions')
      .select('inventory_item_id, discount_percent, expires_at, customer_id')
      .eq('user_id', sellerId)
      .gte('expires_at', new Date().toISOString());

    if (promoData) {
      const savedCustomer = localStorage.getItem(`catalog_customer_${sellerId}`);
      const currentCustomerId = savedCustomer ? JSON.parse(savedCustomer)?.id : null;

      const map = new Map<string, PromotionInfo>();
      promoData.forEach((p: any) => {
        if (!p.customer_id || p.customer_id === currentCustomerId) {
          const existing = map.get(p.inventory_item_id);
          if (!existing || p.discount_percent > existing.discount_percent) {
            map.set(p.inventory_item_id, { discount_percent: p.discount_percent, expires_at: p.expires_at });
          }
        }
      });
      setPromotions(map);
    }

    setLoading(false);
  }, [sellerId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load customer orders
  const loadOrders = useCallback(async () => {
    if (!customer || !sellerId) return;
    setOrdersLoading(true);
    const { data } = await supabase
      .from('catalog_orders')
      .select('id, created_at, status, total, items')
      .eq('seller_id', sellerId)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setOrders(data.map((o: any) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : [],
      })));
    }
    setOrdersLoading(false);
  }, [customer, sellerId]);

  const handleLogin = async () => {
    if (!authPhone.trim() || !authPassword.trim()) {
      toast.error('Preencha telefone e senha');
      return;
    }
    setAuthLoading(true);

    const { data, error } = await supabase.functions.invoke('catalog-login', {
      body: { sellerId, phone: authPhone.trim(), password: authPassword.trim(), mode: 'login' },
    });

    if (error || !data?.success) {
      toast.error(data?.error || 'Telefone ou senha incorretos');
      setAuthLoading(false);
      return;
    }

    const cust: CatalogCustomer = data.customer;
    setCustomer(cust);
    setShowLoginDialog(false);
    localStorage.setItem(`catalog_customer_${sellerId}`, JSON.stringify(cust));
    toast.success(`Bem-vindo, ${cust.name}!`);
    setAuthLoading(false);
  };

  const handleRegister = async () => {
    if (!authName.trim() || !authPhone.trim() || !authPassword.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    setAuthLoading(true);

    const { data, error } = await supabase.functions.invoke('catalog-login', {
      body: {
        sellerId,
        phone: authPhone.trim(),
        password: authPassword.trim(),
        mode: 'register',
        name: authName.trim(),
      },
    });

    if (error || !data?.success) {
      toast.error(data?.error || 'Erro ao cadastrar');
      if (data?.error?.includes('já cadastrado')) setAuthMode('login');
      setAuthLoading(false);
      return;
    }

    const cust: CatalogCustomer = data.customer;
    setCustomer(cust);
    setShowLoginDialog(false);
    localStorage.setItem(`catalog_customer_${sellerId}`, JSON.stringify(cust));
    toast.success('Cadastro realizado!');
    setAuthLoading(false);
  };

  const handleLogout = () => {
    setCustomer(null);
    setCart([]);
    localStorage.removeItem(`catalog_customer_${sellerId}`);
  };

  const addToCart = useCallback((item: CatalogItem) => {
    if (!customer) {
      setShowLoginDialog(true);
      toast.info('Faça login para adicionar produtos ao carrinho');
      return;
    }
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantidade: c.quantidade + 1 } : c);
      }
      return [...prev, { item, quantidade: 1 }];
    });
    toast.success(`${item.produto} adicionado ao carrinho`);
  }, [customer]);

  const updateCartQty = useCallback((itemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id !== itemId) return c;
      const newQty = Math.max(1, c.quantidade + delta);
      return { ...c, quantidade: newQty };
    }));
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  }, []);

  const cartSubtotal = useMemo(() =>
    cart.reduce((sum, c) => sum + c.quantidade * c.item.preco_revenda, 0),
    [cart]
  );

  const supplierSubtotal = useMemo(() => {
    if (!appliedCoupon?.supplier_filter) return cartSubtotal;
    return cart
      .filter(c => (c.item.fornecedor || '').trim().toUpperCase() === appliedCoupon.supplier_filter)
      .reduce((sum, c) => sum + c.quantidade * c.item.preco_revenda, 0);
  }, [cart, cartSubtotal, appliedCoupon]);

  const couponWarning = useMemo(() => {
    if (!appliedCoupon) return '';
    if (appliedCoupon.supplier_filter) {
      if (supplierSubtotal === 0) {
        return `Este cupom é válido apenas para produtos do fornecedor ${appliedCoupon.supplier_filter}. Adicione itens desse fornecedor ao carrinho.`;
      }
      if (appliedCoupon.min_order_amount > 0 && supplierSubtotal < appliedCoupon.min_order_amount) {
        const falta = appliedCoupon.min_order_amount - supplierSubtotal;
        return `Cupom válido apenas para ${appliedCoupon.supplier_filter}. Faltam ${fmt(falta)} em produtos desse fornecedor para atingir o mínimo de ${fmt(appliedCoupon.min_order_amount)}.`;
      }
    } else {
      if (appliedCoupon.min_order_amount > 0 && cartSubtotal < appliedCoupon.min_order_amount) {
        const falta = appliedCoupon.min_order_amount - cartSubtotal;
        return `Cupom não pode ser validado. Faltam ${fmt(falta)} para atingir o pedido mínimo de ${fmt(appliedCoupon.min_order_amount)}.`;
      }
    }
    return '';
  }, [appliedCoupon, cartSubtotal, supplierSubtotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon || couponWarning) return 0;
    const base = appliedCoupon.supplier_filter ? supplierSubtotal : cartSubtotal;
    if (appliedCoupon.discount_type === 'percent') {
      return base * (appliedCoupon.discount_value / 100);
    }
    return Math.min(appliedCoupon.discount_value, base);
  }, [appliedCoupon, cartSubtotal, supplierSubtotal, couponWarning]);

  const cartTotal = cartSubtotal - couponDiscount;

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim() || !sellerId) return;
    setCouponLoading(true);
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('user_id', sellerId)
      .eq('code', couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      toast.error('Cupom inválido ou expirado');
      setCouponLoading(false);
      return;
    }
    if (data.max_uses && data.used_count >= data.max_uses) {
      toast.error('Este cupom atingiu o limite de usos');
      setCouponLoading(false);
      return;
    }
    setAppliedCoupon({
      id: data.id,
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      min_order_amount: Number(data.min_order_amount) || 0,
      supplier_filter: data.supplier_filter,
    });
    toast.success(`Cupom ${data.code} aplicado!`);
    setCouponLoading(false);
  }, [couponCode, sellerId]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const submitOrder = useCallback(async () => {
    if (cart.length === 0 || !customer || submitting) return;
    setSubmitting(true);

    const orderItems = cart.map(c => ({
      codigo: c.item.codigo,
      produto: c.item.produto,
      quantidade: c.quantidade,
      preco: c.item.preco_revenda,
    }));

    const { error } = await supabase.from('catalog_orders').insert({
      seller_id: sellerId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      items: orderItems,
      total: cartTotal,
    });

    if (error) {
      setSubmitting(false);
      toast.error('Erro ao enviar pedido. Tente novamente.');
      return;
    }

    if (appliedCoupon && couponDiscount > 0) {
      await supabase
        .from('discount_coupons')
        .update({ used_count: (appliedCoupon as any).used_count ? (appliedCoupon as any).used_count + 1 : 1 } as any)
        .eq('id', appliedCoupon.id);
    }

    setSubmitting(false);
    toast.success('Pedido enviado com sucesso! O vendedor entrará em contato.');
    setCart([]);
    setShowCart(false);
    setAppliedCoupon(null);
    setCouponCode('');
    await loadItems();
  }, [cart, customer, cartTotal, sellerId, submitting, loadItems, appliedCoupon, couponDiscount]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');

  const brands = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
      const f = (i.fornecedor || '').trim().toUpperCase();
      if (f) map.set(f, (map.get(f) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) result = smartFilterInventory(result, search);
    if (selectedBrand) result = result.filter(i => (i.fornecedor || '').trim().toUpperCase() === selectedBrand);

    if (priceRange === 'low') result = result.filter(i => i.preco_revenda <= 50);
    else if (priceRange === 'mid') result = result.filter(i => i.preco_revenda > 50 && i.preco_revenda <= 200);
    else if (priceRange === 'high') result = result.filter(i => i.preco_revenda > 200);

    if (sortBy === 'price-asc') result = [...result].sort((a, b) => a.preco_revenda - b.preco_revenda);
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.preco_revenda - a.preco_revenda);
    else if (sortBy === 'name') result = [...result].sort((a, b) => a.produto.localeCompare(b.produto));
    

    return result;
  }, [items, search, selectedBrand, priceRange, sortBy]);

  // WhatsApp share helpers
  const catalogUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareCatalog = () => {
    const text = `🔧 Confira o catálogo de peças de *${sellerName}*!\n\n${catalogUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareProduct = (item: CatalogItem) => {
    const text = `🔧 *${item.produto}*\nCódigo: ${item.codigo}${item.fornecedor ? `\nMarca: ${item.fornecedor}` : ''}${item.aplicacao ? `\nAplicação: ${item.aplicacao}` : ''}\nPreço: ${fmt(item.preco_revenda)}\n\nVeja no catálogo: ${catalogUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Order status helpers
  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle },
    delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  };

  const getStatus = (s: string) => statusConfig[s] || statusConfig.pending;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <span>Carregando catálogo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow">
              <Settings className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">{sellerName || 'Catálogo'}</h1>
              <p className="text-[10px] text-muted-foreground">
                {customer ? `Olá, ${customer.name}` : 'Navegue pelo catálogo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Share button */}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={shareCatalog} title="Compartilhar">
              <Share2 className="w-4 h-4" />
            </Button>

            {customer ? (
              <>
                {/* Orders button */}
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setShowOrders(true); loadOrders(); }} title="Meus Pedidos">
                  <ClipboardList className="w-4 h-4" />
                </Button>
                {/* Cart */}
                <Button variant="outline" size="sm" className="relative gap-1" onClick={() => setShowCart(!showCart)}>
                  <ShoppingCart className="w-4 h-4" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      {cart.reduce((s, c) => s + c.quantidade, 0)}
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleLogout}>Sair</Button>
              </>
            ) : (
              <Button variant="default" size="sm" className="gap-1" onClick={() => setShowLoginDialog(true)}>
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Cart Panel */}
        {showCart && cart.length > 0 && (
          <Card className="p-4 mb-4 space-y-3 border-primary/30">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Carrinho
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCart(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {cart.map(c => (
              <div key={c.item.id} className="flex items-center gap-2 text-sm border-b pb-2">
                <div className="flex-1">
                  <p className="font-medium">{c.item.produto}</p>
                  <p className="text-xs text-muted-foreground">{c.item.codigo}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQty(c.item.id, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center font-bold">{c.quantidade}</span>
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQty(c.item.id, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <p className="font-bold w-20 text-right">{fmt(c.quantidade * c.item.preco_revenda)}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(c.item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            {/* Coupon Input */}
            <div className="border-t pt-3">
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2">
                  <Ticket className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-green-700 dark:text-green-300">Cupom {appliedCoupon.code}</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400">
                      {appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}%` : fmt(appliedCoupon.discount_value)} de desconto
                      {appliedCoupon.supplier_filter ? ` (${appliedCoupon.supplier_filter})` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cupom de desconto"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      className="pl-8 h-9 text-sm uppercase font-mono"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? '...' : 'Aplicar'}
                  </Button>
                </div>
              )}
            </div>

            {appliedCoupon && couponWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <Ticket className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>{couponWarning}</span>
              </div>
            )}

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              {couponDiscount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{fmt(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>-{fmt(couponDiscount)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">Total: {fmt(cartTotal)}</p>
                <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={submitOrder} disabled={submitting}>
                  <Send className="w-4 h-4" /> {submitting ? 'Enviando...' : 'Finalizar Pedido'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça por código, nome, veículo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-base h-12"
            autoFocus
          />
        </div>

        {/* Advanced filters */}
        <div className="space-y-2 mb-4">
          {brands.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  !selectedBrand ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                Todas
              </button>
              {brands.map(([brand, count]) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedBrand === brand ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {brand} ({count})
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 items-center">
              <span className="text-[10px] text-muted-foreground mr-1">Preço:</span>
              {([['all', 'Todos'], ['low', 'Até R$50'], ['mid', 'De R$50 a R$200'], ['high', 'Acima de R$200']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPriceRange(val)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                    priceRange === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 items-center ml-auto">
              <span className="text-[10px] text-muted-foreground mr-1">Ordenar:</span>
              {([['default', 'Padrão'], ['price-asc', 'Menor preço'], ['price-desc', 'Maior preço'], ['name', 'A-Z (Alfabética)']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                    sortBy === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Not logged in banner */}
        {!customer && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <LogIn className="w-4 h-4 inline mr-1.5" />
              Faça login para ver preços, adicionar ao carrinho e fazer pedidos.
            </p>
            <Button size="sm" onClick={() => setShowLoginDialog(true)} className="shrink-0 gap-1">
              <LogIn className="w-3.5 h-3.5" /> Entrar
            </Button>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.slice(0, 50).map(item => {
            const promo = promotions.get(item.id);
            const hasPromo = promo && new Date(promo.expires_at) > new Date();
            const finalPrice = hasPromo
              ? item.preco_revenda * (1 - promo.discount_percent / 100)
              : item.preco_revenda;
            return (
            <Card key={item.id} className="p-3 flex items-start gap-3">
              <div className="relative">
                <PartThumbnail imageUrl={item.image_url} alt={`${item.codigo} - ${item.produto}`} className="w-16 h-16 rounded-lg" />
                {hasPromo && (
                  <div className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[9px] font-bold px-1 py-0.5 rounded">
                    -{promo.discount_percent}%
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{item.codigo}</p>
                <p className="font-medium text-sm truncate">{item.produto}</p>
                {item.fornecedor && (
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-primary/40 text-primary">
                    {item.fornecedor}
                  </Badge>
                )}
                {item.aplicacao && (
                  <p className="text-xs text-muted-foreground mt-0.5">🚗 {item.aplicacao}</p>
                )}
                {customer ? (
                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    {hasPromo ? (
                      <>
                        <span className="text-xs line-through text-muted-foreground">{fmt(item.preco_revenda)}</span>
                        <span className="text-lg font-bold text-destructive">{fmt(finalPrice)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-primary">{fmt(item.preco_revenda)}</span>
                    )}
                    <Badge variant={item.qtd_estoque > 0 ? 'default' : 'destructive'} className="text-[10px]">
                      {item.qtd_estoque > 0 ? `${item.qtd_estoque} un` : 'Esgotado'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 italic">Faça login para ver o preço</p>
                )}
                {item.vendidos_display > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                    <Flame className="w-3 h-3" />
                    <span>{item.vendidos_display} vendido{item.vendidos_display !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {hasPromo && (
                  <div className="mt-1">
                    <CountdownTimer expiresAt={promo.expires_at} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => addToCart(item)}
                  disabled={item.qtd_estoque <= 0}
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => shareProduct(item)}
                  title="Compartilhar via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2" />
            <p>Nenhum produto encontrado</p>
          </div>
        )}

        {filtered.length > 50 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            Mostrando 50 de {filtered.length}. Refine sua busca.
          </p>
        )}
      </main>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {authMode === 'login' ? 'Entrar no Catálogo' : 'Criar Conta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              {authMode === 'login' ? 'Entre para ver preços e fazer pedidos' : 'Cadastre-se para começar'}
            </p>
            {authMode === 'register' && (
              <Input placeholder="Seu nome" value={authName} onChange={e => setAuthName(e.target.value)} />
            )}
            <Input placeholder="WhatsApp (com DDD)" value={authPhone} onChange={e => setAuthPhone(e.target.value)} />
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button className="w-full gap-2" onClick={authMode === 'login' ? handleLogin : handleRegister} disabled={authLoading}>
              {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {authLoading ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orders Dialog */}
      <Dialog open={showOrders} onOpenChange={setShowOrders}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Meus Pedidos
            </DialogTitle>
          </DialogHeader>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum pedido encontrado</p>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const st = getStatus(order.status);
                const StatusIcon = st.icon;
                return (
                  <Card key={order.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge className={`text-[10px] gap-1 ${st.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {st.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="truncate flex-1">{it.quantidade}x {it.produto}</span>
                          <span className="font-medium ml-2">{fmt(it.quantidade * it.preco)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end border-t pt-1">
                      <span className="font-bold text-sm">Total: {fmt(order.total)}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
