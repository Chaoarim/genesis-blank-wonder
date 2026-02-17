-- Fix: avoid referencing auth.users inside RLS policies (can cause permission errors and break SELECT for admins)
-- and tighten the public pre-registration INSERT policy to remove WITH CHECK (true).

-- user_subscriptions: rewrite policy to use JWT email claim instead of auth.users
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    user_id IS NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- pre_registrations: replace overly permissive insert policy
DROP POLICY IF EXISTS "Anyone can pre-register" ON public.pre_registrations;

CREATE POLICY "Anyone can pre-register"
ON public.pre_registrations
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
  AND length(full_name) BETWEEN 2 AND 100
  AND length(whatsapp) BETWEEN 10 AND 20
  AND length(cpf_cnpj) BETWEEN 11 AND 20
);
