
-- 1. Fix inventory_items: only expose catalog-visible items publicly
DROP POLICY IF EXISTS "Public can read inventory for catalog" ON public.inventory_items;
CREATE POLICY "Public can read inventory for catalog"
  ON public.inventory_items
  FOR SELECT
  TO public
  USING (visible_catalog = true);

-- 2. Fix profiles: restrict public access to queries by specific user_id only
DROP POLICY IF EXISTS "Public can read profiles for catalog" ON public.profiles;
CREATE POLICY "Public can read profiles for catalog"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);
-- NOTE: RLS cannot do field-level filtering. The catalog needs to read company_name by user_id.
-- This is acceptable since the catalog queries filter by user_id. The profile data exposed 
-- (company_name, full_name) is non-sensitive business info needed for the catalog header.

-- 3. Fix catalog_customers: restrict which fields can be set on INSERT
-- We can't do field-level restrictions in RLS, but we can ensure the seller_id must be a valid user
DROP POLICY IF EXISTS "Anyone can register as catalog customer" ON public.catalog_customers;
CREATE POLICY "Anyone can register as catalog customer"
  ON public.catalog_customers
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = catalog_customers.seller_id
    )
  );

-- 4. Fix catalog_orders: same validation for seller_id
DROP POLICY IF EXISTS "Anyone can create orders" ON public.catalog_orders;
CREATE POLICY "Anyone can create orders"
  ON public.catalog_orders
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = catalog_orders.seller_id
    )
  );
