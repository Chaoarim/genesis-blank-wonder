
CREATE TABLE public.inventory_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  discount_percent numeric NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own promotions" ON public.inventory_promotions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read promotions" ON public.inventory_promotions
  FOR SELECT USING (true);

CREATE INDEX idx_inventory_promotions_item ON public.inventory_promotions(inventory_item_id);
CREATE INDEX idx_inventory_promotions_user ON public.inventory_promotions(user_id);
