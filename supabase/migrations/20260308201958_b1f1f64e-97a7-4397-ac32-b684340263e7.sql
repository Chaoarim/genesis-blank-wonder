-- Fix recursive RLS policy on seller_users causing empty sellers list and broken seller detection/login
DROP POLICY IF EXISTS "Sellers can view colleagues" ON public.seller_users;

CREATE POLICY "Sellers can view colleagues"
ON public.seller_users
FOR SELECT
USING (
  admin_user_id = public.get_admin_user_id()
);