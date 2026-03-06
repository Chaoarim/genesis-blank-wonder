
-- Fix orphaned sale created by seller before the fix
UPDATE public.sales SET user_id = 'af5340cd-3a0a-4e3a-9214-bd2360f255d2' WHERE id = '9bfd8520-4bd2-480b-9347-57d7c8284f02';
UPDATE public.sale_items SET user_id = 'af5340cd-3a0a-4e3a-9214-bd2360f255d2' WHERE sale_id = '9bfd8520-4bd2-480b-9347-57d7c8284f02';
