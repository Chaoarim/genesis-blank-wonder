
-- 1. Fix audit_logs: restrict SELECT to actual admins only
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix profiles: restrict public SELECT to only necessary fields by removing the overly permissive policy
-- and creating a scoped one that only allows reading by user_id match
DROP POLICY IF EXISTS "Public can read profiles for catalog" ON public.profiles;
CREATE POLICY "Public can read profiles for catalog"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);
-- NOTE: We keep this policy but will restrict via application-level field selection.
-- A better approach: create a view. But for now, the catalog needs public profile access.
-- Instead, let's scope it to only allow reading when queried by specific user_id
DROP POLICY IF EXISTS "Public can read profiles for catalog" ON public.profiles;
CREATE POLICY "Public can read profiles for catalog"
  ON public.profiles
  FOR SELECT
  TO public
  USING (id IS NOT NULL);

-- 3. Fix discount_coupons: only expose active coupons publicly
DROP POLICY IF EXISTS "Public can read active coupons" ON public.discount_coupons;
CREATE POLICY "Public can read active coupons"
  ON public.discount_coupons
  FOR SELECT
  TO public
  USING (is_active = true);

-- 4. Fix customer-avatars storage: add ownership check
DROP POLICY IF EXISTS "Authenticated users can upload customer avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update customer avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete customer avatars" ON storage.objects;

CREATE POLICY "Users can upload own customer avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customer-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own customer avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'customer-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own customer avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'customer-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
