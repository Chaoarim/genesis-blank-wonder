-- Update handle_new_user function with input validation and sanitization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_subscription_id uuid;
    v_full_name TEXT;
BEGIN
    -- Validate and sanitize full_name from user metadata
    v_full_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    -- Enforce length limit
    IF LENGTH(v_full_name) > 100 THEN
        v_full_name := SUBSTRING(v_full_name, 1, 100);
    END IF;
    
    -- Remove potentially dangerous characters (XSS prevention)
    v_full_name := REGEXP_REPLACE(v_full_name, '[<>"'';\\]', '', 'g');
    
    -- Create profile with sanitized data
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NULLIF(v_full_name, ''));
    
    -- Check if subscription already exists (from pre-purchase)
    SELECT id INTO existing_subscription_id
    FROM public.user_subscriptions
    WHERE email = NEW.email AND user_id IS NULL;
    
    IF existing_subscription_id IS NOT NULL THEN
        -- Link existing subscription to user
        UPDATE public.user_subscriptions
        SET user_id = NEW.id, updated_at = now()
        WHERE id = existing_subscription_id;
    ELSE
        -- Create new subscription record (inactive by default)
        INSERT INTO public.user_subscriptions (user_id, email, plan, status)
        VALUES (NEW.id, NEW.email, 'free', 'inactive');
    END IF;
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update update_subscription_by_email function with strict input validation
CREATE OR REPLACE FUNCTION public.update_subscription_by_email(p_email text, p_plan text, p_status subscription_status)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated BOOLEAN := false;
    v_email TEXT;
    v_plan TEXT;
BEGIN
    -- Validate email format and length
    IF p_email IS NULL OR LENGTH(p_email) > 255 THEN
        RAISE EXCEPTION 'Invalid email: must be non-null and <= 255 characters';
    END IF;
    
    -- Basic email format validation
    IF p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Validate plan length
    IF p_plan IS NULL OR LENGTH(p_plan) > 50 THEN
        RAISE EXCEPTION 'Invalid plan: must be non-null and <= 50 characters';
    END IF;
    
    -- Sanitize inputs
    v_email := LOWER(TRIM(p_email));
    v_plan := TRIM(p_plan);
    
    -- Remove any potentially dangerous characters from plan
    v_plan := REGEXP_REPLACE(v_plan, '[<>"'';\\]', '', 'g');
    
    UPDATE public.user_subscriptions
    SET 
        plan = v_plan,
        status = p_status,
        updated_at = now(),
        started_at = CASE WHEN p_status = 'active' THEN now() ELSE started_at END
    WHERE LOWER(TRIM(email)) = v_email;
    
    IF FOUND THEN
        v_updated := true;
    END IF;
    
    RETURN v_updated;
END;
$$;