
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage own commissions" ON public.sales_commissions;

-- Admin can fully manage their own commission rules
CREATE POLICY "Admins can manage own commissions"
ON public.sales_commissions
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND has_seller_module_access('commissions'::text))
WITH CHECK (auth.uid() = user_id AND has_seller_module_access('commissions'::text));

-- Sellers can READ commission rules from their admin
CREATE POLICY "Sellers can read admin commissions"
ON public.sales_commissions
FOR SELECT
TO authenticated
USING (user_id = get_admin_user_id());
