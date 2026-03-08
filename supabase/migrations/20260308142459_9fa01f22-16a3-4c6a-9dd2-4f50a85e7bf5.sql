-- Permitir meta global da loja e meta individual por vendedor no mesmo mês/ano
ALTER TABLE public.sales_goals
DROP CONSTRAINT IF EXISTS sales_goals_user_id_month_year_key;

-- Apenas uma meta global por usuário/mês/ano
CREATE UNIQUE INDEX IF NOT EXISTS sales_goals_unique_global_idx
ON public.sales_goals (user_id, month, year)
WHERE seller_auth_id IS NULL;

-- Apenas uma meta por vendedor para usuário/mês/ano
CREATE UNIQUE INDEX IF NOT EXISTS sales_goals_unique_seller_idx
ON public.sales_goals (user_id, month, year, seller_auth_id)
WHERE seller_auth_id IS NOT NULL;