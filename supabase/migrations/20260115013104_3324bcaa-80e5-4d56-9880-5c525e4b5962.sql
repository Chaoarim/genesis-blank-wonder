-- Permitir user_id nulo para compras antes do cadastro
ALTER TABLE public.user_subscriptions ALTER COLUMN user_id DROP NOT NULL;

-- Atualizar a função handle_new_user para verificar se já existe assinatura
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    existing_subscription_id uuid;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
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
$function$;

-- Atualizar RLS para permitir ver assinaturas pelo email também
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (
    auth.uid() = user_id 
    OR (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);