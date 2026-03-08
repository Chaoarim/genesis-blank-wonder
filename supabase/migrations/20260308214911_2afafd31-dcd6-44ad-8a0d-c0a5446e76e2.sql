
CREATE TABLE public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier_name text NOT NULL,
  document_number text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'boleto',
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at timestamp with time zone,
  paid_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  barcode text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts payable"
  ON public.accounts_payable FOR ALL
  TO authenticated
  USING (user_id = get_admin_user_id())
  WITH CHECK (user_id = get_admin_user_id());

CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
