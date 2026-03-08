
CREATE TABLE public.payment_term_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  min_amount numeric NOT NULL DEFAULT 0,
  max_amount numeric,
  installments integer NOT NULL DEFAULT 1,
  day_intervals text NOT NULL DEFAULT '30',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_term_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment terms"
  ON public.payment_term_rules FOR ALL
  TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());
