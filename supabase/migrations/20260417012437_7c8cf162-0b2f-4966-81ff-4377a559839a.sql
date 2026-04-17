CREATE OR REPLACE FUNCTION public._grant_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IN ('mauricio.chaparim@gmail.com', 'consultapecasai@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'mauricio.chaparim@gmail.com'
ON CONFLICT DO NOTHING;