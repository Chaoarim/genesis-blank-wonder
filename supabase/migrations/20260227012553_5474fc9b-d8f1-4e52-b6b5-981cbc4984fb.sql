-- Add image_url column to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS image_url text;
