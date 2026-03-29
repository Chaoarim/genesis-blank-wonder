
-- Customer price tiers: differentiated pricing by customer type
CREATE TABLE public.customer_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  tier_type text NOT NULL DEFAULT 'oficina',
  markup_percent numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own price tiers"
  ON public.customer_price_tiers
  FOR ALL
  TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());

-- Add customer_type column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'consumidor_final';
