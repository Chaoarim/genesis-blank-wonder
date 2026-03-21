
-- Add seller_auth_id to sales_goals for per-seller goals
ALTER TABLE public.sales_goals ADD COLUMN IF NOT EXISTS seller_auth_id uuid DEFAULT NULL;

-- Update RLS on sales_commissions: allow sellers to read admin's commission rules
DROP POLICY IF EXISTS "Users can manage own commissions" ON public.sales_commissions;

CREATE POLICY "Users can manage own commissions"
ON public.sales_commissions
FOR ALL
TO authenticated
USING (user_id = get_admin_user_id())
WITH CHECK (user_id = get_admin_user_id());
