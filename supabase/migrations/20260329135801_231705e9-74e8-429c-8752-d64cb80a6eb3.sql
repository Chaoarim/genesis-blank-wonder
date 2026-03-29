
-- Add seller_auth_id column to sales_commissions (NULL = global rule for all sellers)
ALTER TABLE public.sales_commissions
ADD COLUMN seller_auth_id uuid DEFAULT NULL;

-- Add seller_name column for display purposes
ALTER TABLE public.sales_commissions
ADD COLUMN seller_name text DEFAULT NULL;

-- Index for faster lookups
CREATE INDEX idx_sales_commissions_seller ON public.sales_commissions(seller_auth_id);
