DROP POLICY IF EXISTS "Users can view own markup" ON public.markup_settings;

CREATE POLICY "Users can view own markup"
ON public.markup_settings
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR user_id = get_admin_user_id()
);