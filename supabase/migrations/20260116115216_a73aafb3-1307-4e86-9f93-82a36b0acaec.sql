-- Fix RLS for user_subscriptions: policies were created as RESTRICTIVE and were being ANDed,
-- which prevented admins from seeing all subscriptions and broke Analytics counts.

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;

CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    user_id IS NULL
    AND email = (
      SELECT users.email
      FROM auth.users
      WHERE users.id = auth.uid()
    )::text
  )
);
