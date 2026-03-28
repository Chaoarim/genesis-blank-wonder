
-- Function to check if current user has seller permission for a specific module
-- If user is an admin (not a seller), always returns true
-- If user is a seller, checks the seller_permissions table
CREATE OR REPLACE FUNCTION public.has_seller_module_access(_module text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE
    -- If user is NOT a seller (admin), always allow
    WHEN NOT EXISTS (
      SELECT 1 FROM public.seller_users
      WHERE seller_auth_id = auth.uid() AND is_active = true
    ) THEN true
    -- If user IS a seller, check permissions
    ELSE EXISTS (
      SELECT 1
      FROM public.seller_permissions sp
      JOIN public.seller_users su ON su.id = sp.seller_user_id
      WHERE su.seller_auth_id = auth.uid()
        AND su.is_active = true
        AND sp.permission = _module
    )
  END
$$;
