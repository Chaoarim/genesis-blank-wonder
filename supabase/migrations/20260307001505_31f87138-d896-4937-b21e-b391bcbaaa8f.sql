
CREATE OR REPLACE FUNCTION public.generate_seller_code()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INT)), 0) + 1
  INTO next_num
  FROM public.seller_users
  WHERE code IS NOT NULL AND code LIKE 'VND-%';
  
  NEW.code := 'VND-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INT)), 0) + 1
  INTO next_num
  FROM public.customers
  WHERE code IS NOT NULL AND code LIKE 'CLI-%';
  
  NEW.code := 'CLI-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;
