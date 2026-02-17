-- Add column to store the manually selected best price
ALTER TABLE public.price_comparison_products 
ADD COLUMN melhor_preco text DEFAULT NULL;