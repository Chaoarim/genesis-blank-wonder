-- Permitir que o pré-cadastro aceite senha enviada pelo cliente (já criptografada via trigger existente _hash_catalog_password equivalente)
-- A coluna password_hash já existe. Vamos garantir que a policy de INSERT permita enviá-la.

DROP POLICY IF EXISTS "Anyone can insert pre-registration" ON public.pre_registrations;

CREATE POLICY "Anyone can insert pre-registration"
ON public.pre_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND email <> ''
  AND full_name IS NOT NULL AND full_name <> ''
  AND whatsapp IS NOT NULL AND whatsapp <> ''
  AND length(email) <= 255
  AND length(full_name) <= 255
  AND status = 'pending'
);

-- Trigger para hashear a senha do pré-cadastro automaticamente
CREATE OR REPLACE FUNCTION public._hash_pre_registration_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash <> ''
     AND NEW.password_hash NOT LIKE '$2a$%'
     AND NEW.password_hash NOT LIKE '$2b$%' THEN
    NEW.password_hash := extensions.crypt(NEW.password_hash, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_pre_registration_password ON public.pre_registrations;
CREATE TRIGGER hash_pre_registration_password
BEFORE INSERT OR UPDATE ON public.pre_registrations
FOR EACH ROW
EXECUTE FUNCTION public._hash_pre_registration_password();

-- Conceder role admin ao dono (consultapecasai@gmail.com) automaticamente quando ele fizer signup
CREATE OR REPLACE FUNCTION public._grant_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'consultapecasai@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_owner_admin_role ON auth.users;
CREATE TRIGGER grant_owner_admin_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public._grant_owner_admin_role();

-- Caso o dono já exista como usuário, garantir o papel admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'consultapecasai@gmail.com'
ON CONFLICT DO NOTHING;