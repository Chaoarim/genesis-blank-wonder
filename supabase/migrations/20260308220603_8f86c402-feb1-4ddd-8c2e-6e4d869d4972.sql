CREATE TABLE public.payable_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.payable_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payable suppliers"
ON public.payable_suppliers
FOR ALL
TO authenticated
USING (user_id = get_admin_user_id())
WITH CHECK (user_id = get_admin_user_id());