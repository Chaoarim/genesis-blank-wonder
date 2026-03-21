
-- Table to store price list items uploaded by user
CREATE TABLE public.price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  codigo text NOT NULL,
  descricao text NOT NULL,
  fornecedor text,
  preco_custo numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price items" ON public.price_list_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own price items" ON public.price_list_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own price items" ON public.price_list_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own price items" ON public.price_list_items FOR DELETE USING (auth.uid() = user_id);
