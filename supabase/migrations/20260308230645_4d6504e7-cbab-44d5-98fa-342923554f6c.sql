
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash existing plaintext passwords in catalog_customers
UPDATE public.catalog_customers
SET password_hash = crypt(password_hash, gen_salt('bf'))
WHERE password_hash IS NOT NULL AND password_hash != '' AND password_hash NOT LIKE '$2a$%' AND password_hash NOT LIKE '$2b$%';

-- Remove the public SELECT policy on catalog_customers (security hole)
DROP POLICY IF EXISTS "Public can read catalog customers for login" ON public.catalog_customers;

-- Allow only the service role (edge functions) to read catalog_customers
-- Sellers can still view their own catalog customers
-- Keep existing policies: "Anyone can register as catalog customer" (INSERT) and "Sellers can view own catalog customers" (SELECT)

-- Remove password_plain column from seller_users
ALTER TABLE public.seller_users DROP COLUMN IF EXISTS password_plain;
