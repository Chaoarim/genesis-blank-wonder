
CREATE OR REPLACE FUNCTION public.sync_catalog_customer_to_customers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.customers (user_id, name, phone, notes)
  VALUES (
    NEW.seller_id,
    NEW.name,
    NEW.phone,
    'Cliente cadastrado via Catálogo B2B'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_catalog_customer
AFTER INSERT ON public.catalog_customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_catalog_customer_to_customers();
