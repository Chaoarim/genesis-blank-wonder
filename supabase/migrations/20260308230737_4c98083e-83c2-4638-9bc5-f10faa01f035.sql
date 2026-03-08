
-- Helper function to hash passwords with explicit schema reference
CREATE OR REPLACE FUNCTION public._catalog_hash_password(pw text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(pw, extensions.gen_salt('bf'))
$$;

-- Helper function to verify passwords
CREATE OR REPLACE FUNCTION public._catalog_verify_password(pw text, pw_hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT pw_hash = extensions.crypt(pw, pw_hash)
$$;

-- Trigger function for auto-hashing on insert/update
CREATE OR REPLACE FUNCTION public._hash_catalog_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash != '' AND NEW.password_hash NOT LIKE '$2a$%' AND NEW.password_hash NOT LIKE '$2b$%' THEN
    NEW.password_hash := extensions.crypt(NEW.password_hash, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_catalog_password_trigger ON public.catalog_customers;
CREATE TRIGGER hash_catalog_password_trigger
  BEFORE INSERT OR UPDATE OF password_hash ON public.catalog_customers
  FOR EACH ROW EXECUTE FUNCTION public._hash_catalog_password();
