
-- Price history table
CREATE TABLE public.price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  codigo text NOT NULL,
  produto text NOT NULL,
  preco_anterior numeric NOT NULL DEFAULT 0,
  preco_novo numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'custo',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price history"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (user_id = get_admin_user_id());

CREATE POLICY "Users can insert own price history"
  ON public.price_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_admin_user_id());

-- Trigger to auto-log price changes
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.preco IS DISTINCT FROM NEW.preco THEN
    INSERT INTO public.price_history (user_id, inventory_item_id, codigo, produto, preco_anterior, preco_novo, tipo)
    VALUES (NEW.user_id, NEW.id, NEW.codigo, NEW.produto, OLD.preco, NEW.preco, 'custo');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_price_change
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_price_change();
