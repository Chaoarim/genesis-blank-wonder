-- Remove duplicates keeping the most recently updated row
DELETE FROM public.inventory_items a
USING public.inventory_items b
WHERE a.user_id = b.user_id
  AND a.codigo = b.codigo
  AND a.id < b.id;

-- Now create the unique constraint
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_user_id_codigo_key UNIQUE (user_id, codigo);