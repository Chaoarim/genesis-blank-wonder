-- Evita múltiplos vendedores apontando para o mesmo usuário Auth (causava carteiras misturadas)
WITH ranked AS (
  SELECT
    id,
    seller_auth_id,
    ROW_NUMBER() OVER (
      PARTITION BY seller_auth_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.seller_users
  WHERE seller_auth_id IS NOT NULL
)
UPDATE public.seller_users su
SET seller_auth_id = NULL
FROM ranked r
WHERE su.id = r.id
  AND r.rn > 1;

-- Garante unicidade do vínculo vendedor -> auth user
CREATE UNIQUE INDEX IF NOT EXISTS seller_users_unique_seller_auth_id
ON public.seller_users (seller_auth_id)
WHERE seller_auth_id IS NOT NULL;

-- Evita duplicar vendedor com o mesmo email dentro da mesma carteira do admin
CREATE UNIQUE INDEX IF NOT EXISTS seller_users_unique_admin_email
ON public.seller_users (admin_user_id, lower(email));