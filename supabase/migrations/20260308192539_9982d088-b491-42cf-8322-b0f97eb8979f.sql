CREATE POLICY "Sellers can view colleagues"
ON public.seller_users
FOR SELECT
TO authenticated
USING (
  admin_user_id IN (
    SELECT admin_user_id FROM public.seller_users WHERE seller_auth_id = auth.uid()
  )
);