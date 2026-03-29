
-- Product kits (grouped parts by vehicle)
CREATE TABLE public.product_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  vehicle text,
  description text,
  discount_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.product_kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.product_kits(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  produto text NOT NULL,
  fornecedor text,
  preco_unitario numeric NOT NULL DEFAULT 0,
  quantidade integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own kits"
  ON public.product_kits FOR ALL TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());

CREATE POLICY "Users can manage own kit items"
  ON public.product_kit_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_kits pk WHERE pk.id = product_kit_items.kit_id AND pk.user_id = get_admin_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_kits pk WHERE pk.id = product_kit_items.kit_id AND pk.user_id = get_admin_user_id()));
