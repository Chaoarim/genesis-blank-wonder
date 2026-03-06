
-- Sellers (employees) linked to an admin user
CREATE TABLE public.seller_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  seller_auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own sellers" ON public.seller_users FOR ALL
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Sellers can view own record" ON public.seller_users FOR SELECT
  USING (auth.uid() = seller_auth_id);

-- Seller permissions (which tabs they can access)
CREATE TABLE public.seller_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid NOT NULL REFERENCES public.seller_users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(seller_user_id, permission)
);

ALTER TABLE public.seller_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage seller permissions" ON public.seller_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.seller_users su WHERE su.id = seller_user_id AND su.admin_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_users su WHERE su.id = seller_user_id AND su.admin_user_id = auth.uid()));

CREATE POLICY "Sellers can view own permissions" ON public.seller_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.seller_users su WHERE su.id = seller_user_id AND su.seller_auth_id = auth.uid()));

-- Sales commissions configuration
CREATE TABLE public.sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('order', 'product', 'supplier')),
  reference text,
  commission_percent numeric NOT NULL DEFAULT 0,
  commission_fixed numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own commissions" ON public.sales_commissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
