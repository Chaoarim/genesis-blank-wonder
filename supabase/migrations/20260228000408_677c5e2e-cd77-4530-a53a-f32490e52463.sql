-- Allow public to read seller profile info for catalog
CREATE POLICY "Public can read profiles for catalog"
  ON public.profiles FOR SELECT
  USING (true);

-- Update handle_new_user to copy company_name from pre_registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    (SELECT company_name FROM public.pre_registrations WHERE email = NEW.email LIMIT 1)
  );
  
  -- Also link user_id in user_subscriptions if email matches
  UPDATE public.user_subscriptions
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$function$;