
-- 1. Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. User subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text,
  status text DEFAULT 'pending',
  started_at timestamptz,
  expires_at timestamptz,
  notes text,
  kiwify_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert subscriptions" ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subscriptions" ON public.user_subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subscriptions" ON public.user_subscriptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Pre-registrations table
CREATE TABLE public.pre_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  whatsapp text NOT NULL,
  password_hash text,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pre_registrations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for pre-registration
CREATE POLICY "Anyone can insert pre-registration" ON public.pre_registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view pre-registrations" ON public.pre_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pre-registrations" ON public.pre_registrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pre-registrations" ON public.pre_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Webhook logs table
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  evento_recebido text NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  plano_aplicado text,
  acao_acesso text
);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can insert webhook logs" ON public.webhook_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 8. Parts table
CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabricante text,
  codigo_peca text,
  descricao text,
  chave_de_busca text,
  marca_veiculo text,
  modelo_veiculo text,
  anos_aplicacao text,
  contexto_ia text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update parts" ON public.parts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete parts" ON public.parts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Popular cars table
CREATE TABLE public.popular_cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.popular_cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read popular cars" ON public.popular_cars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert popular cars" ON public.popular_cars FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update popular cars" ON public.popular_cars FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete popular cars" ON public.popular_cars FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Popular car parts table
CREATE TABLE public.popular_car_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.popular_cars(id) ON DELETE CASCADE,
  fornecedor text,
  fabricante text,
  produto text NOT NULL,
  aplicacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.popular_car_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read popular car parts" ON public.popular_car_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert popular car parts" ON public.popular_car_parts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update popular car parts" ON public.popular_car_parts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete popular car parts" ON public.popular_car_parts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 11. Price comparison products table
CREATE TABLE public.price_comparison_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local text NOT NULL,
  codigo text NOT NULL,
  marca text NOT NULL,
  descricao text NOT NULL,
  qtde integer NOT NULL DEFAULT 1,
  preco_sama numeric,
  preco_real numeric,
  preco_dpk numeric,
  roles_dpk text,
  melhor_preco text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_comparison_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read price comparison" ON public.price_comparison_products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert price comparison" ON public.price_comparison_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update price comparison" ON public.price_comparison_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete price comparison" ON public.price_comparison_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 12. Chat usage tracking
CREATE TABLE public.chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at date NOT NULL DEFAULT CURRENT_DATE,
  query_count integer NOT NULL DEFAULT 1
);
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.chat_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.chat_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.chat_usage FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 13. check_subscription_status function
CREATE OR REPLACE FUNCTION public.check_subscription_status(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT us.status FROM public.user_subscriptions us
     WHERE us.user_id = p_user_id AND us.status = 'active'
     LIMIT 1),
    (SELECT us.status FROM public.user_subscriptions us
     JOIN public.profiles p ON p.email = us.email
     WHERE p.user_id = p_user_id AND us.status = 'active'
     LIMIT 1),
    'inactive'
  )
$$;

-- 14. get_daily_usage function
CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_limit integer := 200;
  used_count integer;
BEGIN
  SELECT COALESCE(SUM(query_count), 0) INTO used_count
  FROM public.chat_usage
  WHERE user_id = p_user_id AND used_at = CURRENT_DATE;
  
  RETURN json_build_object(
    'remaining', GREATEST(daily_limit - used_count, 0),
    'used', used_count,
    'limit', daily_limit
  );
END;
$$;

-- 15. update_subscription_by_email function
CREATE OR REPLACE FUNCTION public.update_subscription_by_email(p_email text, p_plan text, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET status = p_status, plan = p_plan, updated_at = now()
  WHERE email = p_email;
END;
$$;

-- 16. Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  
  -- Also link user_id in user_subscriptions if email matches
  UPDATE public.user_subscriptions
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_comparison_updated_at BEFORE UPDATE ON public.price_comparison_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 18. Admins can view all profiles (for PaymentControl)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
