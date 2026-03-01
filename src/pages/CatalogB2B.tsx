import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Plus, Minus, Trash2, Send, LogIn, UserPlus, Package, X, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { PartThumbnail } from '@/components/PartThumbnail';
import { smartFilterInventory } from '@/lib/partsSearchEngine';

interface CatalogItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco_revenda: number;
  image_url?: string;
}

interface CartItem {
  item: CatalogItem;
  quantidade: number;
}

interface CatalogCustomer {
  id: string;
  name: string;
  phone: string;
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
  const [showLogin, setShowLogin] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Check saved session
  useEffect(() => {
    const saved = localStorage.getItem(`catalog_customer_${sellerId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomer(parsed);
        setShowLogin(false);
      } catch { /* ignore */ }
    }
  }, [sellerId]);

  const loadItems = useCallback(async () => {
    if (!sellerId) return;

    // Get seller profile with company name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('user_id', sellerId)
      .maybeSingle();
    if (profile) {
      setSellerName(profile.company_name || profile.full_name || 'Catálogo');
    }

    // Get markup
    const { data: markupData } = await supabase
      .from('markup_settings')
      .select('markup_revenda')
      .eq('user_id', sellerId)
      .maybeSingle();
    const mk = Number(markupData?.markup_revenda) || 0;

    // Get inventory
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', sellerId)
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
      })));
    }
    setLoading(false);
  }, [sellerId]);

  // Load catalog items
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleLogin = async () => {
    if (!authPhone.trim() || !authPassword.trim()) {
      toast.error('Preencha telefone e senha');
      return;
    }
    setAuthLoading(true);

    const { data } = await supabase
      .from('catalog_customers')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('phone', authPhone.trim())
      .maybeSingle();

    if (!data || data.password_hash !== authPassword) {
      toast.error('Telefone ou senha incorretos');
      setAuthLoading(false);
      return;
    }

    const cust: CatalogCustomer = { id: data.id, name: data.name, phone: data.phone };
    setCustomer(cust);
    setShowLogin(false);
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

    // Check if already exists
    const { data: existing } = await supabase
      .from('catalog_customers')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('phone', authPhone.trim())
      .maybeSingle();

    if (existing) {
      toast.error('Telefone já cadastrado. Faça login.');
      setAuthMode('login');
      setAuthLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('catalog_customers')
      .insert({
        seller_id: sellerId,
        name: authName.trim(),
        phone: authPhone.trim(),
        password_hash: authPassword,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error('Erro ao cadastrar');
      setAuthLoading(false);
      return;
    }

    const cust: CatalogCustomer = { id: data.id, name: data.name, phone: data.phone };
    setCustomer(cust);
    setShowLogin(false);
    localStorage.setItem(`catalog_customer_${sellerId}`, JSON.stringify(cust));
    toast.success('Cadastro realizado!');
    setAuthLoading(false);
  };

  const handleLogout = () => {
    setCustomer(null);
    setShowLogin(true);
    setCart([]);
    localStorage.removeItem(`catalog_customer_${sellerId}`);
  };

  const addToCart = useCallback((item: CatalogItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantidade: c.quantidade + 1 } : c);
      }
      return [...prev, { item, quantidade: 1 }];
    });
    toast.success(`${item.produto} adicionado ao carrinho`);
  }, []);

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

  const cartTotal = useMemo(() =>
    cart.reduce((sum, c) => sum + c.quantidade * c.item.preco_revenda, 0),
    [cart]
  );

  const [submitting, setSubmitting] = useState(false);

  const submitOrder = useCallback(async () => {
    if (cart.length === 0 || !customer || submitting) return;
    setSubmitting(true);

    const { error } = await supabase.from('catalog_orders').insert({
      seller_id: sellerId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      items: cart.map(c => ({
        codigo: c.item.codigo,
        produto: c.item.produto,
        quantidade: c.quantidade,
        preco: c.item.preco_revenda,
      })),
      total: cartTotal,
    });

    setSubmitting(false);
    if (error) {
      toast.error('Erro ao enviar pedido. Tente novamente.');
      return;
    }

    toast.success('Pedido enviado com sucesso! O vendedor entrará em contato.');
    setCart([]);
    setShowCart(false);
    
    // Recarregar estoque atualizado
    await loadItems();
  }, [cart, customer, cartTotal, sellerId, submitting, loadItems]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return smartFilterInventory(items, search);
  }, [items, search]);

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

  // Login/Register screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Settings className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{sellerName || 'Catálogo'}</h1>
            <p className="text-sm text-muted-foreground">
              {authMode === 'login' ? 'Entre para ver preços e fazer pedidos' : 'Cadastre-se para começar'}
            </p>
          </div>

          {authMode === 'register' && (
            <Input placeholder="Seu nome" value={authName} onChange={e => setAuthName(e.target.value)} />
          )}
          <Input placeholder="WhatsApp (com DDD)" value={authPhone} onChange={e => setAuthPhone(e.target.value)} />
          <Input type="password" placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />

          <Button
            className="w-full gap-2"
            onClick={authMode === 'login' ? handleLogin : handleRegister}
            disabled={authLoading}
          >
            {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {authLoading ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : 'Cadastrar'}
          </Button>

          <Button variant="ghost" size="sm" className="w-full" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </Button>
        </Card>
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
              <p className="text-[10px] text-muted-foreground">Olá, {customer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="relative gap-1" onClick={() => setShowCart(!showCart)}>
              <ShoppingCart className="w-4 h-4" />
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {cart.reduce((s, c) => s + c.quantidade, 0)}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleLogout}>Sair</Button>
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
            <div className="flex items-center justify-between pt-2">
              <p className="text-lg font-bold">Total: {fmt(cartTotal)}</p>
              <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={submitOrder} disabled={submitting}>
                <Send className="w-4 h-4" /> {submitting ? 'Enviando...' : 'Finalizar Pedido'}
              </Button>
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

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.slice(0, 50).map(item => (
            <Card key={item.id} className="p-3 flex items-start gap-3">
              <PartThumbnail imageUrl={item.image_url} alt={`${item.codigo} - ${item.produto}`} className="w-16 h-16 rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{item.codigo}</p>
                <p className="font-medium text-sm truncate">{item.produto}</p>
                <p className="text-xs text-muted-foreground">{item.fornecedor}</p>
                {item.aplicacao && (
                  <p className="text-xs text-muted-foreground mt-0.5">🚗 {item.aplicacao}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-primary">{fmt(item.preco_revenda)}</span>
                  <Badge variant={item.qtd_estoque > 0 ? 'default' : 'destructive'} className="text-[10px]">
                    {item.qtd_estoque > 0 ? `${item.qtd_estoque} un` : 'Esgotado'}
                  </Badge>
                </div>
              </div>
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => addToCart(item)}
                disabled={item.qtd_estoque <= 0}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </Card>
          ))}
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
    </div>
  );
}
