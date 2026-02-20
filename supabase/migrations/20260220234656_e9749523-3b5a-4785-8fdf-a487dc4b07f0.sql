
-- Create storage bucket for part images
INSERT INTO storage.buckets (id, name, public) VALUES ('part-images', 'part-images', true);

-- Storage policies
CREATE POLICY "Anyone can view part images"
ON storage.objects FOR SELECT
USING (bucket_id = 'part-images');

CREATE POLICY "Admins can upload part images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'part-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update part images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'part-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete part images"
ON storage.objects FOR DELETE
USING (bucket_id = 'part-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add image_url column to parts table
ALTER TABLE public.parts ADD COLUMN image_url text;
