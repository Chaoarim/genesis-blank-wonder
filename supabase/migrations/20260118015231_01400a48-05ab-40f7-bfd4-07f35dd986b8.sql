-- Create table to track daily query usage
CREATE TABLE public.user_daily_usage (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    usage_date date NOT NULL DEFAULT CURRENT_DATE,
    query_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
ON public.user_daily_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check and increment usage
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(p_user_id uuid, p_daily_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_uid uuid;
    v_current_count integer;
    v_result jsonb;
BEGIN
    -- Use authenticated user id for security
    v_uid := auth.uid();
    
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'error', 'not_authenticated');
    END IF;
    
    -- Insert or update usage for today
    INSERT INTO public.user_daily_usage (user_id, usage_date, query_count)
    VALUES (v_uid, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        query_count = user_daily_usage.query_count + 1,
        updated_at = now()
    RETURNING query_count INTO v_current_count;
    
    -- Check if limit exceeded (we already incremented, so check against limit)
    IF v_current_count > p_daily_limit THEN
        -- Rollback the increment
        UPDATE public.user_daily_usage 
        SET query_count = query_count - 1, updated_at = now()
        WHERE user_id = v_uid AND usage_date = CURRENT_DATE;
        
        RETURN jsonb_build_object(
            'allowed', false, 
            'remaining', 0, 
            'used', p_daily_limit,
            'limit', p_daily_limit,
            'error', 'limit_exceeded'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'allowed', true, 
        'remaining', p_daily_limit - v_current_count,
        'used', v_current_count,
        'limit', p_daily_limit
    );
END;
$$;

-- Function to get current usage without incrementing
CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_uid uuid;
    v_current_count integer;
    v_daily_limit integer := 200;
BEGIN
    v_uid := auth.uid();
    
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('remaining', 0, 'used', 0, 'limit', v_daily_limit);
    END IF;
    
    SELECT COALESCE(query_count, 0) INTO v_current_count
    FROM public.user_daily_usage
    WHERE user_id = v_uid AND usage_date = CURRENT_DATE;
    
    IF v_current_count IS NULL THEN
        v_current_count := 0;
    END IF;
    
    RETURN jsonb_build_object(
        'remaining', v_daily_limit - v_current_count,
        'used', v_current_count,
        'limit', v_daily_limit
    );
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_daily_usage_updated_at
BEFORE UPDATE ON public.user_daily_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();