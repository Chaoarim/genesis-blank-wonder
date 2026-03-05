
ALTER TABLE public.inventory_promotions 
ADD COLUMN customer_id uuid DEFAULT NULL,
ADD COLUMN customer_name text DEFAULT NULL;
