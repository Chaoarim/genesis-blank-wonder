-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can insert webhook logs" ON public.webhook_logs;

-- Create proper policy for webhook logs (service role will bypass RLS anyway)
-- No INSERT policy needed for webhook_logs as the edge function uses service role

-- Create policy for admins to manage subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create policy for admins to insert webhook logs
CREATE POLICY "Admins can insert webhook logs via function"
ON public.webhook_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));