
-- Helper function: returns admin_user_id if current user is a seller, otherwise auth.uid()
CREATE OR REPLACE FUNCTION public.get_admin_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT admin_user_id FROM public.seller_users WHERE seller_auth_id = auth.uid() AND is_active = true LIMIT 1),
    auth.uid()
  )
$$;

-- inventory_items: allow sellers to read admin's inventory
DROP POLICY IF EXISTS "Users can view own inventory" ON public.inventory_items;
CREATE POLICY "Users can view own inventory" ON public.inventory_items FOR SELECT TO authenticated USING (user_id = get_admin_user_id());

-- markup_settings: allow sellers to read admin's markup
DROP POLICY IF EXISTS "Users can view own markup" ON public.markup_settings;
CREATE POLICY "Users can view own markup" ON public.markup_settings FOR SELECT TO authenticated USING (user_id = get_admin_user_id());

-- sales: allow sellers to CRUD under admin's user_id
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view own sales" ON public.sales FOR SELECT TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
CREATE POLICY "Users can insert own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;
CREATE POLICY "Users can update own sales" ON public.sales FOR UPDATE TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales;
CREATE POLICY "Users can delete own sales" ON public.sales FOR DELETE TO authenticated USING (user_id = get_admin_user_id());

-- sale_items: allow sellers
DROP POLICY IF EXISTS "Users can view own sale items" ON public.sale_items;
CREATE POLICY "Users can view own sale items" ON public.sale_items FOR SELECT TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can insert own sale items" ON public.sale_items;
CREATE POLICY "Users can insert own sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can update own sale items" ON public.sale_items;
CREATE POLICY "Users can update own sale items" ON public.sale_items FOR UPDATE TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can delete own sale items" ON public.sale_items;
CREATE POLICY "Users can delete own sale items" ON public.sale_items FOR DELETE TO authenticated USING (user_id = get_admin_user_id());

-- customers: allow sellers
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view own customers" ON public.customers FOR SELECT TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
CREATE POLICY "Users can insert own customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE TO authenticated USING (user_id = get_admin_user_id());

-- catalog_orders: allow sellers to manage admin's orders
DROP POLICY IF EXISTS "Sellers can view own orders" ON public.catalog_orders;
CREATE POLICY "Sellers can view own orders" ON public.catalog_orders FOR SELECT TO authenticated USING (seller_id = get_admin_user_id());
DROP POLICY IF EXISTS "Sellers can update own orders" ON public.catalog_orders;
CREATE POLICY "Sellers can update own orders" ON public.catalog_orders FOR UPDATE TO authenticated USING (seller_id = get_admin_user_id());
DROP POLICY IF EXISTS "Sellers can delete own orders" ON public.catalog_orders;
CREATE POLICY "Sellers can delete own orders" ON public.catalog_orders FOR DELETE TO authenticated USING (seller_id = get_admin_user_id());

-- sales_goals: allow sellers
DROP POLICY IF EXISTS "Users can view own goals" ON public.sales_goals;
CREATE POLICY "Users can view own goals" ON public.sales_goals FOR SELECT TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can insert own goals" ON public.sales_goals;
CREATE POLICY "Users can insert own goals" ON public.sales_goals FOR INSERT TO authenticated WITH CHECK (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can update own goals" ON public.sales_goals;
CREATE POLICY "Users can update own goals" ON public.sales_goals FOR UPDATE TO authenticated USING (user_id = get_admin_user_id());
DROP POLICY IF EXISTS "Users can delete own goals" ON public.sales_goals;
CREATE POLICY "Users can delete own goals" ON public.sales_goals FOR DELETE TO authenticated USING (user_id = get_admin_user_id());
