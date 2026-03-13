-- Remove seller permissions for the test seller
DELETE FROM public.seller_permissions WHERE seller_user_id = 'b757faa0-097e-4dc3-8671-2bd816abe166';

-- Remove the test seller record
DELETE FROM public.seller_users WHERE id = 'b757faa0-097e-4dc3-8671-2bd816abe166';