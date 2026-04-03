
-- Fix pre_registrations: add basic validation instead of WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert pre-registration" ON public.pre_registrations;
CREATE POLICY "Anyone can insert pre-registration"
  ON public.pre_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND email != '' AND
    full_name IS NOT NULL AND full_name != '' AND
    whatsapp IS NOT NULL AND whatsapp != '' AND
    length(email) <= 255 AND
    length(full_name) <= 255 AND
    status = 'pending'
  );

-- Fix webhook_logs: restrict to service role only (edge functions use service role key)
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
