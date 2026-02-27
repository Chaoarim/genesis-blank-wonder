
-- Tabela de estoque independente por usuário
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  produto TEXT NOT NULL,
  fornecedor TEXT DEFAULT '',
  aplicacao TEXT DEFAULT '',
  qtd_estoque INTEGER NOT NULL DEFAULT 0,
  preco NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON public.inventory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON public.inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON public.inventory_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON public.inventory_items FOR DELETE USING (auth.uid() = user_id);

-- Permitir leitura pública para o catálogo B2B (qualquer pessoa com o link pode ver)
CREATE POLICY "Public can read inventory for catalog" ON public.inventory_items FOR SELECT USING (true);

CREATE INDEX idx_inventory_user ON public.inventory_items(user_id);
CREATE INDEX idx_inventory_codigo ON public.inventory_items(user_id, codigo);

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de clientes do catálogo B2B (clientes se cadastram para acessar)
CREATE TABLE public.catalog_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_customers ENABLE ROW LEVEL SECURITY;

-- Vendedor pode ver seus clientes
CREATE POLICY "Sellers can view own catalog customers" ON public.catalog_customers FOR SELECT USING (auth.uid() = seller_id);
-- Qualquer pessoa pode se cadastrar
CREATE POLICY "Anyone can register as catalog customer" ON public.catalog_customers FOR INSERT WITH CHECK (true);
-- Leitura pública para login do cliente
CREATE POLICY "Public can read catalog customers for login" ON public.catalog_customers FOR SELECT USING (true);

CREATE INDEX idx_catalog_customers_seller ON public.catalog_customers(seller_id);
CREATE INDEX idx_catalog_customers_phone ON public.catalog_customers(phone, seller_id);

-- Tabela de pedidos do catálogo
CREATE TABLE public.catalog_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  customer_id UUID REFERENCES public.catalog_customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own orders" ON public.catalog_orders FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Anyone can create orders" ON public.catalog_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Sellers can update own orders" ON public.catalog_orders FOR UPDATE USING (auth.uid() = seller_id);

CREATE INDEX idx_catalog_orders_seller ON public.catalog_orders(seller_id);
