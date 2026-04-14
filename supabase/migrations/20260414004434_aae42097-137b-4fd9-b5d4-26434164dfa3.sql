
CREATE TABLE IF NOT EXISTS public.consultas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  termo_busca text NOT NULL,
  menor_preco numeric NOT NULL DEFAULT 0,
  preco_medio numeric NOT NULL DEFAULT 0,
  total_ofertas integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consultas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON public.consultas_historico FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own search history"
  ON public.consultas_historico FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own search history"
  ON public.consultas_historico FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_consultas_historico_user_termo 
  ON public.consultas_historico (user_id, termo_busca);
