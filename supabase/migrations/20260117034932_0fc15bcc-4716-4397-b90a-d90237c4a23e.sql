-- Fix subscription gating: also check by authenticated email and optionally link subscription to user_id
CREATE OR REPLACE FUNCTION public.check_subscription_status(p_user_id uuid)
RETURNS subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status subscription_status;
  v_uid uuid;
  v_email text;
BEGIN
  v_uid := auth.uid();
  v_email := lower(coalesce((auth.jwt() ->> 'email'), ''));

  -- Primary: by authenticated user id (safe, ignores spoofed arg)
  IF v_uid IS NOT NULL THEN
    SELECT us.status
      INTO v_status
    FROM public.user_subscriptions us
    WHERE us.user_id = v_uid
    LIMIT 1;

    IF v_status IS NOT NULL THEN
      RETURN v_status;
    END IF;
  END IF;

  -- Fallback: by authenticated email (supports rows with user_id NULL)
  IF v_email <> '' THEN
    SELECT us.status
      INTO v_status
    FROM public.user_subscriptions us
    WHERE lower(us.email) = v_email
    ORDER BY us.updated_at DESC
    LIMIT 1;

    IF v_status IS NOT NULL THEN
      -- If the subscription row(s) are not yet linked, link them now
      IF v_uid IS NOT NULL THEN
        UPDATE public.user_subscriptions
        SET user_id = v_uid,
            updated_at = now()
        WHERE user_id IS NULL
          AND lower(email) = v_email;
      END IF;

      RETURN v_status;
    END IF;
  END IF;

  RETURN 'inactive';
END;
$$;