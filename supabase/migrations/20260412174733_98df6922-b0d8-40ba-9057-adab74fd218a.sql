
-- Table: radar_cache (stores ML search results for 24h)
CREATE TABLE public.radar_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_busca text NOT NULL DEFAULT 'codigo_peca',
  termo_busca text NOT NULL DEFAULT '',
  estado_filtro text NOT NULL DEFAULT 'BRASIL',
  payload_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_anuncios integer NOT NULL DEFAULT 0,
  total_vendido_soma integer NOT NULL DEFAULT 0,
  preco_minimo numeric NOT NULL DEFAULT 0,
  preco_medio numeric NOT NULL DEFAULT 0,
  preco_maximo numeric NOT NULL DEFAULT 0,
  vendedor_lider_nome text NOT NULL DEFAULT '',
  vendedor_lider_vendas integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.radar_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read radar cache"
  ON public.radar_cache FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert radar cache"
  ON public.radar_cache FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can delete expired radar cache"
  ON public.radar_cache FOR DELETE TO authenticated
  USING (true);

CREATE INDEX idx_radar_cache_lookup ON public.radar_cache (termo_busca, estado_filtro, expires_at);

-- Table: radar_historico (price history over time)
CREATE TABLE public.radar_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo_busca text NOT NULL DEFAULT '',
  preco_medio numeric NOT NULL DEFAULT 0,
  total_vendido integer NOT NULL DEFAULT 0,
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'BRASIL'
);

ALTER TABLE public.radar_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read radar historico"
  ON public.radar_historico FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert radar historico"
  ON public.radar_historico FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_radar_historico_lookup ON public.radar_historico (termo_busca, estado, data_registro);

-- Table: radar_favoritos (saved searches per user)
CREATE TABLE public.radar_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  termo_busca text NOT NULL DEFAULT '',
  tipo_busca text NOT NULL DEFAULT 'codigo_peca',
  label_personalizado text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own radar favorites"
  ON public.radar_favoritos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own radar favorites"
  ON public.radar_favoritos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own radar favorites"
  ON public.radar_favoritos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own radar favorites"
  ON public.radar_favoritos FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
