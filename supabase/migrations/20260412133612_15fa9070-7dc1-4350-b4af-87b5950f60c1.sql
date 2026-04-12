
CREATE TABLE public.ml_market_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  peca_codigo text NOT NULL,
  peca_produto text NOT NULL DEFAULT '',
  ml_item_id text NOT NULL DEFAULT '',
  titulo_ml text NOT NULL DEFAULT '',
  preco_atual numeric NOT NULL DEFAULT 0,
  menor_preco numeric NOT NULL DEFAULT 0,
  total_vendido integer NOT NULL DEFAULT 0,
  fornecedor_lider text NOT NULL DEFAULT '',
  regiao text NOT NULL DEFAULT '',
  reputacao_vendedor text NOT NULL DEFAULT '',
  link_anuncio text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '',
  data_consulta timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ml data"
ON public.ml_market_data FOR SELECT
TO authenticated
USING (user_id = get_admin_user_id());

CREATE POLICY "Users can insert own ml data"
ON public.ml_market_data FOR INSERT
TO authenticated
WITH CHECK (user_id = get_admin_user_id());

CREATE POLICY "Users can update own ml data"
ON public.ml_market_data FOR UPDATE
TO authenticated
USING (user_id = get_admin_user_id());

CREATE POLICY "Users can delete own ml data"
ON public.ml_market_data FOR DELETE
TO authenticated
USING (user_id = get_admin_user_id());

CREATE INDEX idx_ml_market_data_peca_regiao ON public.ml_market_data (peca_codigo, regiao);
CREATE INDEX idx_ml_market_data_consulta ON public.ml_market_data (data_consulta);
CREATE INDEX idx_ml_market_data_user ON public.ml_market_data (user_id);
