
-- Add seller/customer codes
ALTER TABLE public.seller_users ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS code TEXT;

-- Add seller tracking to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_auth_id UUID;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- Add delivery and payment fields to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'retirada';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'dinheiro';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_deadline DATE;

-- Auto-generate seller codes
CREATE OR REPLACE FUNCTION public.generate_seller_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

DROP TRIGGER IF EXISTS trg_seller_code ON public.seller_users;
CREATE TRIGGER trg_seller_code
  BEFORE INSERT ON public.seller_users
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_seller_code();

-- Auto-generate customer codes
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

DROP TRIGGER IF EXISTS trg_customer_code ON public.customers;
CREATE TRIGGER trg_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_customer_code();

-- Backfill existing sellers with codes
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.seller_users WHERE code IS NULL
)
UPDATE public.seller_users s SET code = 'VND-' || LPAD(n.rn::TEXT, 3, '0')
FROM numbered n WHERE s.id = n.id;

-- Backfill existing customers with codes
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.customers WHERE code IS NULL
)
UPDATE public.customers c SET code = 'CLI-' || LPAD(n.rn::TEXT, 3, '0')
FROM numbered n WHERE c.id = n.id;
