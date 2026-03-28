
-- =============================================
-- SECURE SENSITIVE TABLES WITH MODULE PERMISSION CHECKS
-- =============================================

-- 1. MARKUP_SETTINGS - drop old SELECT policy, add module-restricted one
DROP POLICY IF EXISTS "Users can view own markup" ON public.markup_settings;
CREATE POLICY "Users can view own markup" ON public.markup_settings
FOR SELECT TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('markup'));

DROP POLICY IF EXISTS "Users can insert own markup" ON public.markup_settings;
CREATE POLICY "Users can insert own markup" ON public.markup_settings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND has_seller_module_access('markup'));

DROP POLICY IF EXISTS "Users can update own markup" ON public.markup_settings;
CREATE POLICY "Users can update own markup" ON public.markup_settings
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND has_seller_module_access('markup'));

-- 2. ACCOUNTS_PAYABLE - restrict to module permission
DROP POLICY IF EXISTS "Users can manage own accounts payable" ON public.accounts_payable;
CREATE POLICY "Users can manage own accounts payable" ON public.accounts_payable
FOR ALL TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('accounts-payable'))
WITH CHECK (user_id = get_admin_user_id() AND has_seller_module_access('accounts-payable'));

-- 3. PAYABLE_SUPPLIERS - restrict to module permission
DROP POLICY IF EXISTS "Users can manage own payable suppliers" ON public.payable_suppliers;
CREATE POLICY "Users can manage own payable suppliers" ON public.payable_suppliers
FOR ALL TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('accounts-payable'))
WITH CHECK (user_id = get_admin_user_id() AND has_seller_module_access('accounts-payable'));

-- 4. SALES_COMMISSIONS - restrict to module permission
DROP POLICY IF EXISTS "Users can manage own commissions" ON public.sales_commissions;
CREATE POLICY "Users can manage own commissions" ON public.sales_commissions
FOR ALL TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('commissions'))
WITH CHECK (user_id = get_admin_user_id() AND has_seller_module_access('commissions'));

-- 5. CREDIT_APPROVALS - restrict to module permission
DROP POLICY IF EXISTS "Users can manage own credit approvals" ON public.credit_approvals;
CREATE POLICY "Users can manage own credit approvals" ON public.credit_approvals
FOR ALL TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('credit'))
WITH CHECK (user_id = get_admin_user_id() AND has_seller_module_access('credit'));

-- 6. PAYMENT_TERM_RULES - restrict to module permission
DROP POLICY IF EXISTS "Users can manage own payment terms" ON public.payment_term_rules;
CREATE POLICY "Users can manage own payment terms" ON public.payment_term_rules
FOR ALL TO authenticated
USING (user_id = get_admin_user_id() AND has_seller_module_access('payment-terms'))
WITH CHECK (user_id = get_admin_user_id() AND has_seller_module_access('payment-terms'));
