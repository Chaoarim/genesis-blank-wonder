
CREATE TABLE public.commission_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  seller_auth_id uuid NOT NULL,
  seller_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_sales numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  notes text,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own commission payments"
  ON public.commission_payments
  FOR ALL
  TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());
