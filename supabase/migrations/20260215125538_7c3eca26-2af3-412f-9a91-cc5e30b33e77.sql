
ALTER TABLE public.popular_car_parts
  ADD COLUMN fornecedor text,
  ADD COLUMN fabricante text,
  ADD COLUMN produto text,
  ADD COLUMN aplicacao text;

-- Make part_id optional (allow manual entries without linking to parts table)
ALTER TABLE public.popular_car_parts
  ALTER COLUMN part_id DROP NOT NULL;
