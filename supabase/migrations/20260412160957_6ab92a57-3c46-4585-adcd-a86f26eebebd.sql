
CREATE TABLE public.ml_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  peca_codigo text NOT NULL DEFAULT '',
  peca_nome text NOT NULL DEFAULT '',
  regiao text NOT NULL DEFAULT '',
  ml_item_id text NOT NULL DEFAULT '',
  titulo_ml text NOT NULL DEFAULT '',
  preco_atual numeric NOT NULL DEFAULT 0,
  menor_preco numeric NOT NULL DEFAULT 0,
  preco_medio numeric NOT NULL DEFAULT 0,
  total_vendido integer NOT NULL DEFAULT 0,
  fornecedor_nome text NOT NULL DEFAULT '',
  fornecedor_id text NOT NULL DEFAULT '',
  fornecedor_reputacao text NOT NULL DEFAULT '',
  fornecedor_total_vendas integer NOT NULL DEFAULT 0,
  estado_vendedor text NOT NULL DEFAULT '',
  link_anuncio text NOT NULL DEFAULT '',
  thumbnail text NOT NULL DEFAULT '',
  disponivel_regiao boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_ml_cache_peca_codigo ON public.ml_cache (peca_codigo);
CREATE INDEX idx_ml_cache_user_expires ON public.ml_cache (user_id, expires_at);
CREATE INDEX idx_ml_cache_regiao ON public.ml_cache (regiao);

ALTER TABLE public.ml_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ml cache"
  ON public.ml_cache FOR SELECT
  TO authenticated
  USING (user_id = get_admin_user_id());

CREATE POLICY "Users can insert own ml cache"
  ON public.ml_cache FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_admin_user_id());

CREATE POLICY "Users can update own ml cache"
  ON public.ml_cache FOR UPDATE
  TO authenticated
  USING (user_id = get_admin_user_id());

CREATE POLICY "Users can delete own ml cache"
  ON public.ml_cache FOR DELETE
  TO authenticated
  USING (user_id = get_admin_user_id());
