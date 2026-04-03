
-- ============ PAYMENT TERM RULES ============
-- Drop the ALL policy and replace with granular ones
DROP POLICY IF EXISTS "Users can manage own payment terms" ON public.payment_term_rules;

-- SELECT: any authenticated user linked to the admin can read (no module check)
CREATE POLICY "Users can view payment terms"
ON public.payment_term_rules
FOR SELECT TO authenticated
USING (user_id = get_admin_user_id());

-- INSERT: only with module access
CREATE POLICY "Users can insert payment terms"
ON public.payment_term_rules
FOR INSERT TO authenticated
WITH CHECK (user_id = get_admin_user_id() AND has_seller_module_access('payment-terms'));

-- UPDATE: only with module access
CREATE POLICY "Users can update payment terms"
ON public.payment_term_rules
FOR UPDATE TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('payment-terms'));

-- DELETE: only with module access
CREATE POLICY "Users can delete payment terms"
ON public.payment_term_rules
FOR DELETE TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('payment-terms'));

-- ============ SALES COMMISSIONS ============
-- Fix: allow sellers to read commissions without module access check
DROP POLICY IF EXISTS "Sellers can read admin commissions" ON public.sales_commissions;

CREATE POLICY "Sellers can read admin commissions"
ON public.sales_commissions
FOR SELECT TO authenticated
USING (user_id = get_admin_user_id());
