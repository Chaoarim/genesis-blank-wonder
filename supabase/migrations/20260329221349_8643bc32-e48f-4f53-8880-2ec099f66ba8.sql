
-- Tabela de expedição: rastreia separação e conferência de pedidos
CREATE TABLE public.expedition_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  assigned_to text,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Itens da expedição com conferência individual
CREATE TABLE public.expedition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expedition_id uuid REFERENCES public.expedition_orders(id) ON DELETE CASCADE NOT NULL,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  produto text NOT NULL,
  quantidade_esperada int NOT NULL DEFAULT 1,
  quantidade_conferida int NOT NULL DEFAULT 0,
  checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  notes text
);

-- RLS
ALTER TABLE public.expedition_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedition_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expeditions"
  ON public.expedition_orders FOR ALL TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());

CREATE POLICY "Users can manage own expedition items"
  ON public.expedition_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.expedition_orders eo
    WHERE eo.id = expedition_items.expedition_id
    AND eo.user_id = get_admin_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expedition_orders eo
    WHERE eo.id = expedition_items.expedition_id
    AND eo.user_id = get_admin_user_id()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_expedition_orders_updated_at
  BEFORE UPDATE ON public.expedition_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
