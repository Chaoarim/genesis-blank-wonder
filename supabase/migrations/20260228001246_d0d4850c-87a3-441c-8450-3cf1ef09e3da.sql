-- Function to decrement inventory when a catalog order is placed
CREATE OR REPLACE FUNCTION public.decrement_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    UPDATE public.inventory_items
    SET qtd_estoque = GREATEST(qtd_estoque - COALESCE((item->>'quantidade')::int, 1), 0),
        updated_at = now()
    WHERE user_id = NEW.seller_id
      AND codigo = item->>'codigo';
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Trigger on catalog_orders insert
CREATE TRIGGER decrement_inventory_on_catalog_order
AFTER INSERT ON public.catalog_orders
FOR EACH ROW
EXECUTE FUNCTION public.decrement_inventory_on_order();