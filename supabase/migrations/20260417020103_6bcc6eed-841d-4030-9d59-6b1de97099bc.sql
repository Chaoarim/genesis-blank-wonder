-- Remove duplicates keeping the most recent
DELETE FROM public.user_subscriptions a
USING public.user_subscriptions b
WHERE a.ctid < b.ctid AND lower(a.email) = lower(b.email);

-- Add unique constraint on email (case-insensitive via lower)
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_email_unique 
ON public.user_subscriptions (lower(email));

-- Also add a regular unique constraint for ON CONFLICT to work with column reference
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_email_key UNIQUE (email);