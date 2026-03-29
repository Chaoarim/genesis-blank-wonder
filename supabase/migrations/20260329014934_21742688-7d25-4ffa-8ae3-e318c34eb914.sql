
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-avatars', 'customer-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view customer avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'customer-avatars');

CREATE POLICY "Authenticated users can upload customer avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-avatars');

CREATE POLICY "Authenticated users can update customer avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'customer-avatars');

CREATE POLICY "Authenticated users can delete customer avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'customer-avatars');
