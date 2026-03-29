
CREATE TABLE public.customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'contact',
  channel text NOT NULL DEFAULT 'phone',
  subject text,
  description text,
  seller_auth_id uuid,
  seller_name text,
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own customer interactions"
  ON public.customer_interactions
  FOR ALL
  TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());
